#!/usr/bin/env node
/**
 * GA4 イベントパラメータの「送っているが宣言していない」検知。
 *
 * GA4 のカスタムディメンションは登録前のデータに遡及適用されないため、パラメータを足したのに
 * 登録を忘れると、その期間のデータは永久に集計不能になる（#863 が `tag_count` を追加した際に
 * 実際に取りこぼした）。Firestore 複合インデックスと同型の負債だが、index は後から足せば効く
 * のに対しこちらは取り返せない点が悪いので、宣言漏れをここで機械的に弾く。
 *
 * 正本は `apps/web/src/lib/analytics/ga4-custom-dimensions.json`（Admin API の payload と同一形＝
 * 変換なしでそのまま登録できる）。live GA4 との突合は認証が必要なため本スクリプトでは行わない。
 *
 * 走査対象は gtag へパラメータを渡す3つの入口:
 *   - `sendGoogleAnalyticsEvent("name", { ... })`（events.ts の全イベント）
 *   - `window.gtag("event", "name", { ... } | identifier)`（web_vitals / consent_update）
 *   - `window.gtag("set", { ... })`（traffic_type）
 * 引数が識別子の場合は同一ファイル内の `const <id> = { ... }` に解決する。解決できない呼び出しは
 * 黙って通さず、UNRESOLVED_ALLOWLIST に理由付きで載っていなければ落とす（fail-closed）。
 *
 * AST は使わず正規表現 + 括弧マッチで読む。誤認の主因になるコメントは blankComments で潰す。
 * その際に正規表現リテラルも読み飛ばすのが必須で、これが無いと `/https?:\/\//` の内部の `//` を
 * 行コメントの開始と誤認して行末まで空白化し、同じ行にある実呼び出しが消える＝**宣言漏れを
 * 見逃す方向**に倒れる（実測で再現。call sites が 1 減り未宣言パラメータが検出されなくなった）。
 *
 * 残る限界は次の2つで、どちらも「宣言を増やせ」と言う過検知方向＝CI が赤くなるだけで見逃しはしない:
 *   - 文字列リテラル内に呼び出しそのものを書いた場合（`const s = 'gtag("event", ...)'`）を拾う
 *   - `n++/2` のように実は除算の `/` を正規表現開始と誤判定すると、その範囲内のコメントが
 *     空白化されず残るため、コメント内の記述を拾う。正規表現の読み飛ばしはテキストを消さないので、
 *     この誤判定でも実呼び出しが消えることはない（両ケースとも実測で確認済み）
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(repoRoot, "apps/web/src/lib/analytics/ga4-custom-dimensions.json");
const SCAN_DIR = join(repoRoot, "apps/web/src");
const SRC_EXT = /\.tsx?$/;

/**
 * カスタムディメンションを作らないパラメータ。追加するときは「なぜ登録しないか」を必ず書く。
 */
const IGNORED_PARAMS = new Map([
	["value", "GA4 組み込みの「イベントの値」にマップされるため登録不要"],
	["delta", "web_vitals の差分。value と情報が重複し、レポートで使っていないため意図的に未登録"],
	[
		"metric_id",
		"web-vitals の重複排除用ID。カーディナリティが極端に高く BigQuery export 前提の値のため意図的に未登録",
	],
	["consent_advertising", "同意率の観測は consent_analytics だけで足りるため意図的に未登録"],
	["consent_personalization", "同上（consent_analytics で足りる）"],
	// SPR-307: page_view を gtag("event") 形式に変えたことで現れた。いずれも予約語で、
	// カスタムディメンションとして登録すると組み込みディメンションと二重になる。
	["page_location", "GA4 組み込みディメンション（ページの完全URL）にマップされるため登録不可"],
	["page_title", "GA4 組み込みディメンション（ページタイトル）にマップされるため登録不可"],
	["send_to", "送信先を選ぶ gtag の指示で、イベントパラメータとして GA4 に届かない"],
]);

/**
 * params 引数が識別子で、同一ファイル内の const 定義に解決できない呼び出し。
 * ここに載せてよいのは「具体的なパラメータを持たない汎用の出口」だけ。
 */
const UNRESOLVED_ALLOWLIST = new Map([
	["parameters", "sendGoogleAnalyticsEvent 自身の汎用シンク。実際のパラメータは各呼び出し側にある"],
]);

const CALL_PATTERNS = [
	/sendGoogleAnalyticsEvent\s*\(/g,
	/gtag\s*\(\s*"event"\s*,/g,
	/gtag\s*\(\s*"set"\s*,/g,
];

function collectFiles(dir, acc = []) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name === "node_modules" || entry.name === "__tests__") continue;
		const full = join(dir, entry.name);
		if (entry.isDirectory()) collectFiles(full, acc);
		else if (SRC_EXT.test(entry.name)) acc.push(full);
	}
	return acc;
}

