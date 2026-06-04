/**
 * データ整合性チェックのインテグレーションテスト（Firestore Emulator 実機）
 *
 * 既知の壊れデータを Emulator に注入 → runIntegrityCheck を実行 →
 * 「検出件数・修正件数」と「修復後の Firestore 実体」を assert する。
 * モックでは検証できない実際の集計ロジックの正しさを確認するのが目的（SPR-138）。
 *
 * 実行（専用ポートで Emulator を起動して回す）:
 *   pnpm test:integration            （リポジトリルート）
 *
 * 安全装置:
 *   - RUN_INTEGRATION_TESTS と FIRESTORE_EMULATOR_HOST の両方が無いと describe ごとスキップ。
 *     → 通常の `pnpm test` / CI（Emulator 無し）では実行されない。
 *   - 各テスト前に Emulator のデータを全消去するため、dev:local(8080) とは別ポートを使うこと。
 *   - NODE_ENV=test でも Emulator に接続できるよう ALLOW_TEST_FIRESTORE を有効化する。
 */

import type { Firestore } from "@google-cloud/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { runIntegrityCheck as RunIntegrityCheck } from "../data-integrity-check";

const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST;
const RUN = Boolean(process.env.RUN_INTEGRATION_TESTS) && Boolean(EMULATOR_HOST);
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || "suzumina-click";

let getFirestore: () => Firestore;
let resetFirestoreInstance: () => void;
let runIntegrityCheck: typeof RunIntegrityCheck;

// 変更前の env を退避し、afterAll で復元する（プロセスグローバルの汚染防止）
let prevAllowTestFirestore: string | undefined;
let prevProjectId: string | undefined;

function restoreEnv(key: string, value: string | undefined): void {
	if (value === undefined) {
		delete process.env[key];
	} else {
		process.env[key] = value;
	}
}

