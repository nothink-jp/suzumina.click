#!/usr/bin/env node
/**
 * Node の版の写しが正本とずれていないかを弾く（SPR-405）。
 *
 * 正本はルート package.json の `devEngines.runtime.version`。pnpm（`onFail: "download"` で
 * セッション環境にも同じ版を入れる）・CI の pnpm/setup・setup-node の `node-version-file` はここを直接読む。
 *
 * 正本を直接読めない場所が 2 種類ある:
 *   - `apps/web/Dockerfile` の `FROM node:<ver>-alpine`: 写しとして残す（Dependabot docker が新しい版を
 *     知らせる役を持ち、Dockerfile を読んだときに版が見えるようにするため）。正本と完全一致を要求する
 *   - workflows: 版は正本から導く（deploy-functions.yml の `--runtime` 等）。リテラルの版を書き戻すと
 *     drift の入口になるので、`--runtime nodejs<数字>` と `node-version: <数字>` を禁止する
 *
 * Dependabot docker の PR は Dockerfile だけを上げるので、ここで落ちる＝正本を揃えてからマージする合図。
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DOCKERFILE = "apps/web/Dockerfile";
const WORKFLOWS_DIR = ".github/workflows";

/** workflows に版をリテラルで書いている箇所（正本から導くべきもの） */
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
 * @param {string} dockerfile Dockerfile の本文
 * @param {string} canonical 正本の版
 * @returns {string[]} 不一致の説明。`FROM node:` が 1 つも無いのも不一致として扱う
 */
export function checkDockerfile(dockerfile, canonical) {
	const froms = [...dockerfile.matchAll(/^FROM\s+node:(\S+)/gim)].map((m) => m[1]);
	if (froms.length === 0) return [`${DOCKERFILE} に FROM node:<ver> が見つかりません`];
	return froms
		.filter((tag) => tag.split("-")[0] !== canonical)
		.map((tag) => `${DOCKERFILE}: FROM node:${tag} が正本 ${canonical} と一致しません`);
}

/**
 * @param {string} name ファイル名
 * @param {string} body workflow の本文
 * @returns {string[]} リテラルの版を書いている行
 */
export function checkWorkflow(name, body) {
	return body
		.split("\n")
		.map((line, i) => ({ line, no: i + 1 }))
		.filter(({ line }) => !line.trimStart().startsWith("#"))
		.filter(({ line }) => LITERAL_VERSION_PATTERNS.some((p) => p.test(line)))
		.map(
			({ line, no }) =>
				`${WORKFLOWS_DIR}/${name}:${no}: Node の版をリテラルで書いています（正本から導く）: ${line.trim()}`,
		);
}

function main() {
	const canonical = readCanonicalVersion(
		JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")),
	);
	const errors = [...checkDockerfile(readFileSync(join(repoRoot, DOCKERFILE), "utf8"), canonical)];
	for (const name of readdirSync(join(repoRoot, WORKFLOWS_DIR)).filter((f) => /\.ya?ml$/.test(f))) {
		errors.push(...checkWorkflow(name, readFileSync(join(repoRoot, WORKFLOWS_DIR, name), "utf8")));
	}
	if (errors.length > 0) {
		console.error("Node の版が正本（package.json の devEngines.runtime.version）とずれています:");
		for (const e of errors) console.error(`  - ${e}`);
		process.exit(1);
	}
	console.log(`lint:node-version: OK（正本 ${canonical}）`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
