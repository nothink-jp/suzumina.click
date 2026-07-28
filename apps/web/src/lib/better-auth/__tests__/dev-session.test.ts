/**
 * ローカル開発ログインのセッション発行が、ゲート無効時に**自分で**拒否することの回帰ガード。
 *
 * 呼び出し側（`/api/dev/signin`）のゲートとは独立に、実セッションを発行する関数自体が
 * 最後の砦を持つ設計（PR #891 レビュー指摘）。この throw を消しても呼び出し側が正しい限り
 * 挙動が変わらず静かに退行するため、ここで固定する。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// better-auth 実体（インスタンス生成 / Firestore 接続）は発行経路の検証に不要なので遮断する。
vi.mock("../auth", () => ({ auth: { $context: Promise.resolve({}) } }));
vi.mock("../firestore-adapter", () => ({
	firestoreOps: () => ({ findOne: vi.fn(), create: vi.fn() }),
}));

const ENV_KEYS = ["NODE_ENV", "DEV_AUTH_BYPASS", "FIRESTORE_EMULATOR_HOST"] as const;
const mutableEnv = process.env as Record<string, string | undefined>;

describe("issueDevSessionCookie", () => {
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

	it("ゲートが無効なら Firestore に触れる前に throw する", async () => {
		mutableEnv.NODE_ENV = "development";
		delete mutableEnv.DEV_AUTH_BYPASS;
		mutableEnv.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

		const { issueDevSessionCookie } = await import("../dev-session");

		await expect(issueDevSessionCookie()).rejects.toThrow(
			"ローカル開発ログインが無効な環境では呼び出せません",
		);
	});

	it("本番では opt-in と Emulator が揃っていても throw する", async () => {
		mutableEnv.NODE_ENV = "production";
		mutableEnv.DEV_AUTH_BYPASS = "1";
		mutableEnv.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

		const { issueDevSessionCookie } = await import("../dev-session");

		await expect(issueDevSessionCookie()).rejects.toThrow(
			"ローカル開発ログインが無効な環境では呼び出せません",
		);
	});
});
