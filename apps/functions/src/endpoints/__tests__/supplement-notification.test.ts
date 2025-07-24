import type { Request, Response } from "@google-cloud/functions-framework";
import { describe, expect, it, vi } from "vitest";

// Mocks
vi.mock("../../../shared/logger", () => ({
	info: vi.fn(),
	error: vi.fn(),
}));

vi.mock("../../../services/dlsite/failure-tracker", () => ({
	getFailureStatistics: vi.fn(),
}));

describe("supplement-notification module", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should export expected functions", async () => {
		const module = await import("../supplement-notification");

		expect(module.supplementNotification).toBeDefined();
		expect(typeof module.supplementNotification).toBe("function");

		expect(module.weeklyHealthReport).toBeDefined();
		expect(typeof module.weeklyHealthReport).toBe("function");
	});

	it("should reject non-POST requests for supplementNotification", async () => {
		const mockRequest = {
			method: "GET",
			headers: {},
		} as Request;

		const mockResponse = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;

		const { supplementNotification } = await import("../supplement-notification");
		await supplementNotification(mockRequest, mockResponse);

		expect(mockResponse.status).toHaveBeenCalledWith(405);
		expect(mockResponse.json).toHaveBeenCalledWith({
			error: "Method not allowed",
			message: "POST method required",
		});
	});

	it("should reject invalid request body for supplementNotification", async () => {
		const mockRequest = {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: {},
		} as Request;

		const mockResponse = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;

		const { supplementNotification } = await import("../supplement-notification");
		await supplementNotification(mockRequest, mockResponse);

		expect(mockResponse.status).toHaveBeenCalledWith(400);
	});
});
