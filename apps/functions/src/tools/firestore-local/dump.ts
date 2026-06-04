/**
 * 本番 Firestore（ADC 接続）から公開系コレクションを一定件数だけ取得し、
 * リポジトリにコミットするフィクスチャ JSON へ書き出す。
 *
 *   pnpm --filter @suzumina.click/functions seed:dump            # 既定: 各 100 件
 *   LIMIT=30 pnpm --filter @suzumina.click/functions seed:dump   # 件数指定
 *
 * 機微なユーザー系（users / favorites / likes / dislikes / contacts / history /
 * evaluations）は対象に含めない。これらは Discord ID に紐づくため、フィクスチャに残さない。
 * 公開系でも Discord ID 等を持つフィールドは REDACT で伏せる（例: audioButtons.creatorId）。
 * 安全のため FIRESTORE_EMULATOR_HOST が設定されていたら実行を拒否する。
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Firestore } from "@google-cloud/firestore";
import { type CollectionFixture, encodeValue } from "./serialize";

// 公開（サイト上で既に閲覧可能）なカタログ系のみ。ユーザー紐付けコレクションは除外。
const PUBLIC_COLLECTIONS = ["works", "circles", "videos", "audioButtons", "creators", "top10"];

// 公開コレクション内でも伏せるフィールド（Discord ID 等の生の識別子）。
const REDACT: Record<string, string[]> = {
	audioButtons: ["creatorId"],
};

const REDACTED = "REDACTED";
const FIXTURES_DIR = join(__dirname, "fixtures");

function sanitize(name: string, data: Record<string, unknown>): Record<string, unknown> {
	const fields = REDACT[name];
	if (!fields) {
		return data;
	}
	const out = { ...data };
	for (const field of fields) {
		if (field in out) {
			out[field] = REDACTED;
		}
	}
	return out;
}

async function dumpCollection(
	firestore: Firestore,
	name: string,
	limit: number,
): Promise<CollectionFixture> {
	const snapshot = await firestore.collection(name).limit(limit).get();
	const docs = snapshot.docs.map((doc) => ({
		id: doc.id,
		data: encodeValue(sanitize(name, doc.data())) as Record<string, unknown>,
	}));
	return { collection: name, docs };
}

async function main(): Promise<void> {
	if (process.env.FIRESTORE_EMULATOR_HOST) {
		throw new Error(
			"FIRESTORE_EMULATOR_HOST が設定されています。dump は本番 Firestore を対象にするため、解除して再実行してください。",
		);
	}

	const projectId = process.env.GOOGLE_CLOUD_PROJECT || "suzumina-click";
	// LIMIT が空文字や不正値（Number("")===0, NaN）でも既定 100 に落ちるようにする
	const limit = Number(process.env.LIMIT) || 100;
	const firestore = new Firestore({ projectId });

	await mkdir(FIXTURES_DIR, { recursive: true });

	for (const name of PUBLIC_COLLECTIONS) {
		const fixture = await dumpCollection(firestore, name, limit);
		const file = join(FIXTURES_DIR, `${name}.json`);
		await writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`, "utf-8");
		// biome-ignore lint/suspicious/noConsole: 開発ツールの進捗表示
		console.log(`[dump] ${name}: ${fixture.docs.length} 件 -> ${file}`);
	}

	// biome-ignore lint/suspicious/noConsole: 開発ツールの進捗表示
	console.log(
		"[dump] 完了。サブコレクション(priceHistory 等)とユーザー系は対象外です。フィクスチャをコミットしてください。",
	);
}

main().catch((err) => {
	// biome-ignore lint/suspicious/noConsole: 開発ツールのエラー表示
	console.error("[dump] 失敗:", err);
	process.exit(1);
});
