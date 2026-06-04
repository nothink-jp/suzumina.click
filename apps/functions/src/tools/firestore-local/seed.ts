/**
 * フィクスチャ JSON を Firestore Emulator へ投入する。
 *
 *   pnpm --filter @suzumina.click/functions seed:load
 *
 * 接続先は必ず Emulator。安全のため FIRESTORE_EMULATOR_HOST を強制設定し、
 * 本番 Firestore へ書き込む経路を塞ぐ。
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Firestore } from "@google-cloud/firestore";
import { type CollectionFixture, decodeValue } from "./serialize";

// seed は Emulator 専用。未設定でも既定値で必ず Emulator を向く（本番事故防止）。
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";

const FIXTURES_DIR = join(__dirname, "fixtures");
const BATCH_LIMIT = 400; // Firestore バッチ上限 500 未満に余裕を持たせる

async function loadFixtureFiles(): Promise<CollectionFixture[]> {
	let entries: string[];
	try {
		entries = await readdir(FIXTURES_DIR);
	} catch {
		return [];
	}
	const files = entries.filter((f) => f.endsWith(".json"));
	const fixtures: CollectionFixture[] = [];
	for (const file of files) {
		const raw = await readFile(join(FIXTURES_DIR, file), "utf-8");
		fixtures.push(JSON.parse(raw) as CollectionFixture);
	}
	return fixtures;
}

async function seedCollection(firestore: Firestore, fixture: CollectionFixture): Promise<void> {
	const { collection, docs } = fixture;
	for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
		const batch = firestore.batch();
		for (const doc of docs.slice(i, i + BATCH_LIMIT)) {
			const ref = firestore.collection(collection).doc(doc.id);
			batch.set(ref, decodeValue(doc.data, firestore) as Record<string, unknown>);
		}
		await batch.commit();
	}
}

async function main(): Promise<void> {
	const projectId = process.env.GOOGLE_CLOUD_PROJECT || "suzumina-click";
	const firestore = new Firestore({ projectId, ignoreUndefinedProperties: true });

	const fixtures = await loadFixtureFiles();
	if (fixtures.length === 0) {
		// biome-ignore lint/suspicious/noConsole: 開発ツールの進捗表示
		console.log(
			`[seed] フィクスチャがありません (${FIXTURES_DIR})。seed:dump で本番から取得するか、JSON を追加してください。`,
		);
		return;
	}

	// biome-ignore lint/suspicious/noConsole: 開発ツールの進捗表示
	console.log(`[seed] Emulator ${process.env.FIRESTORE_EMULATOR_HOST} へ投入します`);
	for (const fixture of fixtures) {
		await seedCollection(firestore, fixture);
		// biome-ignore lint/suspicious/noConsole: 開発ツールの進捗表示
		console.log(`[seed] ${fixture.collection}: ${fixture.docs.length} 件`);
	}
	// biome-ignore lint/suspicious/noConsole: 開発ツールの進捗表示
	console.log("[seed] 完了");
}

main().catch((err) => {
	// biome-ignore lint/suspicious/noConsole: 開発ツールのエラー表示
	console.error("[seed] 失敗:", err);
	process.exit(1);
});
