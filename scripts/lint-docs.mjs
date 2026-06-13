#!/usr/bin/env node
/**
 * docs リンター（SPR-205）— 2 つのチェックでポインタ doc の SSoT を守る。
 *
 * 1. リンク整合: docs 内の相対リンクが実在するか。ポインタ doc はリンクが腐ると無価値になる
 *    （型/ファイルのリネームでリンクが死ぬ = #652 と同型の drift）。CI=Linux 対策で case も照合。
 * 2. 転記禁止: ポインタ化した reference doc に「型 shape の転記」が再混入していないか。
 *    フィールド名・型を doc に列挙すると、型のリネームで必ず drift する（正本は packages/shared-types）。
 *
 * 正本: 本スクリプトが `pnpm verify`（root package.json）の最初のステップ。副作用なし（読み取りのみ）。
 * 違反が 1 件でもあれば exit 1。
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function collectMarkdown(dir, acc = []) {
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return acc;
	}
	for (const entry of entries) {
		if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
		const full = join(dir, entry.name);
		if (entry.isDirectory()) collectMarkdown(full, acc);
		else if (entry.name.endsWith(".md")) acc.push(full);
	}
	return acc;
}

const rel = (p) => p.slice(repoRoot.length + 1);

// ── Check 1: リンク整合 ───────────────────────────────────────────────
const linkTargets = [
	...collectMarkdown(join(repoRoot, "docs")),
	join(repoRoot, "CLAUDE.md"),
	join(repoRoot, "README.md"),
];
const INLINE_LINK = /\[[^\]]*\]\(([^)]+)\)/g;
const SKIP = /^(https?:|mailto:|tel:|#|<)/;

/** 解決済みパスが存在し、最終要素の case が実ディレクトリと一致するか（CI=Linux 対策） */
function existsCaseSensitive(absPath) {
	try {
		statSync(absPath);
	} catch {
		return false;
	}
	const parent = dirname(absPath);
	const base = absPath.slice(parent.length + 1);
	if (!base) return true;
	try {
		return readdirSync(parent).includes(base);
	} catch {
		return false;
	}
}

let linkCount = 0;
const brokenLinks = [];
for (const md of linkTargets) {
	let text;
	try {
		text = readFileSync(md, "utf8");
	} catch {
		continue;
	}
	const lines = text.split("\n");
	for (let i = 0; i < lines.length; i++) {
		for (const m of lines[i].matchAll(INLINE_LINK)) {
			const raw = m[1].trim();
			if (SKIP.test(raw)) continue;
			const linkPath = raw.split("#")[0].split(/\s+/)[0].trim();
			if (!linkPath) continue;
			linkCount++;
			const abs = normalize(resolve(dirname(md), linkPath));
			if (!existsCaseSensitive(abs)) brokenLinks.push(`${rel(md)}:${i + 1}  ->  ${linkPath}`);
		}
	}
}

// ── Check 2: 転記禁止 ─────────────────────────────────────────────────
// 対象: docs/reference 配下のポインタ doc。外部 API 契約を記す external-apis/ は対象外
// （正本が shared-types でなく外部仕様のため）。
// 判定: ts/typescript の fenced block が「フィールド宣言 >= 5 かつ実行コード行 0」＝型 shape の転記。
//       import/const/await/=> 等を含む usage example は実行コード行を持つので誤検知しない。
const FIELD_DECL = /^\s*[A-Za-z_]\w*\??\s*:\s*\S/;
// 実行コード（usage example）を示す行。これを含む block は型 shape 転記でないと判定する。
// `export` と `=\s` は意図的に除外: それらを含めると `export interface X {` / `type X = {` を
// usage と誤認し、type-alias 形式の転記を false negative にしてしまう（interface / bare {} / type alias を
// 等しく検出するため）。`const x = ...` 等の usage は `const` 等のキーワードで拾える。
const CODE_LINE = /\b(import|const|let|var|return|await|function)\b|=>/;
const FENCE = /^```(\w+)?/;
const TRANSCRIPTION_THRESHOLD = 5;

const refDocs = collectMarkdown(join(repoRoot, "docs", "reference")).filter(
	(p) => !p.includes(`${sep}external-apis${sep}`),
);

const transcriptions = [];
for (const md of refDocs) {
	const lines = readFileSync(md, "utf8").split("\n");
	for (let i = 0; i < lines.length; i++) {
		const fence = FENCE.exec(lines[i]);
		const lang = fence && (fence[1] || "").toLowerCase();
		if (!fence || (lang !== "ts" && lang !== "typescript")) continue;
		const start = i;
		const body = [];
		i++;
		while (i < lines.length && !lines[i].startsWith("```")) body.push(lines[i++]);
		const fields = body.filter((l) => FIELD_DECL.test(l)).length;
		const code = body.filter((l) => CODE_LINE.test(l)).length;
		if (fields >= TRANSCRIPTION_THRESHOLD && code === 0) {
			transcriptions.push(
				`${rel(md)}:${start + 1}  (${fields} 個のフィールド宣言・実行コード行なし)`,
			);
		}
	}
}

// ── 結果 ─────────────────────────────────────────────────────────────
console.log(
	`[lint-docs] links: checked ${linkCount} across ${linkTargets.length} files / transcription: scanned ${refDocs.length} reference docs`,
);
let failed = false;
if (brokenLinks.length > 0) {
	failed = true;
	console.error(`[lint-docs] ✗ ${brokenLinks.length} broken link(s):`);
	for (const b of brokenLinks) console.error(`  ${b}`);
	console.error(
		"  → リンク先は実在しなければならない。リネーム時はリンクを追従させること（SPR-205）。",
	);
}
if (transcriptions.length > 0) {
	failed = true;
	console.error(`[lint-docs] ✗ ${transcriptions.length} 個の型 shape 転記:`);
	for (const t of transcriptions) console.error(`  ${t}`);
	console.error(
		"  → reference doc に型の shape を転記しない。正本（packages/shared-types）へのリンクに置換すること（SPR-205）。",
	);
}
if (failed) process.exit(1);
console.log("[lint-docs] ✓ all relative links resolve / no transcribed type shapes");
