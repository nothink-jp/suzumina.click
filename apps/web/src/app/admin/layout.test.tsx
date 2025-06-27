import { notFound, redirect } from "next/navigation";
import { describe, expect, it, type Mock, vi } from "vitest";
import AdminLayout from "./layout";

// モック関数を設定
vi.mock("next/navigation", () => ({
	redirect: vi.fn(),
	notFound: vi.fn(),
}));

vi.mock("@/auth", () => ({
	auth: vi.fn(),
}));

import { auth } from "@/auth";

describe("AdminLayout", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("認証されていないユーザーはホームページにリダイレクトされる", async () => {
		(auth as Mock).mockResolvedValue(null);

		await AdminLayout({ children: <div>Test Content</div> });

		expect(redirect).toHaveBeenCalledWith("/");
		expect(notFound).not.toHaveBeenCalled();
	});

	it("セッションはあるがユーザーが存在しない場合はホームページにリダイレクトされる", async () => {
		(auth as Mock).mockResolvedValue({ user: null });

		await AdminLayout({ children: <div>Test Content</div> });

		expect(redirect).toHaveBeenCalledWith("/");
		expect(notFound).not.toHaveBeenCalled();
	});

	it("管理者以外のユーザーはホームページにリダイレクトされる", async () => {
		(auth as Mock).mockResolvedValue({
			user: {
				id: "user-1",
				username: "Test User",
				discordId: "123456789",
				role: "member",
			},
		});

		await AdminLayout({ children: <div>Test Content</div> });

		expect(redirect).toHaveBeenCalledWith("/");
		expect(notFound).not.toHaveBeenCalled();
	});

	it("モデレーターユーザーもホームページにリダイレクトされる", async () => {
		(auth as Mock).mockResolvedValue({
			user: {
				id: "user-2",
				username: "Moderator User",
				discordId: "987654321",
				role: "moderator",
			},
		});

		await AdminLayout({ children: <div>Test Content</div> });

		expect(redirect).toHaveBeenCalledWith("/");
		expect(notFound).not.toHaveBeenCalled();
	});

	it("管理者ユーザーはアクセスが許可される", async () => {
		(auth as Mock).mockResolvedValue({
			user: {
				id: "admin-1",
				username: "Admin User",
				discordId: "111222333",
				role: "admin",
			},
		});

		const result = await AdminLayout({ children: <div>Test Content</div> });

		expect(redirect).not.toHaveBeenCalled();
		expect(notFound).not.toHaveBeenCalled();

		// JSX要素が返されることを確認
		expect(result).toBeDefined();
	});

	it("管理者ユーザーには管理画面のナビゲーションが表示される", async () => {
		(auth as Mock).mockResolvedValue({
			user: {
				id: "admin-1",
				username: "Admin User",
				discordId: "111222333",
				role: "admin",
			},
		});

		const result = await AdminLayout({ children: <div>Test Content</div> });

		// JSX要素の構造をテスト（簡単な確認）
		expect(result).toBeDefined();
		expect(result.type).toBe("div");
	});
});
