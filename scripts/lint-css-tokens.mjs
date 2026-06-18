#!/usr/bin/env node
/**
 * CSS デザイントークンの「定義あり・参照なし」検知（点1 / DS Phase 0）。
 *
 * globals.css の `:root` で宣言した custom property が、どこからも消費されていなければ落とす。
 * これは chart-* / font-size-a11y-* のような「死にトークン」の再混入を弾くための継続検知
 * （lint-docs.mjs と同じく `pnpm verify` の読み取り専用ステップ。違反で exit 1）。
 *
 * 「消費されている」の定義（保守的＝過検知を避け、used 側に倒す）:
 *   1. usage corpus（globals.css の @theme 以外 + ui/web の src 全体）に `var(--NAME)` が出る、または
 *   2. utility フラグメントとして `-NAME`（例 bg-suzuka-500 の suzuka-500）が出る。
 * 過検知を避けるため、構造上 var()/utility で直接参照されない既知トークンは ALLOWLIST で除外する
 *   - Tailwind v4 の config トークン（container/color-scheme 等）
 *   - radius スケール（--radius-md → utility 名は rounded-md でトークン名と一致しないため）
 * 正本: 本スクリプト。トークンの値・shape は転記しない（正本は globals.css 自身）。
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GLOBALS = join(repoRoot, "packages/ui/src/styles/globals.css");

// 構造上 var()/utility で直接参照されない（Tailwind 内部消費 or 名前不一致）ため検知対象外。
// 追加するときは「なぜ参照が出ないか」を必ずコメントで残すこと。
const ALLOWLIST = new Set([
	// Tailwind v4 の theme/config トークン（フレームワークが内部消費・コードに var() は出ない）
	"color-scheme",
	"container-center",
	"container-padding",
	"container-screens-2xl",
	"default-border-radius",
	// radius スケール（:root 定義分のみ列挙）: 消費は rounded-* utility で、トークン名（radius-md）と
	// utility 名（rounded-md）が一致しないためフラグメント照合できない。スケールとして意図的に完備。
	// 注: --radius-xl は :root に無く @theme 専用のため declared に入らず、ここに足しても無効。
	"radius",
	"radius-sm",
	"radius-md",
	"radius-lg",
	// animation: --animate-* は globals.css 内の @keyframes/utility と対で定義した体系。
	// tw-animate-css 連携の予約で、個別 var() 参照は出ないことがある。
	"animate-accordion-down",
	"animate-accordion-up",
	"animate-focus-pulse",
	"animate-shimmer",
]);

const SRC_DIRS = ["packages/ui/src", "apps/web/src"];
const SRC_EXT = /\.(tsx?|css|mdx)$/;

function collectFiles(dir, acc = []) {
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return acc;
	}
	for (const entry of entries) {
		if (entry.name === "node_modules") continue;
		const full = join(dir, entry.name);
		if (entry.isDirectory()) collectFiles(full, acc);
		else if (SRC_EXT.test(entry.name)) acc.push(full);
	}
	return acc;
}

/** 最初の波括弧ブロック `sel { ... }`（ネスト無し）を抜き出す */
function firstBlock(text, selector) {
	const start = text.indexOf(selector);
	if (start === -1) return "";
	const open = text.indexOf("{", start);
	const close = text.indexOf("}", open);
	return open === -1 || close === -1 ? "" : text.slice(open + 1, close);
}

const globalsText = readFileSync(GLOBALS, "utf8");

// 1) 宣言されたトークン名を `:root` の最初のブロックから収集
const rootBlock = firstBlock(globalsText, ":root");
const declared = [...rootBlock.matchAll(/^\s*--([\w-]+)\s*:/gm)].map((m) => m[1]);

// 2) usage corpus を構築。
//    globals.css からは custom property の「宣言行」(`--NAME: ...`)を全て除去する。
//    残さないと utility フラグメント正規表現 `-NAME` が宣言 `--NAME:` 自身にマッチし、
//    全トークンが自分の定義で「used」と誤判定される（@theme passthrough も宣言行なので同時に消える）。
//    残るのは base layer の実消費（body/gradients/skip-link/hover-lift 内の var() 等）のみ。
const globalsUsage = globalsText.replace(/^\s*--[\w-]+\s*:.*$/gm, "");
const otherFiles = SRC_DIRS.flatMap((d) => collectFiles(join(repoRoot, d))).filter(
	(f) => f !== GLOBALS,
);
const corpus = `${globalsUsage}\n${otherFiles.map((f) => readFileSync(f, "utf8")).join("\n")}`;

// 3) 各トークンの消費を判定
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function isUsed(name) {
	if (ALLOWLIST.has(name)) return true;
	// var(--NAME) 直接参照
	if (new RegExp(`var\\(\\s*--${esc(name)}(?![\\w-])`).test(corpus)) return true;
	// utility フラグメント -NAME（bg-suzuka-500 等）。後続は語/ハイフン以外で境界
	if (new RegExp(`-${esc(name)}(?![\\w-])`).test(corpus)) return true;
	return false;
}

const dead = declared.filter((name) => !isUsed(name));

console.log(
	`[lint-css-tokens] scanned ${declared.length} :root tokens against ${otherFiles.length + 1} files`,
);
if (dead.length > 0) {
	console.error(`[lint-css-tokens] ✗ ${dead.length} 個の定義のみ・参照なしトークン:`);
	for (const d of dead) console.error(`  --${d}`);
	console.error(
		"  → 使うなら参照を、使わないなら globals.css から削除。意図的に参照が出ない場合は ALLOWLIST に理由付きで追加（点1 / SPR-205 系）。",
	);
	process.exit(1);
}
console.log("[lint-css-tokens] ✓ all :root tokens are referenced");
