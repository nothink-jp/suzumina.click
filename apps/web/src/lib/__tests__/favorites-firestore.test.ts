import { beforeEach, describe, expect, it, vi } from "vitest";
import { addFavorite, removeFavorite } from "../favorites-firestore";

// updateCounter（正本パスへの原子的更新）をスパイ化
const updateCounter = vi.fn();
vi.mock("../firestore-helpers", () => ({
	updateCounter: (...args: unknown[]) => updateCounter(...args),
}));

const getFirestore = vi.fn();
vi.mock("../firestore", () => ({ getFirestore: () => getFirestore() }));
vi.mock("../logger", () => ({ error: vi.fn() }));

beforeEach(() => {
	vi.clearAllMocks();
	updateCounter.mockResolvedValue({ success: true, newValue: 1 });
});

describe("favorites-firestore のお気に入り数更新", () => {
	it("addFavorite は stats.favoriteCount を +1（updateCounter 経由・min:0）", async () => {
		const add = vi.fn().mockResolvedValue({ id: "fav1" });
		const favorites = {
			where: () => ({ limit: () => ({ get: () => Promise.resolve({ empty: true }) }) }),
			add,
		};
		getFirestore.mockReturnValue({
			collection: () => ({ doc: () => ({ collection: () => favorites }) }),
		});

		const result = await addFavorite("user1", { audioButtonId: "ab1" });

		expect(result).toEqual({ success: true, favoriteId: "fav1" });
		expect(updateCounter).toHaveBeenCalledWith("audioButtons", "ab1", "stats.favoriteCount", 1, {
			min: 0,
		});
	});

	it("removeFavorite は stats.favoriteCount を -1（updateCounter 経由・min:0）", async () => {
		const deleteFn = vi.fn().mockResolvedValue(undefined);
		const favorites = {
			where: () => ({
				limit: () => ({
					get: () =>
						Promise.resolve({
							empty: false,
							docs: [{ id: "fav1", ref: { delete: deleteFn } }],
						}),
				}),
			}),
		};
		getFirestore.mockReturnValue({
			collection: () => ({ doc: () => ({ collection: () => favorites }) }),
		});

		const result = await removeFavorite("user1", { audioButtonId: "ab1" });

		expect(result).toEqual({ success: true });
		expect(deleteFn).toHaveBeenCalled();
		expect(updateCounter).toHaveBeenCalledWith("audioButtons", "ab1", "stats.favoriteCount", -1, {
			min: 0,
		});
	});

	it("既にお気に入り済みなら追加せずカウンターも触らない", async () => {
		const favorites = {
			where: () => ({
				limit: () => ({ get: () => Promise.resolve({ empty: false }) }),
			}),
			add: vi.fn(),
		};
		getFirestore.mockReturnValue({
			collection: () => ({ doc: () => ({ collection: () => favorites }) }),
		});

		const result = await addFavorite("user1", { audioButtonId: "ab1" });

		expect(result).toEqual({ success: false });
		expect(updateCounter).not.toHaveBeenCalled();
	});
});
