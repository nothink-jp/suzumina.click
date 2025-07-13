import { describe, expect, it } from "vitest";
import type { ActionResult, UpdateButtonData } from "../button-actions";

describe("Button Actions Types", () => {
	it("should have correct UpdateButtonData interface", () => {
		const data: UpdateButtonData = {
			title: "Test Title",
			startTime: 10,
			endTime: 20,
			isPublic: true,
		};

		expect(data.title).toBe("Test Title");
		expect(data.startTime).toBe(10);
		expect(data.endTime).toBe(20);
		expect(data.isPublic).toBe(true);
	});

	it("should have correct ActionResult interface", () => {
		const successResult: ActionResult = {
			success: true,
			message: "Success message",
		};

		const errorResult: ActionResult = {
			success: false,
			message: "Error message",
			error: "Error details",
		};

		expect(successResult.success).toBe(true);
		expect(successResult.message).toBe("Success message");
		expect(errorResult.success).toBe(false);
		expect(errorResult.error).toBe("Error details");
	});

	it("should handle partial UpdateButtonData", () => {
		const partialData: UpdateButtonData = {
			title: "Only title",
		};

		expect(partialData.title).toBe("Only title");
		expect(partialData.startTime).toBeUndefined();
		expect(partialData.endTime).toBeUndefined();
		expect(partialData.isPublic).toBeUndefined();
	});
});
