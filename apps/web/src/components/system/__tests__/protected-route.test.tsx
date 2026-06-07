import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/lib/auth/server";
import ProtectedRoute, { requireAuth } from "../protected-route";

vi.mock("@/lib/auth/server", () => ({
	getCurrentUser: vi.fn(),
}));

// next/headers の headers() を制御する
const { headersStore } = vi.hoisted(() => ({
	headersStore: { xUrl: null as string | null },
}));
vi.mock("next/headers", () => ({
	headers: vi.fn(async () => ({
		get: (key: string) => (key === "x-url" ? headersStore.xUrl : null),
	})),
}));

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
	role: "member" as const,
	...overrides,
});

describe("ProtectedRoute", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		headersStore.xUrl = null;
	});

	it("認証済み・アクティブ・権限十分なら children を描画する", async () => {
		(getCurrentUser as any).mockResolvedValue(makeUser());

		const element = await ProtectedRoute({ children: <div>secret</div> });
		const { getByText } = render(element);

		expect(getByText("secret")).toBeInTheDocument();
		expect(redirect).not.toHaveBeenCalled();
	});

	it("未認証なら fallback へ x-url を callbackUrl 付きでリダイレクトする", async () => {
		(getCurrentUser as any).mockResolvedValue(null);
		headersStore.xUrl = "/works/RJ123456";

		await expect(ProtectedRoute({ children: <div>secret</div> })).rejects.toThrow("REDIRECT:");
		expect(redirect).toHaveBeenCalledWith("/auth/signin?callbackUrl=%2Fworks%2FRJ123456");
	});

	it("未認証かつ x-url ヘッダが無い場合は /buttons/create を callbackUrl に使う", async () => {
		(getCurrentUser as any).mockResolvedValue(null);
		headersStore.xUrl = null;

		await expect(ProtectedRoute({ children: <div>x</div> })).rejects.toThrow("REDIRECT:");
		expect(redirect).toHaveBeenCalledWith("/auth/signin?callbackUrl=%2Fbuttons%2Fcreate");
	});

	it("fallbackUrl を指定するとその URL にリダイレクトする", async () => {
		(getCurrentUser as any).mockResolvedValue(null);

		await expect(ProtectedRoute({ children: <div>x</div>, fallbackUrl: "/login" })).rejects.toThrow(
			"REDIRECT:",
		);
		expect(redirect).toHaveBeenCalledWith("/login?callbackUrl=%2Fbuttons%2Fcreate");
	});

	it("非アクティブユーザーは AccessDenied にリダイレクトする", async () => {
		(getCurrentUser as any).mockResolvedValue(makeUser({ isActive: false }));

		await expect(ProtectedRoute({ children: <div>x</div> })).rejects.toThrow("REDIRECT:");
		expect(redirect).toHaveBeenCalledWith("/auth/error?error=AccessDenied");
	});

	it("権限不足（member が admin ページ）は AccessDenied にリダイレクトする", async () => {
		(getCurrentUser as any).mockResolvedValue(makeUser({ role: "member" }));

		await expect(ProtectedRoute({ children: <div>x</div>, requireRole: "admin" })).rejects.toThrow(
			"REDIRECT:",
		);
		expect(redirect).toHaveBeenCalledWith("/auth/error?error=AccessDenied");
	});

	it("上位権限（admin が moderator ページ）は許可され children を描画する", async () => {
		(getCurrentUser as any).mockResolvedValue(makeUser({ role: "admin" }));

		const element = await ProtectedRoute({
			children: <div>mod-area</div>,
			requireRole: "moderator",
		});
		const { getByText } = render(element);

		expect(getByText("mod-area")).toBeInTheDocument();
		expect(redirect).not.toHaveBeenCalled();
	});
});

describe("requireAuth", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("アクティブユーザーなら user を返す", async () => {
		const user = makeUser();
		(getCurrentUser as any).mockResolvedValue(user);

		await expect(requireAuth()).resolves.toEqual(user);
		expect(redirect).not.toHaveBeenCalled();
	});

	it("セッションが無ければ signin にリダイレクトする", async () => {
		(getCurrentUser as any).mockResolvedValue(null);

		await expect(requireAuth()).rejects.toThrow("REDIRECT:/auth/signin");
		expect(redirect).toHaveBeenCalledWith("/auth/signin");
	});

	it("非アクティブユーザーは signin にリダイレクトする", async () => {
		(getCurrentUser as any).mockResolvedValue(makeUser({ isActive: false }));

		await expect(requireAuth()).rejects.toThrow("REDIRECT:/auth/signin");
		expect(redirect).toHaveBeenCalledWith("/auth/signin");
	});
});
