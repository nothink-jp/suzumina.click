#!/usr/bin/env node
// scripts/check-ga4-drift.mjs
//
// live GA4 と宣言の drift を検出する（SPR-279 / SPR-285）。check-firestore-index-drift.mjs と同型。
// 宣言の正本は 2 ファイル（どちらも apps/web/src/lib/analytics/ 配下・Admin API の payload と同一形）:
//   ga4-custom-dimensions.json  カスタムディメンション
//   ga4-property-settings.json  プロパティ設定（Googleシグナル / データ保持 / BigQuery リンク）
//
// bigQueryLinks は宣言から `project` を意図的に外している（プロジェクト番号は CI 側で
// secrets.GCP_PROJECT_NUMBER として扱っているため、リポジトリに置かない）。
// エクスポートが有効かどうかは dailyExportEnabled / datasetLocation / exportStreams で判定できる。
//
// 責務の分担:
//   pnpm lint:ga4        コード（gtag へ渡すパラメータ）↔ 宣言。認証不要なので verify に載る
//   pnpm check:ga4-drift 宣言 ↔ live GA4。GA4 認証が要るので verify には載せない（本スクリプト）
//
// 検出する drift:
//   🔴 管理外: live にあり宣言に無い（GA4 管理画面で直接作られた or 宣言からの削除漏れ）
//   🟠 未登録: 宣言にあり live に無い。**カスタムディメンションは遡及適用されない**ため、
//              発見が遅れた期間のデータは永久に集計不能になる（index の apply 漏れより重い）
//   ⚪ description 差: --apply で live へ同期できる（内部向けの説明文）
//   ⚠ displayName / scope 差: 人が判断する（表示名はレポートに出る・scope は変更不可）
//   🟣 プロパティ設定の差: **人が判断する（--apply の対象外）**。理由は下記
//
// 使い方:
//   node scripts/check-ga4-drift.mjs           # 検出のみ（読み取り専用）
//   node scripts/check-ga4-drift.mjs --apply   # 未登録の登録 + description の同期
//   （ローカルは ADC → ga4-reader@ を impersonate。gcloud が PATH に必要。npm 依存なし）
// 終了コード: 0=drift なし / 1=drift あり / 2=実行エラー
//
// 注意:
//   - GA4 のカスタムディメンションは API で削除できずアーカイブのみ。--apply は追加と
//     description 同期だけで、「管理外」の掃除は人が GA4 管理画面で判断する
//     （CLAUDE.md 軸1: 判断をツール任せにしない）
//   - **プロパティ設定は --apply で直さない**（報告のみ）。保持期間の短縮はイベント単位データの
//     削除で不可逆、Googleシグナルの切替はプライバシー方針に関わる（privacy ページに
//     「Googleシグナルは無効に設定しています」と公開記述があり、対で判断すべき）。
//     変更頻度も年数回なので自動修正の利得が小さい（SPR-285）
//   - displayName / scope の差も --apply では直さない（表示名は GA4 レポートに出る・
//     scope は変更不可で作り直しが必要）
//   - **報告は必ず apply 後の live を再取得して行う**。apply 前の集計で報告すると、
//     登録した直後のものを「未登録」と矛盾表示してしまう（drift 検出という名前の約束に反する）
//   - ADC に直接 analytics スコープを付けるのは Google 側にブロックされるため、
//     必ず ga4-reader@ の impersonate 経由でトークンを取る

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ANALYTICS_DIR = join(repoRoot, "apps/web/src/lib/analytics");
const MANIFEST = join(ANALYTICS_DIR, "ga4-custom-dimensions.json");
const SETTINGS_MANIFEST = join(ANALYTICS_DIR, "ga4-property-settings.json");
const PROPERTY = `properties/${process.env.GA4_PROPERTY_ID ?? "496464197"}`;
const TARGET_SA = process.env.GA4_READER_SA ?? "ga4-reader@suzumina-click.iam.gserviceaccount.com";
const READ_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const EDIT_SCOPE = "https://www.googleapis.com/auth/analytics.edit";
const API_BASE = "https://analyticsadmin.googleapis.com";
// プロパティ設定のリソースごとの API バージョン。googleSignalsSettings / bigQueryLinks は v1beta に無い
const SETTINGS_API_VERSION = {
	googleSignalsSettings: "v1alpha",
	dataRetentionSettings: "v1beta",
	bigQueryLinks: "v1alpha",
};
// リスト応答のリソースと、その配列が入るレスポンスキー
// （URL は bigQueryLinks だがレスポンスキーは bigqueryLinks で q の大小が違う）
const SETTINGS_LIST_FIELD = {
	bigQueryLinks: "bigqueryLinks",
};
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
	const res = await fetch(`${API_BASE}/${path}`, {
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
		const page = await callApi(`v1beta/${PROPERTY}/customDimensions?${query}`, token);
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

const declaredByParam = new Map(manifest.map((d) => [d.parameterName, d]));

let settingsManifest;
try {
	settingsManifest = JSON.parse(readFileSync(SETTINGS_MANIFEST, "utf8"));
} catch (e) {
	abort(`プロパティ設定の宣言を読めませんでした（${SETTINGS_MANIFEST}）: ${e.message}`);
}
// 未知のリソース名を黙って読み飛ばすと「宣言したのに検査されていない」状態になるため落とす
for (const resource of Object.keys(settingsManifest)) {
	if (!SETTINGS_API_VERSION[resource]) {
		abort(
			`未知のプロパティ設定 "${resource}"（対応は ${Object.keys(SETTINGS_API_VERSION).join(" / ")}）。SETTINGS_API_VERSION に API バージョンを追加すること`,
		);
	}
}

/**
 * 宣言値と live 値が一致するか。
 * **false の boolean は live のレスポンスから省略される**ため、undefined を false として扱う
 * （素朴に String() 比較すると "false" ≠ "undefined" で誤検知する）。
 */
function valuesEqual(declared, live) {
	if (typeof declared === "boolean") return Boolean(live) === declared;
	if (Array.isArray(declared)) return JSON.stringify(declared) === JSON.stringify(live ?? []);
	return String(declared) === String(live);
}

/** 単一リソース（googleSignalsSettings / dataRetentionSettings）の突合 */
function diffObject(label, declared, live) {
	return Object.keys(declared)
		.filter((f) => !valuesEqual(declared[f], live?.[f]))
		.map((f) => ({
			field: `${label}.${f}`,
			declared: declared[f],
			// boolean は live 側が省略されうる。比較と同じ正規化を表示にも適用する
			// （そのままだと "live=undefined" と出て、undefined=false という比較規則とズレて読める）
			live: typeof declared[f] === "boolean" ? Boolean(live?.[f]) : live?.[f],
		}));
}

/** リストリソース（bigQueryLinks）の突合。「宣言した数だけ、宣言した設定で存在する」を見る */
function diffList(resource, declaredList, liveList) {
	if (declaredList.length !== liveList.length) {
		return [{ field: `${resource}.length`, declared: declaredList.length, live: liveList.length }];
	}
	return declaredList.flatMap((d, i) => diffObject(`${resource}[${i}]`, d, liveList[i]));
}

/**
 * プロパティ設定（Googleシグナル / データ保持 / BigQuery リンク）を宣言と突き合わせる。
 * 宣言に書いたフィールドだけ比較する（live の name / createTime 等は対象外）。--apply では直さない。
 */
async function checkSettings(token) {
	const results = [];
	for (const [resource, declared] of Object.entries(settingsManifest)) {
		const version = SETTINGS_API_VERSION[resource];
		let live;
		try {
			live = await callApi(`${version}/${PROPERTY}/${resource}`, token);
		} catch (e) {
			return abort(`${resource} を取得できませんでした: ${e.message}`);
		}
		const listField = SETTINGS_LIST_FIELD[resource];
		results.push(
			...(listField
				? diffList(resource, declared, live[listField] ?? [])
				: diffObject(resource, declared, live)),
		);
	}
	return results;
}

/** live を取得して宣言と突き合わせる。--apply の後は必ず呼び直して報告に使う */
async function computeDrift(token) {
	let live;
	try {
		live = await fetchLive(token);
	} catch (e) {
		return abort(`live のカスタムディメンションを取得できませんでした: ${e.message}`);
	}
	const liveByParam = new Map(live.map((d) => [d.parameterName, d]));
	const changed = manifest
		.filter((d) => liveByParam.has(d.parameterName))
		.map((d) => ({
			declared: d,
			live: liveByParam.get(d.parameterName),
			diffs: fieldDiffs(d, liveByParam.get(d.parameterName)),
		}))
		.filter((x) => x.diffs.length > 0);
	return {
		live,
		unmanaged: live.filter((d) => !declaredByParam.has(d.parameterName)),
		missing: manifest.filter((d) => !liveByParam.has(d.parameterName)),
		// description だけの差は --apply で live へ同期する（内部向けの説明文＝レポートの見え方に影響しない）。
		// displayName / scope はレポートの表示や再作成に関わるので人が判断する（軸1: ツール任せにしない）
		syncable: changed.filter((x) => x.diffs.every((d) => d.field === "description")),
		needsHuman: changed.filter((x) => x.diffs.some((d) => d.field !== "description")),
	};
}

/** 未登録の登録と description の同期。失敗しても中断せず、結果は呼び出し側の再取得で確認する */
async function applyDrift({ missing, syncable }) {
	const editToken = accessToken(EDIT_SCOPE);

	if (missing.length) {
		console.log(`⚙ --apply: 未登録 ${missing.length} 件を登録`);
		for (const d of missing) {
			try {
				await callApi(`v1beta/${PROPERTY}/customDimensions`, editToken, {
					method: "POST",
					body: JSON.stringify(d),
				});
				console.log(`   ✅ ${d.parameterName}`);
			} catch (e) {
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
				await callApi(`v1beta/${PROPERTY}/${resource}?updateMask=description`, editToken, {
					method: "PATCH",
					body: JSON.stringify({ description: declared.description ?? "" }),
				});
				console.log(`   ✅ ${declared.parameterName}`);
			} catch (e) {
				console.log(`   ✗ ${declared.parameterName}: ${e.message}`);
			}
		}
		console.log("");
	}
}

const apply = process.argv.includes("--apply");
const readToken = accessToken(READ_SCOPE);
let drift = await computeDrift(readToken);

const settingDiffs = await checkSettings(readToken);

console.log(`GA4 drift check (${PROPERTY})`);
console.log(`  カスタムディメンション: live ${drift.live.length} / 宣言 ${manifest.length}`);
// リスト（bigQueryLinks）は要素内のフィールドまで数える。配列を1件と数えると実数とズレる
const declaredFieldCount = Object.values(settingsManifest).reduce(
	(n, v) =>
		n +
		(Array.isArray(v) ? v.reduce((m, o) => m + Object.keys(o).length, 0) : Object.keys(v).length),
	0,
);
console.log(
	`  プロパティ設定: ${Object.keys(settingsManifest).join(" / ")}（宣言フィールド ${declaredFieldCount} 件）\n`,
);

if (apply && (drift.missing.length || drift.syncable.length)) {
	await applyDrift(drift);
	// apply 前の集計で報告すると、登録した直後のものを「未登録」と矛盾表示するため必ず再取得する。
	// 失敗した分は再取得後も drift として残るので、終了コードもここから導かれる
	drift = await computeDrift(readToken);
	console.log(`⚙ apply 後に再取得: live ${drift.live.length} 件\n`);
}

const { unmanaged, missing, syncable, needsHuman } = drift;

if (
	!unmanaged.length &&
	!missing.length &&
	!syncable.length &&
	!needsHuman.length &&
	!settingDiffs.length
) {
	console.log("✅ drift なし（live と宣言が一致）");
	process.exit(0);
}

if (settingDiffs.length) {
	console.log(`🟣 プロパティ設定の差（人が判断・--apply の対象外）: ${settingDiffs.length}`);
	for (const d of settingDiffs) console.log(`   - ${formatDiff(d)}`);
	console.log(
		"   → 意図した変更なら宣言（ga4-property-settings.json）を更新。意図しない変更なら GA4 管理画面で戻す。",
	);
	console.log(
		"     Googleシグナルは privacy ページの公開記述と対で判断する。保持期間の短縮はイベント単位データの削除で不可逆\n",
	);
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
