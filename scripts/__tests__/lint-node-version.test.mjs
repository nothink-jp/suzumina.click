import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	checkDockerfile,
	checkDockerfilePnpm,
	checkWorkflow,
	readCanonicalPnpmVersion,
	readCanonicalVersion,
} from "../lint-node-version.mjs";

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
			checkDockerfile(
				"apps/web/Dockerfile",
				"FROM node:24.22.1-alpine AS base\nFROM base AS runner\n",
				"24.22.1",
			),
			[],
		);
	});

	it("Dependabot が Dockerfile だけ上げた状態を弾く", () => {
		assert.equal(
			checkDockerfile("apps/web/Dockerfile", "FROM node:24.23.0-alpine AS base\n", "24.22.1")
				.length,
			1,
		);
	});

	it("サフィックスなしのタグも比べる", () => {
		assert.deepEqual(checkDockerfile("apps/web/Dockerfile", "FROM node:24.22.1\n", "24.22.1"), []);
		assert.equal(checkDockerfile("apps/web/Dockerfile", "FROM node:24\n", "24.22.1").length, 1);
	});

	it("FROM node: が無いのは不一致として扱う", () => {
		assert.equal(checkDockerfile("apps/web/Dockerfile", "FROM alpine:3\n", "24.22.1").length, 1);
	});
});

describe("readCanonicalPnpmVersion", () => {
	it("packageManager の pnpm@x.y.z を返す（+sha512 は捨てる）", () => {
		assert.equal(
			readCanonicalPnpmVersion({ packageManager: "pnpm@12.16.1+sha512.abc" }),
			"12.16.1",
		);
		assert.equal(readCanonicalPnpmVersion({ packageManager: "pnpm@12.16.1" }), "12.16.1");
	});

	it("無い・pnpm でない・x.y.z でないときは throw する（fail-closed）", () => {
		assert.throws(() => readCanonicalPnpmVersion({}));
		assert.throws(() => readCanonicalPnpmVersion({ packageManager: "yarn@4.0.0" }));
		assert.throws(() => readCanonicalPnpmVersion({ packageManager: "pnpm@12" }));
	});
});

describe("checkDockerfilePnpm", () => {
	const copy = (tag) => `COPY --from=ghcr.io/pnpm/pnpm:${tag} /opt/pnpm /opt/pnpm\n`;

	it("正本と同じ版のタグなら通す", () => {
		assert.deepEqual(
			checkDockerfilePnpm("apps/web/Dockerfile", copy("12.16.1-alpine"), "12.16.1"),
			[],
		);
	});

	it("Dependabot がタグだけ上げた状態を弾く", () => {
		assert.equal(
			checkDockerfilePnpm("apps/web/Dockerfile", copy("12.17.0-alpine"), "12.16.1").length,
			1,
		);
	});

	it("major だけのタグ（中身が動く）も弾く", () => {
		assert.equal(
			checkDockerfilePnpm("apps/web/Dockerfile", copy("12-alpine"), "12.16.1").length,
			1,
		);
	});

	it("公式イメージからのコピーが無いのは不一致として扱う（corepack に戻した等）", () => {
		assert.equal(
			checkDockerfilePnpm("apps/web/Dockerfile", "RUN corepack enable pnpm\n", "12.16.1").length,
			1,
		);
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
