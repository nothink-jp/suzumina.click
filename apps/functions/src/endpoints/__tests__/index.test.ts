import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mocks
vi.mock("../../../shared/logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
}));

vi.mock("../youtube", () => ({
	fetchYouTubeVideos: vi.fn(),
}));

vi.mock("../dlsite-individual-info-api", () => ({
	fetchDLsiteWorksIndividualAPI: vi.fn(),
}));

vi.mock("../supplement-notification", () => ({
	supplementNotification: vi.fn(),
	weeklyHealthReport: vi.fn(),
}));

vi.mock("@google-cloud/functions-framework", () => ({
	cloudEvent: vi.fn(),
	http: vi.fn(),
}));

describe("index module", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("should export expected functions", async () => {
		// Clear module cache before importing
		vi.resetModules();

		const module = await import("../index");

		expect(module.initializeApplication).toBeDefined();
		expect(typeof module.initializeApplication).toBe("function");

		expect(module.safeExit).toBeDefined();
		expect(typeof module.safeExit).toBe("function");
	});

	it("should handle safe exit in test environment", async () => {
		process.env.NODE_ENV = "test";
		const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("Process exit called");
		});

		const { safeExit } = await import("../index");

		// In test environment, should not actually exit
		expect(() => safeExit(0)).not.toThrow();
		expect(mockExit).not.toHaveBeenCalled();

		mockExit.mockRestore();
	}, 10000);
});
