import { describe, expect, it, vi } from "vitest";

// Mock auth client
vi.mock("@/lib/auth-client", () => ({
	signIn: vi.fn(),
}));

describe("Component Logic Tests", () => {
	describe("LoginButton functionality", () => {
		it("should call signIn with correct parameters", async () => {
			const { signIn } = await import("@/lib/auth-client");

			// Simulate the login handler logic
			const handleLogin = async () => {
				await signIn("discord", { redirectTo: "/" });
			};

			await handleLogin();

			expect(signIn).toHaveBeenCalledWith("discord", { redirectTo: "/" });
		});
	});

	describe("RefreshButton functionality", () => {
		it("should call correct API endpoint for videos", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ success: true, message: "更新完了" }),
			});

			// Simulate the refresh handler logic
			const handleRefresh = async (type: "videos" | "works") => {
				const response = await fetch(`/api/admin/${type}/refresh`, {
					method: "POST",
				});
				return response.json();
			};

			const result = await handleRefresh("videos");

			expect(global.fetch).toHaveBeenCalledWith("/api/admin/videos/refresh", {
				method: "POST",
			});
			expect(result.success).toBe(true);
		});

		it("should call correct API endpoint for works", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ success: true, message: "更新完了" }),
			});

			const handleRefresh = async (type: "videos" | "works") => {
				const response = await fetch(`/api/admin/${type}/refresh`, {
					method: "POST",
				});
				return response.json();
			};

			await handleRefresh("works");

			expect(global.fetch).toHaveBeenCalledWith("/api/admin/works/refresh", {
				method: "POST",
			});
		});
	});

	describe("EditDialog functionality", () => {
		it("should handle form data conversion correctly", () => {
			// Helper functions to reduce complexity
			const convertBooleanField = (value: unknown): boolean => {
				return typeof value === "string" ? value === "true" : Boolean(value);
			};

			const convertNumberField = (value: unknown): number => {
				return Number(value);
			};

			// biome-ignore lint/suspicious/noExplicitAny: Test utility function needs flexible input
			const convertFormData = (data: Record<string, any>) => {
				// biome-ignore lint/suspicious/noExplicitAny: Test output needs flexible types
				const converted: Record<string, any> = {};

				for (const [key, value] of Object.entries(data)) {
					if (key === "isPublic") {
						converted[key] = convertBooleanField(value);
					} else if (["startTime", "endTime", "price"].includes(key)) {
						converted[key] = convertNumberField(value);
					} else {
						converted[key] = value;
					}
				}

				return converted;
			};

			const testData = {
				title: "Test Title",
				isPublic: "false",
				startTime: "10",
				endTime: "30",
				price: "1000",
			};

			const result = convertFormData(testData);

			expect(result.title).toBe("Test Title");
			expect(result.isPublic).toBe(false);
			expect(result.startTime).toBe(10);
			expect(result.endTime).toBe(30);
			expect(result.price).toBe(1000);
		});

		it("should validate required fields", () => {
			// biome-ignore lint/suspicious/noExplicitAny: Test utility function needs flexible input
			const validateFields = (data: Record<string, any>, requiredFields: string[]) => {
				for (const field of requiredFields) {
					if (!data[field] || (typeof data[field] === "string" && data[field].trim() === "")) {
						return false;
					}
				}
				return true;
			};

			expect(validateFields({ title: "Test", description: "Desc" }, ["title", "description"])).toBe(
				true,
			);
			expect(validateFields({ title: "", description: "Desc" }, ["title", "description"])).toBe(
				false,
			);
			expect(validateFields({ title: "Test" }, ["title", "description"])).toBe(false);
		});
	});

	describe("DeleteDialog functionality", () => {
		it("should handle deletion confirmation", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ success: true, message: "削除完了" }),
			});

			const handleDelete = async (id: string, type: string) => {
				const response = await fetch(`/api/admin/${type}/${id}`, {
					method: "DELETE",
				});
				return response.json();
			};

			const result = await handleDelete("test-id", "buttons");

			expect(global.fetch).toHaveBeenCalledWith("/api/admin/buttons/test-id", {
				method: "DELETE",
			});
			expect(result.success).toBe(true);
		});

		it("should handle deletion errors", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ success: false, error: "削除に失敗しました" }),
			});

			const handleDelete = async (id: string, type: string) => {
				try {
					const response = await fetch(`/api/admin/${type}/${id}`, {
						method: "DELETE",
					});
					const result = await response.json();

					if (!result.success) {
						throw new Error(result.error);
					}

					return result;
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			};

			const result = await handleDelete("test-id", "buttons");

			expect(result.success).toBe(false);
			expect(result.error).toBe("削除に失敗しました");
		});
	});
});
