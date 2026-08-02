#!/usr/bin/env node
// scripts/report-ga4.mjs
//
// GA4 に入れた計器を1回の実行でまとめて読む（SPR-306）。
// check-ga4-drift.mjs / search-console-report.mjs と同じ認証方式
// （ADC → SA を impersonate・npm 依存なし）。
//
// 何のためにあるか:
//   計器を足すたびに「数日後に読む」チケットを立てると、同じ認証と同じクエリ骨格を
//   毎回書き直すことになる。読むこと自体はチケットにせず、判断だけをチケットに残す。
//   drift 検出（宣言と live が一致しているか）とは別物で、こちらは**値そのもの**を見る。
//
// 使い方:
//   node scripts/report-ga4.mjs              # 直近28日
//   node scripts/report-ga4.mjs 28           # 直近28日
//   node scripts/report-ga4.mjs 2026-08-01 2026-08-31
//
// 読むときの前提:
//   **母数を最初に出す**。suzumina.click は 2026-08 時点で 1日あたり数セッションしかなく、
//   ゼロは「そういう結果」ではなく「まだ判断できない」を意味することが多い（SPR-137）。
//   件数だけ見て導線の優劣を結論しないための並べ順にしてある。
//
// 前提（どれか欠けると止まる）:
//   1. ADC が有効で、ga4-reader@（CI では ga4-ci-reader@）を impersonate できる
//   2. 対象 SA が GA4 プロパティのアクセス権を持つ（**GA4 管理画面で手動付与**・terraform 不可）
// 終了コード: 0=成功 / 2=実行エラー

import { execFileSync } from "node:child_process";

const PROPERTY = `properties/${process.env.GA4_PROPERTY_ID ?? "496464197"}`;
const TARGET_SA = process.env.GA4_READER_SA ?? "ga4-reader@suzumina-click.iam.gserviceaccount.com";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const API_BASE = "https://analyticsdata.googleapis.com/v1beta";

/** 母数がこれ未満の期間は、内訳の比較に意味が無いと明示する */
const MIN_SESSIONS_FOR_COMPARISON = 100;

/**
 * GA4 が自動収集するイベント（拡張計測を含む）。自作イベントの一覧はこれの補集合として出す。
 *
 * 自作イベント側を列挙しない理由: events.ts に新しいイベントを足したときに
 * このリストの更新を忘れると、**操作は起きているのにレポートからも signal からも消える**。
 * 「読むものが無い」と「読むべきものを落とした」が見分けられなくなり、
 * 月次通知が沈黙したまま実測を取り逃す＝このスクリプトが防ごうとしている失敗そのものになる。
 * 除外側だけを持てば、未知のイベントは**出る方向**に倒れる（#910 のレビュー所見）。
 */
const AUTO_EVENTS = new Set([
	"session_start",
	"first_visit",
	"first_open",
	"page_view",
	"user_engagement",
	"scroll",
	"click",
	"file_download",
	"form_start",
	"form_submit",
	"view_search_results",
	"video_start",
	"video_progress",
	"video_complete",
]);

/**
 * 自作イベントのうち「操作ではない」もの。signal（読む価値の判定）から除く。
 * ここも除外側で持つ＝新しい操作イベントは既定で signal に入り、通知が出る方向に倒れる
 */
const PASSIVE_EVENTS = new Set(["web_vitals", "consent_update"]);

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
			`アクセストークンを取得できませんでした（ADC 未設定 or ${TARGET_SA} の impersonate 権限なし）: ${detail}`,
		);
	}
}

