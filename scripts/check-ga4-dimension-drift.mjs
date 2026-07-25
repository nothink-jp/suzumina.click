#!/usr/bin/env node
// scripts/check-ga4-dimension-drift.mjs
//
// live GA4 のカスタムディメンションと宣言（apps/web/src/lib/analytics/ga4-custom-dimensions.json）の
// drift を検出する（SPR-279）。check-firestore-index-drift.mjs と同型の位置づけ。
//
// 責務の分担:
//   pnpm lint:ga4        コード（gtag へ渡すパラメータ）↔ 宣言。認証不要なので verify に載る
//   pnpm check:ga4-drift 宣言 ↔ live GA4。GA4 認証が要るので verify には載せない（本スクリプト）
//
// 検出する drift:
//   🔴 管理外: live にあり宣言に無い（GA4 管理画面で直接作られた or 宣言からの削除漏れ）
//   🟠 未登録: 宣言にあり live に無い。**カスタムディメンションは遡及適用されない**ため、
//              発見が遅れた期間のデータは永久に集計不能になる（index の apply 漏れより重い）
//   ⚪ 属性差: parameterName は一致するが displayName / scope / description が異なる
//
// 使い方:
//   node scripts/check-ga4-dimension-drift.mjs           # 検出のみ（読み取り専用）
//   node scripts/check-ga4-dimension-drift.mjs --apply   # 未登録分を GA4 に登録（追加のみ）
//   （ローカルは ADC → ga4-reader@ を impersonate。gcloud が PATH に必要。npm 依存なし）
// 終了コード: 0=drift なし / 1=drift あり / 2=実行エラー
//
// 注意:
//   - GA4 のカスタムディメンションは API で削除できずアーカイブのみ。--apply は追加専用で、
//     「管理外」の掃除は人が GA4 管理画面で判断する（CLAUDE.md 軸1: 判断をツール任せにしない）
//   - 属性差も --apply では直さない（scope は変更不可・displayName/description の PATCH は
//     レポート上の表示名が変わるため人が判断すべき）
//   - ADC に直接 analytics スコープを付けるのは Google 側にブロックされるため、
//     必ず ga4-reader@ の impersonate 経由でトークンを取る

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(repoRoot, "apps/web/src/lib/analytics/ga4-custom-dimensions.json");
const PROPERTY = `properties/${process.env.GA4_PROPERTY_ID ?? "496464197"}`;
const TARGET_SA = process.env.GA4_READER_SA ?? "ga4-reader@suzumina-click.iam.gserviceaccount.com";
const READ_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const EDIT_SCOPE = "https://www.googleapis.com/auth/analytics.edit";
const API = "https://analyticsadmin.googleapis.com/v1beta";
// 宣言に書いている項目だけ比較する（live の disallowAdsPersonalization 等は宣言側に無いため対象外）
const COMPARED_FIELDS = ["displayName", "scope", "description"];

function abort(message) {
	console.error(`✗ ${message}`);
	process.exit(2);
}

