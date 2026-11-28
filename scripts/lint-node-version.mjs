#!/usr/bin/env node
/**
 * Node・pnpm・Biome の版の写しが正本とずれていないかを弾く（Node: SPR-405 / pnpm: SPR-422）。
 * Biome はツール名に合わないが、CI の Repo Lint が実行するのがこのスクリプトなので同居させる。
 *
 * 正本はルート package.json の `devEngines.runtime.version`。pnpm（`onFail: "download"` で
 * セッション環境にも同じ版を入れる）・CI の pnpm/setup・setup-node の `node-version-file` はここを直接読む。
 *
 * 正本を直接読めない場所が 2 種類ある:
 *   - `apps/web/Dockerfile` と `apps/functions/Dockerfile` の `FROM node:<ver>-alpine`: 写しとして残す（Dependabot docker が新しい版を
 *     知らせる役を持ち、Dockerfile を読んだときに版が見えるようにするため）。正本と完全一致を要求する
 *   - workflows と composite action（`.github/workflows/*.yml` / `.github/actions/<name>/action.yml`）: 版は正本から
 *     導く（deploy-functions.yml の `--runtime` 等。setup-pnpm は CI の Node の入口）。リテラルの版を書き戻すと
 *     drift の入口になるので、`--runtime nodejs<数字>` と `node-version: <数字>` を禁止する
 *
 * pnpm の版の正本はルート package.json の `packageManager`（`pnpm@x.y.z+sha512...`）。Dockerfile は
 * `COPY --from=ghcr.io/pnpm/pnpm:<ver>-alpine` で公式イメージからバイナリをコピーする（Node 25 以降は corepack が
 * 同梱されないため。pnpm 公式の Docker の手順）。このタグも写しなので、正本と完全一致を要求する。
 * 同じ package.json の `engines.pnpm`（deploy-functions.yml が Cloud Functions の buildpack に渡す pnpm の版）と
 * `devEngines.packageManager.version` も写しなので、正本と完全一致を要求する（欠落も不一致）。
 *
 * Biome の版の正本はルート package.json の `devDependencies["@biomejs/biome"]`（x.y.z の固定）。ルート `biome.json` の
 * `$schema`（`https://biomejs.dev/schemas/<ver>/schema.json`）は写しで、Dependabot は package.json だけを上げるため
 * ずれると CLI が schema 不一致を警告する。正本と完全一致を要求する（揃えるのは `pnpm exec biome migrate --write`）。
 *
 * Dependabot docker の PR は Dockerfile だけを上げるので、ここで落ちる＝正本を揃えてからマージする合図。
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DOCKERFILES = ["apps/web/Dockerfile", "apps/functions/Dockerfile"];
const BIOME_JSON = "biome.json";
const WORKFLOWS_DIR = ".github/workflows";
const ACTIONS_DIR = ".github/actions";

/** workflows / composite action に版をリテラルで書いている箇所（正本から導くべきもの） */
const LITERAL_VERSION_PATTERNS = [/--runtime[ =]+["']?nodejs\d+/, /node-version:\s*["']?\d/];

/**
 * @param {unknown} pkg ルート package.json をパースしたもの
 * @returns {string} 正本の版。読めなければ throw（fail-closed）
 */
export function readCanonicalVersion(pkg) {
	const version = pkg?.devEngines?.runtime?.version;
	if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/.test(version)) {
		throw new Error(
			`package.json の devEngines.runtime.version が x.y.z ではありません: ${JSON.stringify(version)}`,
		);
	}
	return version;
}

/**
 * @param {string} path リポジトリルートからの相対パス（メッセージ用）
 * @param {string} dockerfile Dockerfile の本文
 * @param {string} canonical 正本の版
 * @returns {string[]} 不一致の説明。`FROM node:` が 1 つも無いのも不一致として扱う
 */
export function checkDockerfile(path, dockerfile, canonical) {
	const froms = [...dockerfile.matchAll(/^FROM\s+node:(\S+)/gim)].map((m) => m[1]);
	if (froms.length === 0) return [`${path} に FROM node:<ver> が見つかりません`];
	return froms
		.filter((tag) => tag.split("-")[0] !== canonical)
		.map((tag) => `${path}: FROM node:${tag} が正本 ${canonical} と一致しません`);
}

/**
 * @param {unknown} pkg ルート package.json をパースしたもの
 * @returns {string} pnpm の正本の版（`packageManager` の `pnpm@x.y.z` 部分）。読めなければ throw（fail-closed）
 */
export function readCanonicalPnpmVersion(pkg) {
	const match = /^pnpm@(\d+\.\d+\.\d+)(?:\+.+)?$/.exec(String(pkg?.packageManager ?? ""));
	if (!match) {
		throw new Error(
			`package.json の packageManager が pnpm@x.y.z ではありません: ${JSON.stringify(pkg?.packageManager)}`,
		);
	}
	return match[1];
}

/**
 * @param {string} path リポジトリルートからの相対パス（メッセージ用）
 * @param {string} dockerfile Dockerfile の本文
 * @param {string} canonical pnpm の正本の版
 * @returns {string[]} 不一致の説明。公式イメージからのコピーが 1 つも無いのも不一致として扱う
 */
export function checkDockerfilePnpm(path, dockerfile, canonical) {
	const tags = [...dockerfile.matchAll(/^COPY\s+--from=ghcr\.io\/pnpm\/pnpm:(\S+)/gim)].map(
		(m) => m[1],
	);
	if (tags.length === 0) return [`${path} に COPY --from=ghcr.io/pnpm/pnpm:<ver> が見つかりません`];
	return tags
		.filter((tag) => tag.split("-")[0] !== canonical)
		.map(
			(tag) =>
				`${path}: COPY --from=ghcr.io/pnpm/pnpm:${tag} が pnpm の正本 ${canonical} と一致しません`,
		);
}

/** package.json 内の pnpm の版の写し（パスはメッセージ用） */
const PACKAGE_JSON_PNPM_COPIES = [
	{ path: "engines.pnpm", read: (pkg) => pkg?.engines?.pnpm },
	{
		path: "devEngines.packageManager.version",
		read: (pkg) => pkg?.devEngines?.packageManager?.version,
	},
];

/**
 * @param {unknown} pkg ルート package.json をパースしたもの
 * @param {string} canonical pnpm の正本の版
 * @returns {string[]} 不一致の説明。範囲指定（`^12.16.1` 等）や欠落も不一致として扱う
 */
export function checkPackageJsonPnpmCopies(pkg, canonical) {
	return PACKAGE_JSON_PNPM_COPIES.map(({ path, read }) => ({ path, actual: read(pkg) }))
		.filter(({ actual }) => actual !== canonical)
		.map(
			({ path, actual }) =>
				`package.json の ${path}（${JSON.stringify(actual)}）が pnpm の正本 ${canonical} と一致しません`,
		);
}

/**
 * @param {unknown} pkg ルート package.json をパースしたもの
 * @returns {string} Biome の正本の版（`devDependencies["@biomejs/biome"]`）。x.y.z の固定でなければ throw（fail-closed）
 */
export function readCanonicalBiomeVersion(pkg) {
	const version = pkg?.devDependencies?.["@biomejs/biome"];
	if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/.test(version)) {
		throw new Error(
			`package.json の devDependencies["@biomejs/biome"] が x.y.z ではありません: ${JSON.stringify(version)}`,
		);
	}
	return version;
}

