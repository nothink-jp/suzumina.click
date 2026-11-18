/**
 * Cloud Run Jobs 用の入口のテスト（SPR-415）
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRunUnified = vi.fn();
const mockRunIntegrity = vi.fn();

vi.mock("../../endpoints/dlsite/fetch-dlsite-unified-data", () => ({
	WEEKLY_FULL_SWEEP_MODE: "weekly_full_sweep",
	runUnifiedDataCollectionWithReport: (...args: unknown[]) => mockRunUnified(...args),
}));

vi.mock("../../endpoints/data-integrity/check-data-integrity", () => ({
	runIntegrityCheckWithReport: (...args: unknown[]) => mockRunIntegrity(...args),
}));

vi.mock("../../shared/logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
}));

vi.mock("../../shared/memory-diagnostics", () => ({
	logRuntimeMemoryLimits: vi.fn(),
}));

const logger = await import("../../shared/logger");
const { main, runJob } = await import("../run-job");

describe("run-job", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.CLOUD_RUN_JOB = "test-job";
		process.env.CLOUD_RUN_EXECUTION = "test-job-xyz";
		mockRunUnified.mockResolvedValue(true);
		mockRunIntegrity.mockResolvedValue(undefined);
	});

	describe("runJob", () => {
		it("dlsite は通常の取り込みとして走らせ、起動元にジョブの情報を載せる", async () => {
			await expect(runJob("dlsite")).resolves.toBe(true);

			// mode は Scheduler が Functions へ渡しているペイロードと同じ文字列（開始ログの形を変えない）
			expect(mockRunUnified).toHaveBeenCalledWith({
				mode: "individual_info_api_unified",
				trigger: { jobMode: "dlsite", job: "test-job", execution: "test-job-xyz" },
			});
			expect(mockRunIntegrity).not.toHaveBeenCalled();
		});

		it("dlsite-full-sweep は週次フルスイープとして走らせる", async () => {
			await runJob("dlsite-full-sweep");

			expect(mockRunUnified).toHaveBeenCalledWith(
				expect.objectContaining({ mode: "weekly_full_sweep" }),
			);
		});

		it("integrity は整合性チェックを走らせる", async () => {
			await expect(runJob("integrity")).resolves.toBe(true);

			expect(mockRunIntegrity).toHaveBeenCalledWith({
				jobMode: "integrity",
				job: "test-job",
				execution: "test-job-xyz",
			});
			expect(mockRunUnified).not.toHaveBeenCalled();
		});
	});

	describe("main（終了コード）", () => {
		it("成功したら 0", async () => {
			await expect(main(["dlsite"])).resolves.toBe(0);
		});

		it("取り込みが失敗を返したら 1（Jobs は終了コードで実行の成否を決める）", async () => {
			mockRunUnified.mockResolvedValue(false);

			await expect(main(["dlsite"])).resolves.toBe(1);
		});

		it("整合性チェックが例外を投げたら 1 で、ログに残す", async () => {
			const error = new Error("boom");
			mockRunIntegrity.mockRejectedValue(error);

			await expect(main(["integrity"])).resolves.toBe(1);
			expect(logger.error).toHaveBeenCalledWith("ジョブが失敗しました", {
				jobMode: "integrity",
				error,
			});
		});

		it.each([[[]], [["youtube"]], [["DLSITE"]]])(
			"モードが不正（%j）なら何も走らせずに 2",
			async (args) => {
				await expect(main(args)).resolves.toBe(2);

				expect(mockRunUnified).not.toHaveBeenCalled();
				expect(mockRunIntegrity).not.toHaveBeenCalled();
				expect(logger.error).toHaveBeenCalledWith(
					"ジョブのモードが不正です",
					expect.objectContaining({ validModes: ["dlsite", "dlsite-full-sweep", "integrity"] }),
				);
			},
		);
	});
});
