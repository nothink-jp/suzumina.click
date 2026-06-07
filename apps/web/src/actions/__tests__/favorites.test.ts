import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	addFavoriteAction,
	getFavoriteStatusAction,
	getFavoritesStatusAction,
	removeFavoriteAction,
	toggleFavoriteAction,
} from "../favorites";

vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/favorites-firestore", () => ({
	addFavorite: vi.fn(),
	removeFavorite: vi.fn(),
	toggleFavorite: vi.fn(),
	getFavoriteStatus: vi.fn(),
	getFavoritesStatus: vi.fn(),
}));

const getCurrentUser = vi.mocked(await import("@/lib/auth/server")).getCurrentUser;
const fs = vi.mocked(await import("@/lib/favorites-firestore"));

const login = () => getCurrentUser.mockResolvedValue({ discordId: "u1" } as never);
const logout = () => getCurrentUser.mockResolvedValue(null as never);

beforeEach(() => {
	vi.clearAllMocks();
});

describe("addFavoriteAction", () => {
	it("未ログインはエラー", async () => {
		logout();
		expect(await addFavoriteAction({ audioButtonId: "a" })).toEqual({
			success: false,
			error: "ログインが必要です",
		});
		expect(fs.addFavorite).not.toHaveBeenCalled();
	});

	it("ログイン時は addFavorite に委譲", async () => {
		login();
		fs.addFavorite.mockResolvedValue({ success: true } as never);
		const r = await addFavoriteAction({ audioButtonId: "a" });
		expect(r).toEqual({ success: true });
		expect(fs.addFavorite).toHaveBeenCalledWith("u1", { audioButtonId: "a" });
	});

	it("例外は catch してエラーメッセージを返す", async () => {
		login();
		fs.addFavorite.mockRejectedValue(new Error("boom"));
		expect(await addFavoriteAction({ audioButtonId: "a" })).toEqual({
			success: false,
			error: "boom",
		});
	});
});

describe("removeFavoriteAction", () => {
	it("未ログインはエラー", async () => {
		logout();
		expect((await removeFavoriteAction({ audioButtonId: "a" })).success).toBe(false);
	});

	it("ログイン時は removeFavorite に委譲", async () => {
		login();
		fs.removeFavorite.mockResolvedValue({ success: true } as never);
		expect(await removeFavoriteAction({ audioButtonId: "a" })).toEqual({ success: true });
	});

	it("例外は catch してエラーメッセージを返す", async () => {
		login();
		fs.removeFavorite.mockRejectedValue(new Error("boom"));
		expect(await removeFavoriteAction({ audioButtonId: "a" })).toEqual({
			success: false,
			error: "boom",
		});
	});
});

describe("toggleFavoriteAction", () => {
	it("ログイン時は isFavorited を返す", async () => {
		login();
		fs.toggleFavorite.mockResolvedValue({ isFavorited: true } as never);
		expect(await toggleFavoriteAction("a")).toEqual({ success: true, isFavorited: true });
	});

	it("未ログインはエラー", async () => {
		logout();
		expect((await toggleFavoriteAction("a")).success).toBe(false);
	});

	it("例外は catch する", async () => {
		login();
		fs.toggleFavorite.mockRejectedValue(new Error("x"));
		expect((await toggleFavoriteAction("a")).success).toBe(false);
	});
});

describe("getFavoriteStatusAction", () => {
	it("未ログイン/例外時は isFavorited:false", async () => {
		logout();
		expect(await getFavoriteStatusAction("a")).toEqual({ isFavorited: false });
		login();
		fs.getFavoriteStatus.mockRejectedValue(new Error("x"));
		expect(await getFavoriteStatusAction("a")).toEqual({ isFavorited: false });
	});

	it("ログイン時は取得結果を返す", async () => {
		login();
		fs.getFavoriteStatus.mockResolvedValue({ isFavorited: true } as never);
		expect(await getFavoriteStatusAction("a")).toEqual({ isFavorited: true });
	});
});

describe("getFavoritesStatusAction", () => {
	it("未ログイン時は全て false の Map", async () => {
		logout();
		const map = await getFavoritesStatusAction(["a", "b"]);
		expect(map.get("a")).toBe(false);
		expect(map.get("b")).toBe(false);
	});

	it("ログイン時は委譲結果を返す", async () => {
		login();
		const expected = new Map([["a", true]]);
		fs.getFavoritesStatus.mockResolvedValue(expected as never);
		expect(await getFavoritesStatusAction(["a"])).toBe(expected);
	});

	it("例外時は全て false の Map", async () => {
		login();
		fs.getFavoritesStatus.mockRejectedValue(new Error("x"));
		const map = await getFavoritesStatusAction(["a", "b"]);
		expect([...map.values()]).toEqual([false, false]);
	});
});
