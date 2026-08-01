#!/usr/bin/env node
// scripts/search-console-report.mjs
//
// Search Console の検索流入を実測する（SPR-301 / SPR-137 §6-4 の集客判断）。
// check-ga4-drift.mjs と同じ認証方式（ADC → SA を impersonate・npm 依存なし）。
//
// 何のためにあるか:
//   GA4 は「どのチャネルから来たか」までしか分からず、**どの検索語で・何位で・
//   何回表示されたか**は Search Console にしかない。2026-07 に Organic Search が
//   月9→61 に跳ねた原因が再現可能なレバーなのか偶発なのかは、この差でしか判別できない。
//
// 使い方:
//   node scripts/search-console-report.mjs                      # 直近約1ヶ月
//   node scripts/search-console-report.mjs 2026-07-01 2026-07-31
//
// 前提（どれか欠けると止まる。エラー文に対処法を出す）:
//   1. searchconsole.googleapis.com が有効（terraform: api_services.tf）
//   2. search-console-reader@ が Search Console のプロパティに追加済み（**管理画面で手動**）
//   3. 実行者に roles/iam.serviceAccountTokenCreator（同 SA 宛）が付与済み（手動）
// 終了コード: 0=成功 / 2=実行エラー

import { execFileSync } from "node:child_process";

const SITE_URL = process.env.SEARCH_CONSOLE_SITE_URL ?? "sc-domain:suzumina.click";
const TARGET_SA =
	process.env.SEARCH_CONSOLE_SA ?? "search-console-reader@suzumina-click.iam.gserviceaccount.com";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const API_BASE = "https://searchconsole.googleapis.com/webmasters/v3";

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

async function callApi(path, token, body) {
	const res = await fetch(`${API_BASE}/${path}`, {
		method: body ? "POST" : "GET",
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
		body: body ? JSON.stringify(body) : undefined,
	});
	const json = await res.json().catch(() => ({}));
	if (!res.ok) {
		const message = json.error?.message ?? "(詳細不明)";
		if (res.status === 403 && message.includes("has not been used in project")) {
			abort(
				`Search Console API が未有効です。terraform の google_project_service.searchconsole を apply してください\n  ${message}`,
			);
		}
		if (res.status === 403) {
			abort(
				`アクセスを拒否されました。${TARGET_SA} を Search Console 管理画面でプロパティのユーザーに追加してください（API では付与できません）\n  ${message}`,
			);
		}
		abort(`HTTP ${res.status}: ${message}`);
	}
	return json;
}

function daysAgo(n) {
	const d = new Date();
	d.setUTCDate(d.getUTCDate() - n);
	return d.toISOString().slice(0, 10);
}

async function query(token, { startDate, endDate, dimensions, rowLimit = 25 }) {
	const encoded = encodeURIComponent(SITE_URL);
	const result = await callApi(`sites/${encoded}/searchAnalytics/query`, token, {
		startDate,
		endDate,
		dimensions,
		rowLimit,
	});
	return result.rows ?? [];
}

function printRows(title, dimensionNames, rows) {
	console.log(`\n### ${title}`);
	if (rows.length === 0) {
		console.log("  (0 行)");
		return;
	}
	console.log(`  ${[...dimensionNames, "clicks", "impressions", "ctr", "position"].join(" | ")}`);
	for (const row of rows) {
		console.log(
			`  ${[
				...(row.keys ?? []),
				row.clicks,
				row.impressions,
				`${(row.ctr * 100).toFixed(1)}%`,
				row.position.toFixed(1),
			].join(" | ")}`,
		);
	}
}

async function main() {
	// Search Console のデータは概ね2〜3日遅れる
	const startDate = process.argv[2] ?? daysAgo(33);
	const endDate = process.argv[3] ?? daysAgo(3);
	const token = accessToken();

	const sites = await callApi("sites", token);
	const entry = (sites.siteEntry ?? []).find((s) => s.siteUrl === SITE_URL);
	if (!entry) {
		const available = (sites.siteEntry ?? []).map((s) => s.siteUrl).join(", ") || "(なし)";
		abort(
			`${SITE_URL} にアクセスできません。SEARCH_CONSOLE_SITE_URL で指定し直してください。${TARGET_SA} に見えているプロパティ: ${available}`,
		);
	}

	console.log("# Search Console レポート");
	console.log(
		`プロパティ: ${SITE_URL}（権限: ${entry.permissionLevel}）／ 期間: ${startDate} 〜 ${endDate}`,
	);

	printRows(
		"日別",
		["date"],
		await query(token, { startDate, endDate, dimensions: ["date"], rowLimit: 100 }),
	);
	printRows(
		"検索語 上位25",
		["query"],
		await query(token, { startDate, endDate, dimensions: ["query"] }),
	);
	printRows(
		"ページ 上位25",
		["page"],
		await query(token, { startDate, endDate, dimensions: ["page"] }),
	);
	printRows(
		"デバイス",
		["device"],
		await query(token, { startDate, endDate, dimensions: ["device"] }),
	);
	printRows(
		"国 上位10",
		["country"],
		await query(token, { startDate, endDate, dimensions: ["country"], rowLimit: 10 }),
	);
}

main().catch((e) => abort(String(e?.message ?? e)));
