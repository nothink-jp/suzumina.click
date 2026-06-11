import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as logger from "../logger";
import { LogLevel } from "../logger";

describe("logger", () => {
	let originalConsoleLog: typeof console.log;
	let mockConsoleLog: ReturnType<typeof vi.fn>;
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		// console.logをモック
		originalConsoleLog = console.log;
		mockConsoleLog = vi.fn();
		console.log = mockConsoleLog as typeof console.log;

		// 環境変数をバックアップ
		originalEnv = { ...process.env };
	});

	afterEach(() => {
		// console.logを復元
		console.log = originalConsoleLog;
		// 環境変数を復元
		process.env = originalEnv;
		vi.clearAllMocks();
	});

	describe("Basic functionality", () => {
		it("ロガー関数が存在すること", () => {
			expect(logger.info).toBeDefined();
			expect(logger.warn).toBeDefined();
			expect(logger.error).toBeDefined();
			expect(logger.debug).toBeDefined();
		});

		it("ログ関数が呼び出し可能であること", () => {
			expect(() => logger.info("test")).not.toThrow();
			expect(() => logger.warn("test")).not.toThrow();
			expect(() => logger.error("test")).not.toThrow();
			expect(() => logger.debug("test")).not.toThrow();
		});

		it("エラーオブジェクトを渡してもエラーにならないこと", () => {
			const testError = new Error("test error");
			expect(() => logger.error("test message", testError)).not.toThrow();
		});

		it("メタデータオプションを渡してもエラーにならないこと", () => {
			const metadata = { userId: "test123", action: "test" };
			expect(() => logger.info("test message", metadata)).not.toThrow();
		});
	});

	describe("LogLevel enum", () => {
		it("should have correct log level values", () => {
			expect(LogLevel.DEBUG).toBe("DEBUG");
			expect(LogLevel.INFO).toBe("INFO");
			expect(LogLevel.WARN).toBe("WARNING");
			expect(LogLevel.ERROR).toBe("ERROR");
		});
	});

	describe("Structured logging (default format)", () => {
		beforeEach(() => {
			// デフォルト形式（構造化ログ）を確保
			delete process.env.LOG_FORMAT;
		});

		it("should output structured JSON logs by default", () => {
			logger.info("test message");

			expect(mockConsoleLog).toHaveBeenCalledTimes(1);
			const logOutput = mockConsoleLog.mock.calls[0]![0];

			// JSONパース可能であることを確認
			const parsed = JSON.parse(logOutput);
			expect(parsed.severity).toBe("INFO");
			expect(parsed.message).toBe("test message");
		});

		it("should include Cloud Functions environment labels when available", () => {
			process.env.K_SERVICE = "test-service";
			process.env.K_REVISION = "test-revision";
			process.env.K_CONFIGURATION = "test-config";

			logger.info("test message");

			const logOutput = mockConsoleLog.mock.calls[0]![0];
			const parsed = JSON.parse(logOutput);

			expect(parsed["logging.googleapis.com/labels"]).toEqual({
				service: "test-service",
				revision: "test-revision",
				configuration: "test-config",
			});
		});

		it("should handle partial Cloud Functions environment", () => {
			process.env.K_SERVICE = "test-service";
			// K_REVISIONとK_CONFIGURATIONは設定しない

			logger.info("test message");

			const logOutput = mockConsoleLog.mock.calls[0]![0];
			const parsed = JSON.parse(logOutput);

			expect(parsed["logging.googleapis.com/labels"]).toEqual({
				service: "test-service",
			});
		});

		it("should not include labels when K_SERVICE is not set", () => {
			logger.info("test message");

			const logOutput = mockConsoleLog.mock.calls[0]![0];
			const parsed = JSON.parse(logOutput);

			expect(parsed["logging.googleapis.com/labels"]).toBeUndefined();
		});

		it("should handle Error objects in structured logs", () => {
			const testError = new Error("test error");
			testError.stack = "Error: test error\n    at test location";

			logger.error("test message", testError);

			const logOutput = mockConsoleLog.mock.calls[0]![0];
			const parsed = JSON.parse(logOutput);

			expect(parsed.severity).toBe("ERROR");
			expect(parsed.message).toBe("test message");
			expect(parsed.error).toEqual({
				message: "test error",
				name: "Error",
				stack: "Error: test error\n    at test location",
			});
		});

		it("should merge additional options into log entry", () => {
			const options = {
				userId: "user123",
				action: "login",
				timestamp: 1234567890,
			};

			logger.info("test message", options);

			const logOutput = mockConsoleLog.mock.calls[0]![0];
			const parsed = JSON.parse(logOutput);

			expect(parsed.severity).toBe("INFO");
			expect(parsed.message).toBe("test message");
			expect(parsed.userId).toBe("user123");
			expect(parsed.action).toBe("login");
			expect(parsed.timestamp).toBe(1234567890);
		});
	});

	describe("Console format", () => {
		beforeEach(() => {
			process.env.LOG_FORMAT = "console";
		});

		it("should output human-readable console format when LOG_FORMAT=console", () => {
			logger.info("test message");

			expect(mockConsoleLog).toHaveBeenCalledTimes(1);
			const logOutput = mockConsoleLog.mock.calls[0]![0];

			// タイムスタンプ、アイコン、レベル、メッセージが含まれることを確認
			expect(logOutput).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z ℹ️ INFO test message/);
		});

		it("should include error details in console format", () => {
			const testError = new Error("test error");
			testError.stack = "Error: test error\n    at test location";

			logger.error("test message", testError);

			const logOutput = mockConsoleLog.mock.calls[0]![0];

			expect(logOutput).toContain("❌ ERROR test message");
			expect(logOutput).toContain("Error: test error");
			expect(logOutput).toContain("Stack: Error: test error");
		});

		it("should format object data in console format", () => {
			const data = { userId: "user123", count: 42 };

			logger.info("test message", data);

			const logOutput = mockConsoleLog.mock.calls[0]![0];

			expect(logOutput).toContain("ℹ️ INFO test message");
			expect(logOutput).toContain("Data:");
			expect(logOutput).toContain('"userId": "user123"');
			expect(logOutput).toContain('"count": 42');
		});

		it("should use correct icons for each log level", () => {
			logger.debug("debug message");
			logger.info("info message");
			logger.warn("warn message");
			logger.error("error message");

			expect(mockConsoleLog.mock.calls[0]![0]).toContain("🔍 DEBUG");
			expect(mockConsoleLog.mock.calls[1]![0]).toContain("ℹ️ INFO");
			expect(mockConsoleLog.mock.calls[2]![0]).toContain("⚠️ WARNING");
			expect(mockConsoleLog.mock.calls[3]![0]).toContain("❌ ERROR");
		});
	});

	describe("All log levels", () => {
		it("should output debug logs with correct severity", () => {
			logger.debug("debug message");

			const logOutput = mockConsoleLog.mock.calls[0]![0];
			const parsed = JSON.parse(logOutput);

			expect(parsed.severity).toBe("DEBUG");
			expect(parsed.message).toBe("debug message");
		});

		it("should output info logs with correct severity", () => {
			logger.info("info message");

			const logOutput = mockConsoleLog.mock.calls[0]![0];
			const parsed = JSON.parse(logOutput);

			expect(parsed.severity).toBe("INFO");
			expect(parsed.message).toBe("info message");
		});

		it("should output warn logs with correct severity", () => {
			logger.warn("warn message");

			const logOutput = mockConsoleLog.mock.calls[0]![0];
			const parsed = JSON.parse(logOutput);

			expect(parsed.severity).toBe("WARNING");
			expect(parsed.message).toBe("warn message");
		});

		it("should output error logs with correct severity", () => {
			logger.error("error message");

			const logOutput = mockConsoleLog.mock.calls[0]![0];
			const parsed = JSON.parse(logOutput);

			expect(parsed.severity).toBe("ERROR");
			expect(parsed.message).toBe("error message");
		});
	});

	describe("Edge cases", () => {
		it("should handle null options", () => {
			expect(() => logger.info("test", null as never)).not.toThrow();

			const logOutput = mockConsoleLog.mock.calls[0]![0];
			const parsed = JSON.parse(logOutput);

			expect(parsed.message).toBe("test");
		});

		it("should handle undefined options", () => {
			expect(() => logger.info("test", undefined)).not.toThrow();

			const logOutput = mockConsoleLog.mock.calls[0]![0];
			const parsed = JSON.parse(logOutput);

			expect(parsed.message).toBe("test");
		});

		it("should handle empty object options", () => {
			logger.info("test", {});

			const logOutput = mockConsoleLog.mock.calls[0]![0];
			const parsed = JSON.parse(logOutput);

			expect(parsed.message).toBe("test");
		});

		it("should handle Error without stack trace", () => {
			const testError = new Error("test error");
			delete testError.stack;

			logger.error("test message", testError);

			const logOutput = mockConsoleLog.mock.calls[0]![0];
			const parsed = JSON.parse(logOutput);

			expect(parsed.error.message).toBe("test error");
			expect(parsed.error.stack).toBeUndefined();
		});

		it("should handle complex nested objects", () => {
			const complexData = {
				user: {
					id: 123,
					name: "Test User",
					preferences: {
						theme: "dark",
						notifications: true,
					},
				},
				metadata: {
					timestamp: new Date("2023-01-01"),
					source: "test",
				},
			};

			logger.info("complex data", complexData);

			const logOutput = mockConsoleLog.mock.calls[0]![0];
			const parsed = JSON.parse(logOutput);

			expect(parsed.user.id).toBe(123);
			expect(parsed.user.preferences.theme).toBe("dark");
			expect(parsed.metadata.source).toBe("test");
		});
	});
});
