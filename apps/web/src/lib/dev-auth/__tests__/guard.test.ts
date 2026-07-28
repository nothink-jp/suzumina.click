/**
 * ローカル開発ログインの有効化ゲート。
 *
 * ここは「本番で絶対に有効にならない」ことの回帰ガードなので、3 条件の AND を網羅する
 * （どれか 1 つが欠けただけで無効になること・本番は opt-in 済みでも無効になることを固定する）。
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEV_AUTH_DISCORD_ID, isDevAuthEnabled } from "../guard";

const ENV_KEYS = ["NODE_ENV", "DEV_AUTH_BYPASS", "FIRESTORE_EMULATOR_HOST"] as const;
type EnvKey = (typeof ENV_KEYS)[number];

// NODE_ENV は型上 readonly 相当のためテストからの差し替えは可変ビューを介す。
const mutableEnv = process.env as Record<string, string | undefined>;

describe("isDevAuthEnabled", () => {
	const original: Record<string, string | undefined> = {};

	beforeEach(() => {
		for (const key of ENV_KEYS) {
			original[key] = mutableEnv[key];
		}
	});

	afterEach(() => {
		for (const key of ENV_KEYS) {
			if (original[key] === undefined) {
				delete mutableEnv[key];
			} else {
				mutableEnv[key] = original[key];
			}
		}
	});

	function setEnv(env: Partial<Record<EnvKey, string | undefined>>): void {
		for (const key of ENV_KEYS) {
			const value = env[key];
			if (value === undefined) {
				delete mutableEnv[key];
			} else {
				mutableEnv[key] = value;
			}
		}
	}

	it("3 条件が揃えば有効", () => {
		setEnv({
			NODE_ENV: "development",
			DEV_AUTH_BYPASS: "1",
			FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
		});

		expect(isDevAuthEnabled()).toBe(true);
	});

	it("本番では opt-in と Emulator が揃っていても無効（例外を設けない）", () => {
		setEnv({
			NODE_ENV: "production",
			DEV_AUTH_BYPASS: "1",
			FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
		});

		expect(isDevAuthEnabled()).toBe(false);
	});

	it("opt-in フラグが無ければ無効（dev:local の既定）", () => {
		setEnv({
			NODE_ENV: "development",
			DEV_AUTH_BYPASS: undefined,
			FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
		});

		expect(isDevAuthEnabled()).toBe(false);
	});

	it("opt-in フラグが '1' 以外なら無効", () => {
		setEnv({
			NODE_ENV: "development",
			DEV_AUTH_BYPASS: "true",
			FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
		});

		expect(isDevAuthEnabled()).toBe(false);
	});

	it("Emulator に繋がっていなければ無効（ADC 直結 dev では有効化できない）", () => {
		setEnv({
			NODE_ENV: "development",
			DEV_AUTH_BYPASS: "1",
			FIRESTORE_EMULATOR_HOST: undefined,
		});

		expect(isDevAuthEnabled()).toBe(false);
	});
});

describe("DEV_AUTH_DISCORD_ID", () => {
	// ID がずれると enrich-session が users/{discordId} を引けず「ログインしたのに未認証」になる。
	// 静かに壊れる類なのでフィクスチャ側と突き合わせて固定する。
	it("fixtures/users.json の doc ID と一致する", () => {
		const fixturePath = join(
			__dirname,
			"../../../../../functions/src/tools/firestore-local/fixtures/users.json",
		);
		const fixture = JSON.parse(readFileSync(fixturePath, "utf-8")) as {
			docs: Array<{ id: string }>;
		};

		expect(fixture.docs.map((doc) => doc.id)).toContain(DEV_AUTH_DISCORD_ID);
	});
});
