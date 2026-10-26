import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debug, error, info, LogLevel, warn } from "../logger";

const origEnv = process.env.NODE_ENV;
let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	(process.env as { NODE_ENV?: string }).NODE_ENV = origEnv;
});

const setEnv = (v: string) => {
	(process.env as { NODE_ENV?: string }).NODE_ENV = v;
};

describe("logger（開発環境: severity 別 console）", () => {
	beforeEach(() => setEnv("development"));

	it("info/debug は console.log", () => {
		info("情報");
		debug("デバッグ");
		expect(logSpy).toHaveBeenCalledTimes(2);
	});

	it("warn は console.warn、error は console.error", () => {
		warn("警告");
		error("エラー");
		expect(warnSpy).toHaveBeenCalledWith("[WARNING] 警告", expect.any(Object));
		expect(errorSpy).toHaveBeenCalledWith("[ERROR] エラー", expect.any(Object));
	});

	it("プレーンなメタデータはマージされる", () => {
		info("msg", { userId: "u1" });
		const [, rest] = logSpy.mock.calls[0] as [string, Record<string, unknown>];
		expect(rest.userId).toBe("u1");
	});
});

describe("logger（本番環境: JSON 構造化ログ）", () => {
	beforeEach(() => setEnv("production"));

	it("サーバーでは severity 付き JSON を console.log に出力", () => {
		vi.stubGlobal("window", undefined);
		error("本番エラー");
		const json = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
		expect(json.severity).toBe(LogLevel.ERROR);
		expect(json.message).toBe("本番エラー");
		expect(json.timestamp).toBeDefined();
		vi.unstubAllGlobals();
	});

	it("ブラウザでは何も出力しない", () => {
		error("本番エラー");
		warn("本番警告");
		info("本番情報");
		expect(logSpy).not.toHaveBeenCalled();
		expect(warnSpy).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();
	});
});

describe("エラーのシリアライズ", () => {
	beforeEach(() => setEnv("development"));

	it("Error を直接渡すと message/name/stack を抽出", () => {
		error("失敗", new Error("boom"));
		const [, rest] = errorSpy.mock.calls[0] as [string, Record<string, unknown>];
		expect(rest.error).toMatchObject({ message: "boom", name: "Error" });
	});

	it("{ error: Error } は serializeError 経由", () => {
		error("失敗", { error: new Error("inner") });
		const [, rest] = errorSpy.mock.calls[0] as [string, Record<string, unknown>];
		expect((rest.error as { message: string }).message).toBe("inner");
	});

	it("{ error: 独自オブジェクト } はプリミティブ値だけを残す", () => {
		error("失敗", { error: { message: "独自", code: 7, details: { a: 1 } } });
		const [, rest] = errorSpy.mock.calls[0] as [string, Record<string, unknown>];
		expect(rest.error).toEqual({ message: "独自", code: 7 });
	});
});

describe("エラーのシリアライズ（本番 JSON・SPR-383）", () => {
	beforeEach(() => {
		setEnv("production");
		vi.stubGlobal("window", undefined);
	});
	afterEach(() => vi.unstubAllGlobals());

	const lastJson = () => {
		const line = logSpy.mock.calls.at(-1)?.[0] as string;
		return { line, json: JSON.parse(line) };
	};

	it("{ error: Error } の出力に message と stack が含まれる", () => {
		error("x", { error: new Error("boom") });
		const { line, json } = lastJson();
		expect(line).toContain("boom");
		expect(json.error.message).toBe("boom");
		expect(json.error.stack).toContain("Error: boom");
	});

	it("error 以外のキーにネストした Error（cause）も展開する", () => {
		error("x", { ctx: { cause: new Error("boom") } });
		const { json } = lastJson();
		expect(json.ctx.cause.message).toBe("boom");
		expect(json.ctx.cause.stack).toContain("Error: boom");
	});

	it("Error の cause とプリミティブな独自プロパティ（code 等）を残す", () => {
		const cause = new Error("root cause");
		error("x", Object.assign(new Error("outer", { cause }), { code: 9 }));
		const { json } = lastJson();
		expect(json.error.code).toBe(9);
		expect(json.error.cause.message).toBe("root cause");
	});

	it("Error のオブジェクト値・bigint プロパティ（GaxiosError の config 等）は出力しない", () => {
		const testError = Object.assign(new Error("request failed"), {
			status: 403,
			config: { url: "https://example.test/?key=SECRET", params: { key: "SECRET" } },
			size: 1n,
		});
		error("x", { error: testError });
		const { line, json } = lastJson();
		expect(line).not.toContain("SECRET");
		expect(json.error.status).toBe(403);
		expect(json.error.config).toBeUndefined();
		expect(json.error.size).toBeUndefined();
	});

	it("payload が監視の契約キー（severity / message / timestamp）を上書きできない", () => {
		error("real message", {
			severity: "INFO",
			message: "spoofed",
			timestamp: "spoofed",
			extra: "kept",
		});
		const { json } = lastJson();
		expect(json.severity).toBe(LogLevel.ERROR);
		expect(json.message).toBe("real message");
		expect(json.timestamp).not.toBe("spoofed");
		expect(json.extra).toBe("kept");
	});

	it("呼び出し元の payload を書き換えない", () => {
		const err = new Error("boom");
		const payload = { error: err, nested: { severity: "x" } };
		error("x", payload);
		expect(payload.error).toBe(err);
		expect(payload).toEqual({ error: err, nested: { severity: "x" } });
	});

	it("Error 以外の値を直接渡すと error キーに入る", () => {
		error("x", "thrown string");
		const { json } = lastJson();
		expect(json.error).toBe("thrown string");
	});
});
