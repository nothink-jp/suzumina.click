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

	it("認証されていないユーザーはサインインページにリダイレクトされる", async () => {
		(auth as Mock).mockResolvedValue(null);

		await AdminLayout({ children: <div>Test Content</div> });

		expect(redirect).toHaveBeenCalledWith("/auth/signin");
		expect(notFound).not.toHaveBeenCalled();
	});

	it("セッションはあるがユーザーが存在しない場合はサインインページにリダイレクトされる", async () => {
		(auth as Mock).mockResolvedValue({ user: null });

		await AdminLayout({ children: <div>Test Content</div> });

		expect(redirect).toHaveBeenCalledWith("/auth/signin");
		expect(notFound).not.toHaveBeenCalled();
	});

	it("管理者以外のユーザーは404エラーが返される", async () => {
		(auth as Mock).mockResolvedValue({
			user: {
				id: "user-1",
				name: "Test User",
				role: "member",
			},
		});

		await AdminLayout({ children: <div>Test Content</div> });

		expect(notFound).toHaveBeenCalled();
		expect(redirect).not.toHaveBeenCalled();
	});

	it("モデレーターユーザーも404エラーが返される", async () => {
		(auth as Mock).mockResolvedValue({
			user: {
				id: "user-2",
				name: "Moderator User",
				role: "moderator",
			},
		});

		await AdminLayout({ children: <div>Test Content</div> });

		expect(notFound).toHaveBeenCalled();
		expect(redirect).not.toHaveBeenCalled();
	});

	it("管理者ユーザーはアクセスが許可される", async () => {
		(auth as Mock).mockResolvedValue({
			user: {
				id: "admin-1",
				name: "Admin User",
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
				name: "Admin User",
				role: "admin",
			},
		});

		const result = await AdminLayout({ children: <div>Test Content</div> });

		// JSX要素の構造をテスト（簡単な確認）
		expect(result).toBeDefined();
		expect(result.type).toBe("div");
	});
});