async function runReport(token, path, body) {
	const res = await fetch(`${API_BASE}/${PROPERTY}:${path}`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const json = await res.json().catch(() => ({}));
	if (!res.ok) {
		const reason = json?.error?.message ?? `HTTP ${res.status}`;
		return abort(`${path} が失敗しました: ${reason}`);
	}
	return json;
}

/** 行を [次元値..., 指標値...] の素の配列にする */
function rows(report) {
	return (report.rows ?? []).map((row) => [
		...(row.dimensionValues ?? []).map((d) => d.value),
		...(row.metricValues ?? []).map((m) => Number(m.value)),
	]);
}

function daysAgo(n) {
	const d = new Date();
	d.setUTCDate(d.getUTCDate() - n);
	return d.toISOString().slice(0, 10);
}

function section(title) {
	console.log(`\n── ${title} ${"─".repeat(Math.max(0, 56 - title.length))}`);
}

/** 件数の内訳。母数が薄いときは比較するなと明示する */
function printBreakdown(pairs, { empty = "（0件）", note } = {}) {
	if (pairs.length === 0) {
		console.log(`  ${empty}`);
		return;
	}
	const width = Math.max(...pairs.map(([label]) => label.length));
	const total = pairs.reduce((sum, [, count]) => sum + count, 0);
	for (const [label, count] of [...pairs].sort((a, b) => b[1] - a[1])) {
		const share = total > 0 ? ` (${Math.round((count / total) * 100)}%)` : "";
		console.log(`  ${label.padEnd(width)}  ${String(count).padStart(6)}${share}`);
	}
	console.log(`  ${"計".padEnd(width)}  ${String(total).padStart(6)}`);
	if (note) console.log(`  → ${note}`);
}

async function main() {
	const [a, b] = process.argv.slice(2);
	const startDate = a && a.includes("-") ? a : daysAgo(Number.parseInt(a ?? "28", 10) || 28);
	const endDate = b && b.includes("-") ? b : "today";

	const token = accessToken();
	console.log(`GA4 report (${PROPERTY})  ${startDate} 〜 ${endDate}`);
	const dateRanges = [{ startDate, endDate }];

	// 1) 母数。ここが薄いと以降の内訳は全て「まだ判断できない」になる
	section("母数");
	const totals = await runReport(token, "runReport", {
		dateRanges,
		metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "eventCount" }],
	});
	const [sessions = 0, users = 0, events = 0] = rows(totals)[0] ?? [];
	console.log(`  セッション ${sessions} / アクティブユーザー ${users} / 総イベント ${events}`);
	const thin = sessions < MIN_SESSIONS_FOR_COMPARISON;
	if (thin) {
		console.log(
			`  ⚠ セッションが ${MIN_SESSIONS_FOR_COMPARISON} 未満。以降の内訳は傾向であって結論ではない`,
		);
	}

	// 2) 計器の生存。0件が「起きていない」なのか「送れていない」なのかの一次切り分け
	section("計器の生存（カスタムイベント件数）");
	const byEvent = await runReport(token, "runReport", {
		dateRanges,
		dimensions: [{ name: "eventName" }],
		metrics: [{ name: "eventCount" }],
		limit: 200,
	});
	const eventCounts = new Map(rows(byEvent).map(([name, count]) => [name, count]));
	const customEvents = [...eventCounts.keys()].filter((name) => !AUTO_EVENTS.has(name));
	printBreakdown(
		customEvents.map((name) => [name, eventCounts.get(name)]),
		{
			empty: "（カスタムイベント 0件。送信経路の故障か、単に操作が起きていないかを切り分けること）",
			note: "web_vitals / consent_update しか無い＝送信経路は生きているが操作が起きていない",
		},
	);

	// 3) 作成の入口（SPR-296 / SPR-297）。導線転換の賭けが当たったかの本体
	section("作成の入口 create_entry（SPR-296 / SPR-297）");
	for (const eventName of ["create_start", "create_success"]) {
		const report = await runReport(token, "runReport", {
			dateRanges,
			dimensions: [{ name: "customEvent:create_entry" }],
			metrics: [{ name: "eventCount" }],
			dimensionFilter: {
				filter: { fieldName: "eventName", stringFilter: { value: eventName } },
			},
			limit: 50,
		});
		console.log(`  [${eventName}]`);
		printBreakdown(rows(report).map(([entry, count]) => [`  ${entry}`, count]));
	}
	console.log("  → 仮説: S1/S2（視聴起点）が主なら queue_continue と watch_*/drafts_* が厚い");
	console.log("  → 反証: detail_clip ばかりなら、S3 を +1 クリック重くしただけの改悪");

	// 4) S4 の入口（SPR-305）
	section("動画一覧のビュー選択 video_tab（SPR-305）");
	const tabs = await runReport(token, "runReport", {
		dateRanges,
		dimensions: [{ name: "customEvent:video_tab" }],
		metrics: [{ name: "eventCount" }],
		dimensionFilter: {
			filter: { fieldName: "eventName", stringFilter: { value: "video_tab_select" } },
		},
		limit: 50,
	});
	printBreakdown(
		rows(tabs).map(([tab, count]) => [tab, count]),
		{
			empty: "（0件。タブが見つかっていないか、そもそも /videos に人が来ていない）",
		},
	);

	// 5) ログインファネル（SPR-267 → SPR-108 の着手要否）
	section("ログインファネル（SPR-108 の判断材料）");
	printBreakdown(
		["login_start", "login_success", "login_error"]
			.filter((name) => eventCounts.has(name))
			.map((name) => [name, eventCounts.get(name)]),
		{ empty: "（0件。Discord ログイン自体が試されていない）" },
	);

	// 6) landingPage の (not set) 率（SPR-299 → SPR-284 のブロック解除判断）
	section("landingPage の (not set) 率（SPR-284 のブロック解除判断）");
	const landing = await runReport(token, "runReport", {
		dateRanges,
		dimensions: [{ name: "landingPage" }],
		metrics: [{ name: "sessions" }],
		limit: 500,
	});
	const landingRows = rows(landing);
	const landingTotal = landingRows.reduce((sum, [, count]) => sum + count, 0);
	const notSet = landingRows.find(([page]) => page === "(not set)")?.[1] ?? 0;
	if (landingTotal === 0) {
		console.log("  （セッション 0件）");
	} else {
		const rate = Math.round((notSet / landingTotal) * 100);
		console.log(`  (not set) ${notSet}/${landingTotal} = ${rate}%`);
		console.log(
			rate > 50
				? "  → 着地ページが特定できない。SPR-284 は引き続きブロック"
				: "  → 着地ページが取れている。SPR-284 のブロック解除を検討できる",
		);
	}

	// 定期実行から「読む価値が出た」を検出するための機械可読行。
	// Summary を grep させると表示を変えるたびに壊れるので、ここを契約にする（英語キー固定）。
	// 母数ではなく**操作**の件数で判定する: 人が来ただけでは読む必要がない
	section("signal");
	const actionCount = customEvents
		.filter((name) => !PASSIVE_EVENTS.has(name))
		.reduce((sum, name) => sum + (eventCounts.get(name) ?? 0), 0);
	console.log(`[signal] action_events=${actionCount} sessions=${sessions}`);
	console.log(
		actionCount > 0
			? "  → 操作が記録されている。読んで判断する価値がある"
			: "  → 操作は0件。まだ読むものが無い（計器ではなく母数の問題）",
	);

	console.log("");
}

await main();
