import { describe, expect, it } from "vitest";

describe("Package Index", () => {
	it("should export main modules", async () => {
		const index = await import("./index.js");

		// Check that main exports are available
		expect(index).toBeDefined();
		expect(typeof index).toBe("object");

		// This test ensures the index file can be imported without errors
		// More specific tests are in individual module test files
	});

	it("should not throw on import", async () => {
		await expect(import("./index.js")).resolves.toBeDefined();
	});
});
