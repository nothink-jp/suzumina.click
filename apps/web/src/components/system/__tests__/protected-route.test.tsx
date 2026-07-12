import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockCurrentUser } from "@/test-utils/auth-server";
import ProtectedRoute, { requireAuth } from "../protected-route";

vi.mock("@/lib/auth/server");

// Next の redirect は実装上 throw して以降の処理を止める。テストでも同じ挙動にする。
vi.mock("next/navigation", () => ({
	redirect: vi.fn((url: string) => {
		throw new Error(`REDIRECT:${url}`);
	}),
}));

import { redirect } from "next/navigation";

const makeUser = (overrides: Record<string, unknown> = {}) => ({
	discordId: "user-1",
	isActive: true,
	...overrides,
});

describe("ProtectedRoute", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("認証済み・アクティブ・権限十分なら children を描画する", async () => {
		mockCurrentUser(makeUser());

		const element = await ProtectedRoute({ children: <div>secret</div> });
		const { getByText } = render(element);

		expect(getByText("secret")).toBeInTheDocument();
		expect(redirect).not.toHaveBeenCalled();
	});

	it("未認証なら呼び出し元が渡した callbackPath を callbackUrl に付与してリダイレクトする", async () => {
		mockCurrentUser(null);

		await expect(
			ProtectedRoute({ children: <div>secret</div>, callbackPath: "/works/RJ123456" }),
		).rejects.toThrow("REDIRECT:");
		expect(redirect).toHaveBeenCalledWith("/auth/signin?callbackUrl=%2Fworks%2FRJ123456");
	});

	it("未認証かつ callbackPath 未指定なら callbackUrl 無しでリダイレクトする", async () => {
		mockCurrentUser(null);

		await expect(ProtectedRoute({ children: <div>x</div> })).rejects.toThrow("REDIRECT:");
		expect(redirect).toHaveBeenCalledWith("/auth/signin");
	});

	it("fallbackUrl を指定するとその URL にリダイレクトする", async () => {
		mockCurrentUser(null);

		await expect(
			ProtectedRoute({
				children: <div>x</div>,
				fallbackUrl: "/login",
				callbackPath: "/buttons/create",
			}),
		).rejects.toThrow("REDIRECT:");
		expect(redirect).toHaveBeenCalledWith("/login?callbackUrl=%2Fbuttons%2Fcreate");
	});

	it("無効アカウントは AccountDisabled エラーページにリダイレクトする", async () => {
		mockCurrentUser(makeUser({ isActive: false }));

		await expect(ProtectedRoute({ children: <div>x</div> })).rejects.toThrow("REDIRECT:");
		expect(redirect).toHaveBeenCalledWith("/auth/error?error=AccountDisabled");
	});
});

describe("requireAuth", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("アクティブユーザーなら user を返す", async () => {
		const user = makeUser();
		mockCurrentUser(user);

		await expect(requireAuth()).resolves.toEqual(user);
		expect(redirect).not.toHaveBeenCalled();
	});

	it("セッションが無ければ signin にリダイレクトする", async () => {
		mockCurrentUser(null);

		await expect(requireAuth()).rejects.toThrow("REDIRECT:/auth/signin");
		expect(redirect).toHaveBeenCalledWith("/auth/signin");
	});

	it("無効アカウントは AccountDisabled エラーページにリダイレクトする", async () => {
		mockCurrentUser(makeUser({ isActive: false }));

		await expect(requireAuth()).rejects.toThrow("REDIRECT:");
		expect(redirect).toHaveBeenCalledWith("/auth/error?error=AccountDisabled");
	});
});