/** 引用符の位置を渡すと、その文字列リテラルの終端引用符の index を返す */
function endOfString(text, start) {
	const quote = text[start];
	for (let i = start + 1; i < text.length; i++) {
		if (text[i] === "\\") i++;
		else if (text[i] === quote) return i;
	}
	return text.length;
}

/**
 * コメント本体を同じ長さの空白へ潰す（文字列リテラルは温存し、改行も残す）。
 * 長さと改行を保つのは、走査後の行番号と括弧位置をそのまま使うため。
 * これが無いと「方式: gtag('set') で…」のような実コード片を載せた説明コメントを
 * 実呼び出しと誤認して落ちる（このリポジトリのコメントはその密度なので現実的なリスク）。
 */
/** 正規表現リテラルの開始になり得る直前トークン（除算と区別するための標準的な近似） */
const REGEX_PRECEDING_CHARS = new Set("(,=:[!&|?{};+-*%^~<>".split(""));
const REGEX_PRECEDING_KEYWORDS = new Set([
	"return",
	"typeof",
	"case",
	"in",
	"of",
	"do",
	"else",
	"void",
	"delete",
	"new",
	"instanceof",
	"yield",
	"await",
]);

/** この `/` が除算ではなく正規表現リテラルの開始かを直前トークンから推定する */
function isRegexStart(text, slash) {
	let i = slash - 1;
	while (i >= 0 && /\s/.test(text[i])) i--;
	if (i < 0) return true;
	if (REGEX_PRECEDING_CHARS.has(text[i])) return true;
	// 最長キーワード instanceof(10文字) が収まる窓だけ見る
	const word = /[\w$]+$/.exec(text.slice(Math.max(0, i - 12), i + 1))?.[0] ?? "";
	return REGEX_PRECEDING_KEYWORDS.has(word);
}

/** 正規表現リテラルの終端 `/` の index。未終端なら start を返す（呼び出し側は前進するだけ） */
function endOfRegex(text, start) {
	let inClass = false;
	for (let i = start + 1; i < text.length; i++) {
		const ch = text[i];
		if (ch === "\\") i++;
		else if (ch === "\n") return start;
		else if (ch === "[") inClass = true;
		else if (ch === "]") inClass = false;
		else if (ch === "/" && !inClass) return i;
	}
	return start;
}

function blankLineComment(out, text, from) {
	let i = from;
	while (i < text.length && text[i] !== "\n") out[i++] = " ";
	return i;
}

function blankBlockComment(out, text, from) {
	const end = text.indexOf("*/", from + 2);
	const stop = end === -1 ? text.length : end + 2;
	for (let i = from; i < stop; i++) if (text[i] !== "\n") out[i] = " ";
	return stop - 1;
}

function blankComments(text) {
	const out = text.split("");
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (ch === '"' || ch === "'" || ch === "`") i = endOfString(text, i);
		// `//` は JS では常にコメント（空の正規表現は書けない）ので正規表現判定より先に見る
		else if (ch === "/" && text[i + 1] === "/") i = blankLineComment(out, text, i);
		else if (ch === "/" && text[i + 1] === "*") i = blankBlockComment(out, text, i);
		else if (ch === "/" && isRegexStart(text, i)) i = endOfRegex(text, i);
	}
	return out.join("");
}

/**
 * `open` の位置の括弧に対応する閉じ括弧までを返す（文字列リテラルは読み飛ばす）。
 * @returns 括弧の内側の文字列。対応が取れなければ null
 */
function balanced(text, open, openCh = "(", closeCh = ")") {
	let depth = 0;
	for (let i = open; i < text.length; i++) {
		const ch = text[i];
		if (ch === '"' || ch === "'" || ch === "`") {
			i = endOfString(text, i);
		} else if (ch === openCh) {
			depth++;
		} else if (ch === closeCh && --depth === 0) {
			return text.slice(open + 1, i);
		}
	}
	return null;
}

/**
 * オブジェクトリテラル本体から key を集める（`key:` と shorthand `{ key }` の両方）。
 * 本体は波括弧を剥いだ状態で渡ってくるため、shorthand 照合では先頭に区切りを補う
 * （補わないと単独 shorthand の `{ provider }` を取り逃す）。
 */
function keysOf(objectBody) {
	const keys = new Set();
	for (const m of objectBody.matchAll(/([a-z][a-z0-9_]*)\s*:/gi)) keys.add(m[1]);
	for (const m of `,${objectBody}`.matchAll(/[{,]\s*([a-z][a-z0-9_]*)\s*(?=[,}]|$)/gi))
		keys.add(m[1]);
	return keys;
}

