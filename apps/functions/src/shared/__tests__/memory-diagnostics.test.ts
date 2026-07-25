import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../logger", () => ({
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
}));

const { logRunMemoryUsage, logRuntimeMemoryLimits, resetRunCountForTest } = await import(
	"../memory-diagnostics"
);
const logger = await import("../logger");

describe("memory-diagnostics", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetRunCountForTest();
		process.env.FUNCTION_TARGET = "fetchYouTubeVideos";
	});

	describe("logRuntimeMemoryLimits", () => {
		it("V8のヒープ上限と容器の制約を数値（MB）で出力する", () => {
			logRuntimeMemoryLimits();

			expect(logger.info).toHaveBeenCalledWith(
				"Node.js runtime memory limits",
				expect.objectContaining({
					metric_type: "runtime_memory_limits",
					function_target: "fetchYouTubeVideos",
				}),
			);

			const payload = vi.mocked(logger.info).mock.calls[0]?.[1] as Record<string, unknown>;
			// log-basedメトリクスで数値比較する契約のため、文字列化して出さない
			expect(typeof payload.heap_size_limit_mb).toBe("number");
			expect(payload.heap_size_limit_mb).toBeGreaterThan(0);
			expect(typeof payload.constrained_memory_mb).toBe("number");
			expect(typeof payload.available_memory_mb).toBe("number");
		});

		it("FUNCTION_TARGET未設定でも落ちずにunknownを出す", () => {
			delete process.env.FUNCTION_TARGET;

			logRuntimeMemoryLimits();

			expect(logger.info).toHaveBeenCalledWith(
				"Node.js runtime memory limits",
				expect.objectContaining({ function_target: "unknown" }),
			);
		});
	});

	describe("logRunMemoryUsage", () => {
		it("run毎のメモリ使用量とモードを出力する", () => {
			logRunMemoryUsage("fast_recheck");

			const payload = vi.mocked(logger.info).mock.calls[0]?.[1] as Record<string, unknown>;
			expect(vi.mocked(logger.info).mock.calls[0]?.[0]).toBe("Run memory usage");
			expect(payload.metric_type).toBe("run_memory_usage");
			expect(payload.mode).toBe("fast_recheck");
			expect(typeof payload.rss_mb).toBe("number");
			expect(payload.rss_mb).toBeGreaterThan(0);
			expect(typeof payload.heap_used_mb).toBe("number");
			expect(typeof payload.heap_total_mb).toBe("number");
			expect(typeof payload.external_mb).toBe("number");
			expect(typeof payload.array_buffers_mb).toBe("number");
			expect(typeof payload.uptime_sec).toBe("number");
		});

		it("run_indexがインスタンス内で単調増加する（増加をrun回数で回帰するための軸）", () => {
			logRunMemoryUsage("normal");
			logRunMemoryUsage("normal");
			logRunMemoryUsage("weekly_full_sweep");

			const runIndexes = vi
				.mocked(logger.info)
				.mock.calls.map((call) => (call[1] as Record<string, unknown>).run_index);

			expect(runIndexes).toEqual([1, 2, 3]);
		});
	});
});
