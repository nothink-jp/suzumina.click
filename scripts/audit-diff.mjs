#!/usr/bin/env node
/**
 * 依存 audit の差分ゲート（SPR-392）。
 *
 * PR のロックファイルと base（main）のロックファイルの `pnpm audit --json` を突き合わせ、
 * **PR が新しく持ち込んだ advisory があるときだけ**非ゼロ終了する。main に元からある advisory は
 * 落とさず、`::warning::` と job summary に一覧を出す（マージを止めずに PR 一覧から見える状態にする）。
 *
 * 全量 audit をゲートにしていた頃は、main に新しい advisory が出ると依存を触る PR がすべて赤くなり、
 * 「A の修正 PR は B で赤・B の修正 PR は A で赤」と脆弱性の修正 PR 同士が互いを塞いだ（#1067 / #1068）。
 * main の既知分の検知は、この警告表示・Dependabot security updates・週次の全量 audit が受け持つ。
 *
 * 比較キーは「GHSA ID + パッケージ名」。同じ GHSA が別パッケージへ広がった場合も新規として落とす。
 * 判定対象は moderate 以上（従来の `--audit-level moderate` と同じ線）。除外は pnpm-workspace.yaml の
 * auditConfig.ignoreGhsas が pnpm 側で効くため、ここでは扱わない。
 * 入力が audit の JSON として読めないとき（registry 障害等）は通さずに落とす（fail-closed）。
 *
 * 使い方: node scripts/audit-diff.mjs <base.json> <head.json>
 */
import { appendFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SEVERITY_RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };
const GATE_SEVERITY = "moderate";

/**
 * `pnpm audit --json` の出力を、ゲート対象（moderate 以上）の advisory 一覧に正規化する。
 * @param {unknown} report
 * @returns {Array<{ key: string, ghsa: string, module: string, severity: string, title: string, url: string, patched: string }>}
 */
export function parseAudit(report) {
	if (typeof report !== "object" || report === null || typeof report.advisories !== "object") {
		throw new Error("pnpm audit の JSON ではありません（advisories がない）");
	}
	return Object.values(report.advisories)
		.filter((a) => (SEVERITY_RANK[a.severity] ?? 0) >= SEVERITY_RANK[GATE_SEVERITY])
		.map((a) => {
			const ghsa = a.github_advisory_id ?? String(a.id);
			return {
				key: `${ghsa}|${a.module_name}`,
				ghsa,
				module: a.module_name,
				severity: a.severity,
				title: a.title,
				url: a.url,
				patched: a.patched_versions,
			};
		});
}

/**
 * base と head の advisory を、新規・既知（両方にある）・解消（base のみ）に分ける。
 * @param {ReturnType<typeof parseAudit>} base
 * @param {ReturnType<typeof parseAudit>} head
 */
export function diffAudit(base, head) {
	const baseKeys = new Set(base.map((a) => a.key));
	const headKeys = new Set(head.map((a) => a.key));
	return {
		introduced: head.filter((a) => !baseKeys.has(a.key)),
		known: head.filter((a) => baseKeys.has(a.key)),
		fixed: base.filter((a) => !headKeys.has(a.key)),
	};
}

/** @param {ReturnType<typeof parseAudit>} list */
function table(list) {
	const rows = list.map(
		(a) =>
			`| ${a.severity} | \`${a.module}\` | [${a.ghsa}](${a.url}) ${a.title} | \`${a.patched}\` |`,
	);
	return ["| 重要度 | パッケージ | advisory | 修正版 |", "| --- | --- | --- | --- |", ...rows].join(
		"\n",
	);
}

/** @param {ReturnType<typeof diffAudit>} diff */
export function formatSummary({ introduced, known, fixed }) {
	const sections = ["## 依存 audit（差分ゲート）"];
	sections.push(
		introduced.length > 0
			? `### ❌ この PR が持ち込む advisory（${introduced.length} 件・マージ不可）\n\n${table(introduced)}`
			: "### ✅ この PR が持ち込む advisory はありません",
	);
	if (known.length > 0) {
		sections.push(
			`### ⚠️ main に残っている既知の advisory（${known.length} 件・この PR では止めない）\n\n${table(known)}`,
		);
	}
	if (fixed.length > 0) {
		sections.push(`### 🎉 この PR で解消する advisory（${fixed.length} 件）\n\n${table(fixed)}`);
	}
	return `${sections.join("\n\n")}\n`;
}

function main([basePath, headPath]) {
	if (!basePath || !headPath) {
		console.error("使い方: node scripts/audit-diff.mjs <base.json> <head.json>");
		return 2;
	}
	let diff;
	try {
		diff = diffAudit(
			parseAudit(JSON.parse(readFileSync(basePath, "utf8"))),
			parseAudit(JSON.parse(readFileSync(headPath, "utf8"))),
		);
	} catch (error) {
		console.error(`::error::audit 結果を読めませんでした: ${error.message}`);
		return 2;
	}

	for (const a of diff.introduced) {
		console.log(
			`::error::この PR が持ち込む advisory: ${a.ghsa} (${a.severity}) ${a.module} — ${a.title}`,
		);
	}
	for (const a of diff.known) {
		console.log(
			`::warning::main に既知の advisory: ${a.ghsa} (${a.severity}) ${a.module} — ${a.title}`,
		);
	}
	const summary = formatSummary(diff);
	if (process.env.GITHUB_STEP_SUMMARY) {
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
	} else {
		console.log(summary);
	}
	return diff.introduced.length > 0 ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	process.exitCode = main(process.argv.slice(2));
}
