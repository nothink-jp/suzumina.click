import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkDockerfile, checkWorkflow, readCanonicalVersion } from "../lint-node-version.mjs";

describe("readCanonicalVersion", () => {
	it("devEngines.runtime.version を返す", () => {
		assert.equal(
			readCanonicalVersion({ devEngines: { runtime: { version: "24.22.1" } } }),
			"24.22.1",
		);
	});

	it("無い・x.y.z でないときは throw する（fail-closed）", () => {
		assert.throws(() => readCanonicalVersion({}));
		assert.throws(() => readCanonicalVersion({ devEngines: { runtime: { version: "24" } } }));
		assert.throws(() => readCanonicalVersion({ devEngines: { runtime: { version: ">=24" } } }));
	});
});

describe("checkDockerfile", () => {
	it("FROM node:<正本>-alpine なら通す", () => {
		assert.deepEqual(
			checkDockerfile("FROM node:24.22.1-alpine AS base\nFROM base AS runner\n", "24.22.1"),
			[],
		);
	});

	it("Dependabot が Dockerfile だけ上げた状態を弾く", () => {
		assert.equal(checkDockerfile("FROM node:24.23.0-alpine AS base\n", "24.22.1").length, 1);
	});

	it("サフィックスなしのタグも比べる", () => {
		assert.deepEqual(checkDockerfile("FROM node:24.22.1\n", "24.22.1"), []);
		assert.equal(checkDockerfile("FROM node:24\n", "24.22.1").length, 1);
	});

	it("FROM node: が無いのは不一致として扱う", () => {
		assert.equal(checkDockerfile("FROM alpine:3\n", "24.22.1").length, 1);
	});
});

describe("checkWorkflow", () => {
	it("正本から導いた値は通す", () => {
		assert.deepEqual(
			checkWorkflow(
				"x.yml",
				'            --runtime "$NODE_RUNTIME" \\\n          node-version-file: package.json\n',
			),
			[],
		);
	});

	it("--runtime nodejsNN と node-version: NN を弾く", () => {
		assert.equal(checkWorkflow("x.yml", "            --runtime nodejs24 \\\n").length, 1);
		assert.equal(checkWorkflow("x.yml", "          node-version: 24\n").length, 1);
		assert.equal(checkWorkflow("x.yml", "          node-version: '24.22.1'\n").length, 1);
	});

	it("メッセージに渡したパスと行番号を出す", () => {
		const [msg] = checkWorkflow(
			".github/actions/setup-pnpm/action.yml",
			"a: 1\n    node-version: 24\n",
		);
		assert.match(msg, /^\.github\/actions\/setup-pnpm\/action\.yml:2: /);
	});

	it("コメント行は見ない", () => {
		assert.deepEqual(checkWorkflow("x.yml", "          # 以前は --runtime nodejs22 だった\n"), []);
	});
});
