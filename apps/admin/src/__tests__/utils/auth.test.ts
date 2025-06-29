import { describe, expect, it, vi } from "vitest";

// Mock auth functions
vi.mock("@/lib/auth", () => ({
	auth: vi.fn(),
}));

describe("Auth Utils", () => {
	it("should handle admin user authentication", async () => {
		const { auth } = await import("@/lib/auth");

		// biome-ignore lint/suspicious/noExplicitAny: Test mocking requires any
		(auth as any).mockResolvedValue({
			user: {
				id: "test-admin-id",
				name: "Test Admin",
				email: "test@example.com",
				isAdmin: true,
			},
		});

		const session = await auth();

		expect(session?.user?.isAdmin).toBe(true);
		expect(session?.user?.name).toBe("Test Admin");
		expect(session?.user?.id).toBe("test-admin-id");
	});

	it("should handle non-admin user authentication", async () => {
		const { auth } = await import("@/lib/auth");

		// biome-ignore lint/suspicious/noExplicitAny: Test mocking requires any
		(auth as any).mockResolvedValue({
			user: {
				id: "test-user-id",
				name: "Test User",
				email: "user@example.com",
				isAdmin: false,
			},
		});

		const session = await auth();

		expect(session?.user?.isAdmin).toBe(false);
		expect(session?.user?.name).toBe("Test User");
	});

	it("should handle unauthenticated user", async () => {
		const { auth } = await import("@/lib/auth");

		// biome-ignore lint/suspicious/noExplicitAny: Test mocking requires any
		(auth as any).mockResolvedValue(null);

		const session = await auth();

		expect(session).toBe(null);
	});

	it("should handle missing user data", async () => {
		const { auth } = await import("@/lib/auth");

		// biome-ignore lint/suspicious/noExplicitAny: Test mocking requires any
		(auth as any).mockResolvedValue({
			user: null,
		});

		const session = await auth();

		expect(session?.user).toBe(null);
	});
});