/** Emulator の全ドキュメントを消去する（REST 管理エンドポイント） */
async function clearEmulator(): Promise<void> {
	const url = `http://${EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
	const res = await fetch(url, { method: "DELETE" });
	if (!res.ok) {
		throw new Error(`Emulator のデータ消去に失敗: ${res.status} ${await res.text()}`);
	}
}

describe.skipIf(!RUN)("checkDataIntegrity (integration / Firestore Emulator)", () => {
	beforeAll(async () => {
		// 本番接続ブロック（NODE_ENV=test）を回避し Emulator へ向ける
		prevAllowTestFirestore = process.env.ALLOW_TEST_FIRESTORE;
		prevProjectId = process.env.GOOGLE_CLOUD_PROJECT;
		process.env.ALLOW_TEST_FIRESTORE = "true";
		process.env.GOOGLE_CLOUD_PROJECT = PROJECT_ID;

		const firestoreModule = await import("../../infrastructure/database/firestore");
		getFirestore = firestoreModule.getFirestore;
		resetFirestoreInstance = firestoreModule.resetFirestoreInstance;
		({ runIntegrityCheck } = await import("../data-integrity-check"));
	});

	beforeEach(async () => {
		await clearEmulator();
		resetFirestoreInstance();
	});

	afterAll(async () => {
		await clearEmulator();
		// env を元に戻し、他テストの本番接続ブロックを緩めたままにしない
		restoreEnv("ALLOW_TEST_FIRESTORE", prevAllowTestFirestore);
		restoreEnv("GOOGLE_CLOUD_PROJECT", prevProjectId);
	});

	it("Circle workIds の重複と存在しない作品IDを除去する", async () => {
		const db = getFirestore();
		await db.collection("works").doc("RJ001").set({ title: "w1", circleId: "RG001" });
		await db.collection("works").doc("RJ002").set({ title: "w2", circleId: "RG001" });
		// 重複(RJ001) + 存在しない作品(RJ999)
		await db
			.collection("circles")
			.doc("RG001")
			.set({
				workIds: ["RJ001", "RJ001", "RJ002", "RJ999"],
			});

		const result = await runIntegrityCheck();

		expect(result.checks.circleWorkCounts.checked).toBe(1);
		expect(result.checks.circleWorkCounts.fixed).toBeGreaterThan(0);

		const circle = await db.collection("circles").doc("RG001").get();
		expect((circle.data()?.workIds as string[]).sort()).toEqual(["RJ001", "RJ002"]);
	});

	it("孤立した Creator マッピングと空 Creator を削除する", async () => {
		const db = getFirestore();
		await db.collection("works").doc("RJ001").set({ title: "w1", circleId: "RG001" });

		// CR1: 有効(RJ001) + 孤立(RJ999)
		await db.collection("creators").doc("CR1").set({ name: "c1" });
		await db
			.collection("creators")
			.doc("CR1")
			.collection("works")
			.doc("RJ001")
			.set({ workId: "RJ001" });
		await db
			.collection("creators")
			.doc("CR1")
			.collection("works")
			.doc("RJ999")
			.set({ workId: "RJ999" });
		// CR2: 孤立のみ → Creator ごと削除
		await db.collection("creators").doc("CR2").set({ name: "c2" });
		await db
			.collection("creators")
			.doc("CR2")
			.collection("works")
			.doc("RJ888")
			.set({ workId: "RJ888" });

		const result = await runIntegrityCheck();

		expect(result.checks.orphanedCreators.found).toBeGreaterThanOrEqual(2);

		// 孤立マッピングは消え、有効マッピングは残る
		expect(
			(await db.collection("creators").doc("CR1").collection("works").doc("RJ999").get()).exists,
		).toBe(false);
		expect(
			(await db.collection("creators").doc("CR1").collection("works").doc("RJ001").get()).exists,
		).toBe(true);
		// 全孤立の Creator ドキュメントは削除される
		expect((await db.collection("creators").doc("CR2").get()).exists).toBe(false);
	});

	it("Work-Circle 相互参照のずれ（circle.workIds に未登録）を補う", async () => {
		const db = getFirestore();
		await db.collection("circles").doc("RG001").set({ workIds: [] });
		await db.collection("works").doc("RJ001").set({ title: "w1", circleId: "RG001" });

		const result = await runIntegrityCheck();

		expect(result.checks.workCircleConsistency.fixed).toBeGreaterThanOrEqual(1);
		const circle = await db.collection("circles").doc("RG001").get();
		expect(circle.data()?.workIds as string[]).toContain("RJ001");
	});

	it("作品の creators から失われた Creator-Work マッピングを復元する", async () => {
		const db = getFirestore();
		await db
			.collection("circles")
			.doc("RG001")
			.set({ workIds: ["RJ001"] });
		await db
			.collection("works")
			.doc("RJ001")
			.set({
				title: "w1",
				circleId: "RG001",
				circle: "サークル名",
				creators: { voice_by: [{ id: "CR1", name: "声優1" }] },
			});

		const result = await runIntegrityCheck();

		expect(result.checks.creatorWorkRestore?.restored).toBeGreaterThanOrEqual(1);
		expect(result.checks.creatorWorkRestore?.creatorsCreated).toBeGreaterThanOrEqual(1);

		expect((await db.collection("creators").doc("CR1").get()).exists).toBe(true);
		expect(
			(await db.collection("creators").doc("CR1").collection("works").doc("RJ001").get()).exists,
		).toBe(true);
	});

	it("dry-run では不整合を検出するが Firestore を変更しない", async () => {
		const db = getFirestore();
		await db.collection("works").doc("RJ001").set({ title: "w1", circleId: "RG001" });
		await db
			.collection("circles")
			.doc("RG001")
			.set({ workIds: ["RJ001", "RJ001"] }); // 重複

		const result = await runIntegrityCheck({ dryRun: true });

		// 要修正としてカウントはされる
		expect(result.dryRun).toBe(true);
		expect(result.checks.circleWorkCounts.fixed).toBeGreaterThan(0);

		// 実体は変更されていない（重複が残っている）
		const circle = await db.collection("circles").doc("RG001").get();
		expect(circle.data()?.workIds as string[]).toEqual(["RJ001", "RJ001"]);

		// 結果ドキュメントも書かれていない
		expect((await db.collection("dlsiteMetadata").doc("dataIntegrityCheck").get()).exists).toBe(
			false,
		);
	});
});
