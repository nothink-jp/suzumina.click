/**
 * DLsite work-id の region 等価性チェック（read-only・SPR-232）
 *
 * ローカル(日本)スクレイプ L と 本番 Firestore `works` の doc ID F を突合し、
 * asia-northeast1（本番 region）が日本可視作品を取りこぼしていないかを確認する。
 * - L \ F = 日本可視・本番未保持 ＝ region 制限候補（★主シグナル。0 なら実害なし）
 * - F \ L = 本番保持・今回 scrape 外 ＝ 削除/delist/ページング差
 * asset(`dlsite-work-ids.json`)も参考突合する。書き込みは一切しない。
 *
 * 用途: SPR-232（asset 削除の可否を運用後の複数 run で判断）の反復計測。
 * 実行: pnpm --filter @suzumina.click/functions check:region-equivalence
 *       （ADC 必須＝本番 Firestore 直結。Emulator では F が空になり無意味）
 */

import workIdsAsset from "../../assets/dlsite-work-ids.json";
import firestore from "../../infrastructure/database/firestore";
import { collectAllWorkIds } from "../../services/dlsite/work-id-collector";

function preview(ids: string[], n = 25): string {
	if (ids.length === 0) return "(なし)";
	return ids.slice(0, n).join(", ") + (ids.length > n ? ` …(+${ids.length - n}件)` : "");
}

async function main(): Promise<void> {
	const startedAt = Date.now();

	console.log("▶ [1/2] ローカル(日本)スクレイプ開始 …（requestDelay 由来で数分かかる）");
	const local = await collectAllWorkIds({ maxPages: 100 });
	const L = new Set(local.workIds);
	console.log(
		`  ローカル取得 L=${L.size}件 / DLsite報告総数(totalCount)=${local.totalCount} / pages=${local.totalPages}`,
	);

	console.log("▶ [2/2] 本番 Firestore `works` の doc ID 取得 …");
	const refs = await firestore.collection("works").listDocuments();
	const F = new Set(refs.map((r) => r.id));
	console.log(`  Firestore works F=${F.size}件`);

	const A = new Set(workIdsAsset.workIds);

	const intersection = [...L].filter((id) => F.has(id)).length;
	const LminusF = [...L].filter((id) => !F.has(id)).sort();
	const FminusL = [...F].filter((id) => !L.has(id)).sort();
	const LminusA = [...L].filter((id) => !A.has(id)).sort();
	const AminusL = [...A].filter((id) => !L.has(id)).sort();

	console.log("\n==== SPR-232 region 等価性計測 ====");
	console.log(`L = ローカル日本スクレイプ      : ${L.size}`);
	console.log(`F = 本番 Firestore works        : ${F.size}`);
	console.log(`A = asset(dlsite-work-ids.json) : ${A.size}`);
	console.log(`L ∩ F                           : ${intersection}`);
	console.log("");
	console.log(`★ L \\ F (日本可視・本番未保持=region制限候補): ${LminusF.length}`);
	console.log(`    ${preview(LminusF)}`);
	console.log(`  F \\ L (本番保持・今回scrape外=削除/delist/ページング差): ${FminusL.length}`);
	console.log(`    ${preview(FminusL)}`);
	console.log(`  L \\ A (asset 未収載＝asset が古い側の証拠): ${LminusA.length}`);
	console.log(`    ${preview(LminusA)}`);
	console.log(`  A \\ L (asset 固有＝asset にだけ在る古い ID): ${AminusL.length}`);
	console.log(`    ${preview(AminusL)}`);
	console.log(
		"\n判定の目安: L \\ F = 0 なら「日本から見える作品はすべて本番が保持」＝region 制限の実害なし。",
	);
	console.log(`(elapsed ${((Date.now() - startedAt) / 1000).toFixed(1)}s)`);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error("計測エラー:", error);
		process.exit(1);
	});
