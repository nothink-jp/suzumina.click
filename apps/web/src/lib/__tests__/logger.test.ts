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

	it("severity 付き JSON を console.log に出力", () => {
		error("本番エラー");
		const json = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
		expect(json.severity).toBe(LogLevel.ERROR);
		expect(json.message).toBe("本番エラー");
		expect(json.timestamp).toBeDefined();
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

	it("{ error: 独自オブジェクト } は message/code/details を抽出", () => {
		error("失敗", { error: { message: "独自", code: "E_X", details: { a: 1 } } });
		const [, rest] = errorSpy.mock.calls[0] as [string, Record<string, unknown>];
		expect(rest.error).toMatchObject({ message: "独自", code: "E_X", details: { a: 1 } });
	});

	it("{ error: message なしオブジェクト } は既定値", () => {
		error("失敗", { error: { foo: "bar" } });
		const [, rest] = errorSpy.mock.calls[0] as [string, Record<string, unknown>];
		expect(rest.error).toMatchObject({ message: "Unknown error", code: "UNKNOWN" });
	});
});