/** ADC から ga4-reader@ を impersonate してアクセストークンを取る（トークンは一切出力しない） */
function accessToken(scope) {
	try {
		return execFileSync(
			"gcloud",
			[
				"auth",
				"print-access-token",
				`--impersonate-service-account=${TARGET_SA}`,
				`--scopes=${scope}`,
			],
			{ encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
		).trim();
	} catch (e) {
		const detail = String(e.stderr || e.message)
			.trim()
			.split("\n")
			.at(-1);
		return abort(
			`アクセストークンを取得できませんでした（ADC 未設定 or ${TARGET_SA} の impersonate 権限なし）: ${detail}`,
		);
	}
}

async function callApi(path, token, init = {}) {
	const res = await fetch(`${API}/${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			...init.headers,
		},
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(`HTTP ${res.status} ${body.error?.message ?? "(詳細不明)"}`);
	return body;
}

async function fetchLive(token) {
	const all = [];
	let pageToken;
	do {
		const query = new URLSearchParams({ pageSize: "200" });
		if (pageToken) query.set("pageToken", pageToken);
		const page = await callApi(`${PROPERTY}/customDimensions?${query}`, token);
		all.push(...(page.customDimensions ?? []));
		pageToken = page.nextPageToken;
	} while (pageToken);
	return all;
}

/** 宣言と live で比較対象フィールドの差分を返す（差が無ければ空配列） */
function fieldDiffs(declared, live) {
	return COMPARED_FIELDS.filter((f) => (declared[f] ?? "") !== (live[f] ?? "")).map((f) => ({
		field: f,
		declared: declared[f] ?? "",
		live: live[f] ?? "",
	}));
}

function formatDiff(d) {
	return `${d.field}: 宣言"${d.declared}" ≠ live"${d.live}"`;
}

let manifest;
try {
	manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
} catch (e) {
	abort(`宣言ファイルを読めませんでした（${MANIFEST}）: ${e.message}`);
}

const apply = process.argv.includes("--apply");
const readToken = accessToken(READ_SCOPE);

let live;
try {
	live = await fetchLive(readToken);
} catch (e) {
	abort(`live のカスタムディメンションを取得できませんでした: ${e.message}`);
}

const liveByParam = new Map(live.map((d) => [d.parameterName, d]));
const declaredByParam = new Map(manifest.map((d) => [d.parameterName, d]));

const unmanaged = live.filter((d) => !declaredByParam.has(d.parameterName));
const missing = manifest.filter((d) => !liveByParam.has(d.parameterName));
const changed = manifest
	.filter((d) => liveByParam.has(d.parameterName))
	.map((d) => ({
		declared: d,
		live: liveByParam.get(d.parameterName),
		diffs: fieldDiffs(d, liveByParam.get(d.parameterName)),
	}))
	.filter((x) => x.diffs.length > 0);

// description だけの差は --apply で live へ同期する（内部向けの説明文＝レポートの見え方に影響しない）。
// displayName / scope はレポートの表示や再作成に関わるので人が判断する（軸1: ツール任せにしない）
const syncable = changed.filter((x) => x.diffs.every((d) => d.field === "description"));
const needsHuman = changed.filter((x) => x.diffs.some((d) => d.field !== "description"));

console.log(`GA4 custom dimension drift check (${PROPERTY})`);
console.log(`  live: ${live.length} / 宣言(ga4-custom-dimensions.json): ${manifest.length}\n`);

if (apply && (missing.length || syncable.length)) {
	const editToken = accessToken(EDIT_SCOPE);
	let failed = 0;

	if (missing.length) {
		console.log(`⚙ --apply: 未登録 ${missing.length} 件を登録`);
		for (const d of missing) {
			try {
				await callApi(`${PROPERTY}/customDimensions`, editToken, {
					method: "POST",
					body: JSON.stringify(d),
				});
				console.log(`   ✅ ${d.parameterName}`);
			} catch (e) {
				failed++;
				console.log(`   ✗ ${d.parameterName}: ${e.message}`);
			}
		}
		console.log("   → 遡及適用されないため、値が付くのはこれ以降のイベントのみ\n");
	}

	if (syncable.length) {
		console.log(`⚙ --apply: description の差 ${syncable.length} 件を live へ同期`);
		for (const { declared, live: liveDim } of syncable) {
			try {
				// live のリソース名（properties/*/customDimensions/*）に対して description だけ PATCH
				const resource = liveDim.name.replace(/^properties\/[^/]+\//, "");
				await callApi(`${PROPERTY}/${resource}?updateMask=description`, editToken, {
					method: "PATCH",
					body: JSON.stringify({ description: declared.description ?? "" }),
				});
				console.log(`   ✅ ${declared.parameterName}`);
			} catch (e) {
				failed++;
				console.log(`   ✗ ${declared.parameterName}: ${e.message}`);
			}
		}
		console.log("");
	}

	if (failed) {
		console.log(
			`   → ${failed} 件が失敗。編集者権限（${TARGET_SA}）と displayName の制約（コロン不可）を確認\n`,
		);
	}
	if (needsHuman.length === 0 && unmanaged.length === 0) process.exit(failed ? 1 : 0);
}

if (unmanaged.length === 0 && missing.length === 0 && changed.length === 0) {
	console.log("✅ drift なし（live と宣言が一致）");
	process.exit(0);
}

if (unmanaged.length) {
	console.log(`🔴 管理外（live にあり宣言に無い）: ${unmanaged.length}`);
	for (const d of unmanaged) console.log(`   - ${d.parameterName} (${d.displayName} / ${d.scope})`);
	console.log(
		"   → 使うなら ga4-custom-dimensions.json に追加、不要なら GA4 管理画面でアーカイブ（API では削除できない）\n",
	);
}
if (missing.length) {
	console.log(`🟠 未登録（宣言にあり live に無い）: ${missing.length}`);
	for (const d of missing) console.log(`   - ${d.parameterName} (${d.displayName})`);
	console.log(
		"   → `pnpm check:ga4-drift --apply` で登録。遡及適用されないので、放置した期間のデータは永久に集計不能\n",
	);
}
if (syncable.length) {
	console.log(`⚪ description の差（--apply で同期可）: ${syncable.length}`);
	for (const { declared, diffs } of syncable) {
		console.log(`   - ${declared.parameterName}`);
		for (const diff of diffs) console.log(`       ${formatDiff(diff)}`);
	}
	console.log("   → `pnpm check:ga4-drift --apply` で宣言の内容を live へ反映\n");
}
if (needsHuman.length) {
	console.log(`⚠ displayName / scope の差（人が判断）: ${needsHuman.length}`);
	for (const { declared, diffs } of needsHuman) {
		console.log(`   - ${declared.parameterName}`);
		for (const diff of diffs) console.log(`       ${formatDiff(diff)}`);
	}
	console.log(
		"   → displayName は GA4 レポートの表示名なので影響を確認して手で直す。scope は変更不可＝作り直しが必要\n",
	);
}
process.exit(1);
