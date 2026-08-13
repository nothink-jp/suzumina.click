#!/usr/bin/env node
// scripts/search-console-inspect.mjs
//
// URL Inspection API で「Google がこの URL を認識しているか / いつクロールしたか」を実測する
// （SPR-308 / SPR-310 の効果測定）。認証は search-console-report.mjs と同じ方式。
//
// 何のためにあるか:
//   検索パフォーマンス（search-console-report.mjs）は「表示された URL」しか見せない。
//   **表示されていない URL が、未発見なのか・発見済みで順位が低いだけなのか**は
//   この API でしか区別できない。SPR-308 の「works の大半が Google に認識されていない」は
//   これで測った事実で、施策後に**同じ母集団**で測り直すために切り出してある。
//   前後比較の基準値は SPR-310 に記録する（このスクリプトが出す値を正本にすること。
//   抽出方法が違うと母集団が変わり、前後比較が成立しない）。
//
// 使い方:
//   node scripts/search-console-inspect.mjs --sample 21          # sitemap の works を等間隔で 21 件
//   node scripts/search-console-inspect.mjs --sample 21 --path /videos/
//   node scripts/search-console-inspect.mjs https://suzumina.click/works/RJ01616204 ...
//
// **サンプルは決定論的**（等間隔抽出）なので、同じ --sample 値なら前回と同じ URL 群になり
// 施策前後で比較できる。ランダム抽出にしないこと。
//
// 前提（search-console-report.mjs と同じ。どれか欠けると止まる）:
//   1. searchconsole.googleapis.com が有効（terraform: api_services.tf）
//   2. search-console-reader@ が Search Console のプロパティに追加済み（**管理画面で手動**）
//   3. 実行者に roles/iam.serviceAccountTokenCreator（同 SA 宛）が付与済み（手動）
// 終了コード: 0=成功 / 2=実行エラー

import { execFileSync } from "node:child_process";

const SITE_URL = process.env.SEARCH_CONSOLE_SITE_URL ?? "sc-domain:suzumina.click";
const TARGET_SA =
	process.env.SEARCH_CONSOLE_SA ?? "search-console-reader@suzumina-click.iam.gserviceaccount.com";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const SITEMAP_URL = process.env.SEARCH_CONSOLE_SITEMAP_URL ?? "https://suzumina.click/sitemap.xml";
const INSPECT_ENDPOINT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";

/** URL Inspection API は 1 日 2,000 件・1 分 600 件。事故防止のため 1 回の実行に上限を置く */
const MAX_URLS = 100;

function abort(message) {
	console.error(`✗ ${message}`);
	process.exit(2);
}

/** ADC から SA を impersonate してトークンを取る（トークンは一切出力しない） */
function accessToken() {
	try {
		return execFileSync(
			"gcloud",
			[
				"auth",
				"print-access-token",
				`--impersonate-service-account=${TARGET_SA}`,
				`--scopes=${SCOPE}`,
			],
			{ encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
		).trim();
	} catch (e) {
		const detail = String(e.stderr || e.message)
			.trim()
			.split("\n")
			.at(-1);
		return abort(
			`アクセストークンを取得できませんでした（ADC 未設定 / SA 未作成 / impersonate 権限なし）: ${detail}`,
		);
	}
}

function parseArgs(argv) {
	const urls = [];
	let sample = 0;
	let pathPrefix = "/works/";

	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--sample") sample = Number.parseInt(argv[++i], 10);
		else if (argv[i] === "--path") pathPrefix = argv[++i];
		else urls.push(argv[i]);
	}
	return { urls, sample, pathPrefix };
}

/** sitemap から対象パスの URL を等間隔で抜く（同じ引数なら同じ集合になる） */
async function sampleFromSitemap(count, pathPrefix) {
	const res = await fetch(SITEMAP_URL);
	if (!res.ok) abort(`sitemap を取得できませんでした: HTTP ${res.status} ${SITEMAP_URL}`);

	const xml = await res.text();
	const all = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
		.map((m) => m[1])
		.filter((url) => new URL(url).pathname.startsWith(pathPrefix));

	if (all.length === 0) abort(`sitemap に ${pathPrefix} の URL がありません`);
	if (count >= all.length) return all;

	const step = Math.floor(all.length / count);
	return Array.from({ length: count }, (_, i) => all[i * step]);
}

async function inspect(inspectionUrl, token) {
	const res = await fetch(INSPECT_ENDPOINT, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
		body: JSON.stringify({ inspectionUrl, siteUrl: SITE_URL, languageCode: "ja" }),
	});
	const json = await res.json().catch(() => ({}));

	if (!res.ok) {
		const message = json.error?.message ?? "(詳細不明)";
		if (res.status === 403) {
			abort(
				`アクセスを拒否されました。${TARGET_SA} を Search Console 管理画面でプロパティのユーザーに追加してください（API では付与できません）\n  ${message}`,
			);
		}
		if (res.status === 429) {
			abort(`レート上限に達しました（1日2,000件 / 1分600件）: ${message}`);
		}
		abort(`HTTP ${res.status}: ${message}`);
	}
	return json.inspectionResult?.indexStatusResult ?? {};
}

const { urls: argUrls, sample, pathPrefix } = parseArgs(process.argv.slice(2));
const targets = sample > 0 ? await sampleFromSitemap(sample, pathPrefix) : argUrls;

if (targets.length === 0) {
	abort("URL を指定するか --sample <件数> を渡してください");
}
if (targets.length > MAX_URLS) {
	abort(`一度に検査できるのは ${MAX_URLS} 件までです（指定: ${targets.length} 件）`);
}

const token = accessToken();

console.log("# URL Inspection レポート");
console.log(`プロパティ: ${SITE_URL} ／ 対象: ${targets.length} 件`);
if (sample > 0) console.log(`抽出: sitemap の ${pathPrefix} から等間隔（決定論的）`);

let unknown = 0;
const crawlTimes = [];

console.log("\n### 個別");
for (const url of targets) {
	const result = await inspect(url, token);
	const path = new URL(url).pathname;
	const crawled = result.lastCrawlTime ?? "(未クロール)";
	if (result.lastCrawlTime) crawlTimes.push(result.lastCrawlTime);
	// coverageState は「URL が Google に認識されていません」等の日本語文言が返る
	if (!result.lastCrawlTime) unknown++;

	console.log(
		`  ${path.padEnd(28)} ${String(result.verdict ?? "-").padEnd(6)} ${crawled.padEnd(22)} ${result.coverageState ?? "-"}`,
	);
}

const known = targets.length - unknown;
const rate = ((unknown / targets.length) * 100).toFixed(1);

console.log("\n### 集計");
console.log(`  未認識（未クロール）: ${unknown} / ${targets.length} 件（${rate}%）`);
console.log(`  認識済み: ${known} 件`);
if (crawlTimes.length > 0) {
	crawlTimes.sort();
	console.log(`  最終クロール: 最古 ${crawlTimes[0]} / 最新 ${crawlTimes.at(-1)}`);
}
