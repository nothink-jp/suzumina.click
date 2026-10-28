import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../logger", () => ({ error: vi.fn(), warn: vi.fn() }));

const {
	getTurnstileSiteKey,
	verifyTurnstileToken,
	TURNSTILE_TEST_SECRET_KEY,
	TURNSTILE_TEST_SITE_KEY,
} = await import("../turnstile");
const { error: logError } = vi.mocked(await import("../logger"));

const fetchMock = vi.fn();

const jsonResponse = (body: unknown, ok = true, status = 200) =>
	({ ok, status, json: async () => body }) as Response;

const sentBody = () => fetchMock.mock.calls[0]?.[1]?.body as URLSearchParams;

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal("fetch", fetchMock);
	vi.stubEnv("NODE_ENV", "production");
	vi.stubEnv("TURNSTILE_SECRET_KEY", "real-secret");
	vi.stubEnv("TURNSTILE_SITE_KEY", "real-site-key");
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe("verifyTurnstileToken", () => {
	it("siteverify が success: true なら true（secret / response / remoteip を送る）", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ success: true }));
		expect(await verifyTurnstileToken("tok", "9.9.9.9")).toBe(true);
		expect(fetchMock.mock.calls[0]?.[0]).toBe(
			"https://challenges.cloudflare.com/turnstile/v0/siteverify",
		);
		expect(Object.fromEntries(sentBody())).toEqual({
			secret: "real-secret",
			response: "tok",
			remoteip: "9.9.9.9",
		});
	});

	it("remoteip が unknown なら送らない", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ success: true }));
		await verifyTurnstileToken("tok", "unknown");
		expect(sentBody().has("remoteip")).toBe(false);
	});

	it("siteverify が success: false なら false", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({ success: false, "error-codes": ["timeout-or-duplicate"] }),
		);
		expect(await verifyTurnstileToken("tok")).toBe(false);
	});

	it("トークンが空なら siteverify を呼ばずに false", async () => {
		expect(await verifyTurnstileToken("")).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("通信失敗・タイムアウトは false（fail closed）", async () => {
		fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"));
		expect(await verifyTurnstileToken("tok")).toBe(false);
		expect(logError).toHaveBeenCalled();
	});

	it("siteverify の HTTP エラーは false（fail closed）", async () => {
		fetchMock.mockResolvedValue(jsonResponse({}, false, 503));
		expect(await verifyTurnstileToken("tok")).toBe(false);
		expect(logError).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ alert: "turnstile_siteverify_unavailable", status: 503 }),
		);
	});

	it("本番でシークレット未設定なら siteverify を呼ばずに false", async () => {
		vi.stubEnv("TURNSTILE_SECRET_KEY", "");
		expect(await verifyTurnstileToken("tok")).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(logError).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ alert: "turnstile_secret_missing" }),
		);
	});

	it("本番以外でシークレット未設定ならテスト用の鍵で検証する", async () => {
		vi.stubEnv("NODE_ENV", "development");
		vi.stubEnv("TURNSTILE_SECRET_KEY", "");
		fetchMock.mockResolvedValue(jsonResponse({ success: true }));
		expect(await verifyTurnstileToken("tok")).toBe(true);
		expect(sentBody().get("secret")).toBe(TURNSTILE_TEST_SECRET_KEY);
	});
});

describe("getTurnstileSiteKey", () => {
	it("env があればそれを返す", () => {
		expect(getTurnstileSiteKey()).toBe("real-site-key");
	});

	it("本番で未設定なら undefined（テスト用の鍵に落とさない）", () => {
		vi.stubEnv("TURNSTILE_SITE_KEY", "");
		expect(getTurnstileSiteKey()).toBeUndefined();
	});

	it("本番以外で未設定ならテスト用の鍵", () => {
		vi.stubEnv("NODE_ENV", "development");
		vi.stubEnv("TURNSTILE_SITE_KEY", "");
		expect(getTurnstileSiteKey()).toBe(TURNSTILE_TEST_SITE_KEY);
	});
});