/**
 * @param {string} path リポジトリルートからの相対パス（メッセージ用）
 * @param {string} biomeJson biome.json の本文（JSONC の可能性があるのでパースせずに読む）
 * @param {string} canonical Biome の正本の版
 * @returns {string[]} 不一致の説明。`$schema` が無いのも不一致として扱う
 */
export function checkBiomeSchema(path, biomeJson, canonical) {
	const match = /"\$schema"\s*:\s*"https:\/\/biomejs\.dev\/schemas\/([^/"]+)\/schema\.json"/.exec(
		biomeJson,
	);
	if (!match)
		return [`${path} に $schema（https://biomejs.dev/schemas/<ver>/schema.json）が見つかりません`];
	if (match[1] === canonical) return [];
	return [`${path}: $schema の版 ${match[1]} が Biome の正本 ${canonical} と一致しません`];
}

/**
 * @param {string} path リポジトリルートからの相対パス（メッセージ用）
 * @param {string} body workflow / action.yml の本文
 * @returns {string[]} リテラルの版を書いている行
 */
export function checkWorkflow(path, body) {
	return body
		.split("\n")
		.map((line, i) => ({ line, no: i + 1 }))
		.filter(({ line }) => !line.trimStart().startsWith("#"))
		.filter(({ line }) => LITERAL_VERSION_PATTERNS.some((p) => p.test(line)))
		.map(
			({ line, no }) =>
				`${path}:${no}: Node の版をリテラルで書いています（正本から導く）: ${line.trim()}`,
		);
}

/** @returns {string[]} 走査する workflow と composite action の相対パス */
function listWorkflowFiles() {
	const workflows = readdirSync(join(repoRoot, WORKFLOWS_DIR))
		.filter((f) => /\.ya?ml$/.test(f))
		.map((f) => `${WORKFLOWS_DIR}/${f}`);
	const actions = readdirSync(join(repoRoot, ACTIONS_DIR), { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.flatMap((d) => ["action.yml", "action.yaml"].map((f) => `${ACTIONS_DIR}/${d.name}/${f}`))
		.filter((p) => existsSync(join(repoRoot, p)));
	return [...workflows, ...actions];
}

function main() {
	const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
	const canonical = readCanonicalVersion(pkg);
	const canonicalPnpm = readCanonicalPnpmVersion(pkg);
	const canonicalBiome = readCanonicalBiomeVersion(pkg);
	const errors = [
		...checkPackageJsonPnpmCopies(pkg, canonicalPnpm),
		...checkBiomeSchema(
			BIOME_JSON,
			readFileSync(join(repoRoot, BIOME_JSON), "utf8"),
			canonicalBiome,
		),
	];
	for (const path of DOCKERFILES) {
		const body = readFileSync(join(repoRoot, path), "utf8");
		errors.push(
			...checkDockerfile(path, body, canonical),
			...checkDockerfilePnpm(path, body, canonicalPnpm),
		);
	}
	for (const path of listWorkflowFiles()) {
		errors.push(...checkWorkflow(path, readFileSync(join(repoRoot, path), "utf8")));
	}
	if (errors.length > 0) {
		console.error(
			"Node / pnpm / Biome の版が正本（package.json の devEngines.runtime.version / packageManager / devDependencies）とずれています:",
		);
		for (const e of errors) console.error(`  - ${e}`);
		process.exit(1);
	}
	console.log(
		`lint:node-version: OK（正本 Node ${canonical} / pnpm ${canonicalPnpm} / Biome ${canonicalBiome}）`,
	);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