/** 同一ファイル内の `const <id> = { ... }` を解決して key を返す */
function resolveIdentifier(fileText, id) {
	const decl = new RegExp(`const\\s+${id}\\s*(?::[^=]+)?=\\s*\\{`).exec(fileText);
	if (!decl) return null;
	const body = balanced(fileText, decl.index + decl[0].length - 1, "{", "}");
	return body === null ? null : keysOf(body);
}

const declared = new Map(
	JSON.parse(readFileSync(MANIFEST, "utf8")).map((d) => [d.parameterName, d]),
);

// Admin API の description 上限。超えると登録が HTTP 400 で落ちるが、それが分かるのは
// `pnpm check:ga4-drift --apply`（GA4 認証が要る＝verify に入っていない）を叩いた時点で、
// PR が通った後になる。宣言と同じ場所で弾く（SPR-296 で実際に踏んだ）
const DESCRIPTION_MAX_LENGTH = 150;
const tooLongDescriptions = [...declared.values()].filter(
	(d) => (d.description ?? "").length > DESCRIPTION_MAX_LENGTH,
);
if (tooLongDescriptions.length > 0) {
	console.error(
		`[lint-ga4-params] ✗ description が ${DESCRIPTION_MAX_LENGTH} 文字を超えている（Admin API が受け付けない）:`,
	);
	for (const d of tooLongDescriptions) {
		console.error(`  ${d.parameterName}  (${d.description.length} 文字)`);
	}
	process.exit(1);
}

const used = new Map(); // param -> 最初に見つけた場所
const unresolved = []; // { id, where }
let callSites = 0;

for (const file of collectFiles(SCAN_DIR)) {
	const text = blankComments(readFileSync(file, "utf8"));
	const where = relative(repoRoot, file);
	for (const pattern of CALL_PATTERNS) {
		for (const m of text.matchAll(pattern)) {
			// パターン末尾が "(" でない（`gtag("event",`）場合は直前の "(" から括弧を数える
			const parenIdx = text.lastIndexOf("(", m.index + m[0].length - 1);
			const args = balanced(text, parenIdx);
			if (args === null) continue;
			callSites++;
			const line = text.slice(0, m.index).split("\n").length;

			const braceIdx = args.indexOf("{");
			if (braceIdx !== -1) {
				const body = balanced(args, braceIdx, "{", "}");
				for (const k of keysOf(body ?? "")) if (!used.has(k)) used.set(k, `${where}:${line}`);
				continue;
			}

			// 識別子渡し（例: web_vitals の eventParams）。同一ファイルの const 定義に解決する
			const last = args.split(",").pop().trim();
			if (!/^[A-Za-z_$][\w$]*$/.test(last)) continue;
			const resolved = resolveIdentifier(text, last);
			if (resolved) {
				for (const k of resolved) if (!used.has(k)) used.set(k, `${where}:${line}`);
			} else {
				unresolved.push({ id: last, where: `${where}:${line}` });
			}
		}
	}
}

const missing = [...used.keys()].filter((k) => !declared.has(k) && !IGNORED_PARAMS.has(k));
const unusedDeclared = [...declared.keys()].filter((k) => !used.has(k));
const badUnresolved = unresolved.filter((u) => !UNRESOLVED_ALLOWLIST.has(u.id));

console.log(
	`[lint-ga4-params] scanned ${callSites} call sites / ${used.size} params against ${declared.size} declared dimensions`,
);

if (unusedDeclared.length > 0) {
	// GA4 のカスタムディメンションは削除できずアーカイブのみ＝残っていても実害は無いので警告に留める
	console.warn(
		`[lint-ga4-params] ! 宣言のみ・送信なし: ${unusedDeclared.join(", ")}（送信を消したなら GA4 側のアーカイブを検討）`,
	);
}

if (badUnresolved.length > 0) {
	console.error("[lint-ga4-params] ✗ パラメータを解析できない呼び出し:");
	for (const u of badUnresolved) console.error(`  ${u.where} → ${u.id}`);
	console.error(
		"  → オブジェクトリテラルを直接渡すか、同一ファイル内の const に切り出す。汎用の出口なら UNRESOLVED_ALLOWLIST に理由付きで追加。",
	);
	process.exit(1);
}

if (missing.length > 0) {
	console.error(`[lint-ga4-params] ✗ ${missing.length} 個の未宣言パラメータ:`);
	for (const k of missing) console.error(`  ${k}  (${used.get(k)})`);
	console.error(
		"  → apps/web/src/lib/analytics/ga4-custom-dimensions.json に追加し、GA4 にも登録する（遡及適用されないので登録が遅れた分は永久に集計不能）。登録しない判断なら IGNORED_PARAMS に理由付きで追加。",
	);
	process.exit(1);
}

console.log("[lint-ga4-params] ✓ all sent params are declared");
