import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserFavorites } from "../favorites-firestore";

const getFirestore = vi.fn();
vi.mock("../firestore", () => ({ getFirestore: () => getFirestore() }));
vi.mock("../logger", () => ({ error: vi.fn() }));

type DocSnap = { data: () => { audioButtonId: string; addedAt: string } };
type Query = {
	orderBy: () => Query;
	limit: (n: number) => Query;
	startAfter: (doc: unknown) => Query;
	get: () => Promise<{ docs: DocSnap[] }>;
};

const fav = (audioButtonId: string, addedAt: string): DocSnap => ({
	data: () => ({ audioButtonId, addedAt }),
});

beforeEach(() => {
	vi.clearAllMocks();
});

describe("getUserFavorites のページ送り（offset エミュレーション）", () => {
	it("page=2 は offset 分を skip read して startAfter で 2 ページ目を返す", async () => {
		const startAfterArgs: unknown[] = [];
		const skipDocs = Array.from({ length: 20 }, (_, i) => fav(`skip${i}`, `2024-01-${i + 1}`));
		const lastSkipped = skipDocs[skipDocs.length - 1];
		const pageDocs = [fav("p2a", "2023-12-31"), fav("p2b", "2023-12-30")];

		const makeQuery = (): Query => {
			const state: { startAfter?: unknown } = {};
			const q: Query = {
				orderBy: () => q,
				limit: () => q,
				startAfter: (doc) => {
					state.startAfter = doc;
					startAfterArgs.push(doc);
					return q;
				},
				get: () => Promise.resolve({ docs: state.startAfter !== undefined ? pageDocs : skipDocs }),
			};
			return q;
		};
		const favoritesCollection = {
			orderBy: () => makeQuery(),
			doc: () => ({ get: () => Promise.resolve({ exists: false }) }),
		};
		getFirestore.mockReturnValue({
			collection: () => ({ doc: () => ({ collection: () => favoritesCollection }) }),
		});

		const result = await getUserFavorites("user1", { page: 2, limit: 20, orderBy: "newest" });

		// skip read の最後の doc を startAfter に渡している
		expect(startAfterArgs).toEqual([lastSkipped]);
		// 1 ページ目の skipDocs ではなく 2 ページ目のデータが返る
		expect(result.favorites.map((f) => f.audioButtonId)).toEqual(["p2a", "p2b"]);
	});

	it("page=1 は skip read も startAfter もせず先頭ページを返す", async () => {
		const startAfterArgs: unknown[] = [];
		const pageDocs = [fav("a", "2024-01-02"), fav("b", "2024-01-01")];
		const makeQuery = (): Query => {
			const q: Query = {
				orderBy: () => q,
				limit: () => q,
				startAfter: (doc) => {
					startAfterArgs.push(doc);
					return q;
				},
				get: () => Promise.resolve({ docs: pageDocs }),
			};
			return q;
		};
		const favoritesCollection = {
			orderBy: () => makeQuery(),
			doc: () => ({ get: () => Promise.resolve({ exists: false }) }),
		};
		getFirestore.mockReturnValue({
			collection: () => ({ doc: () => ({ collection: () => favoritesCollection }) }),
		});

		const result = await getUserFavorites("user1", { page: 1, limit: 20, orderBy: "newest" });

		expect(startAfterArgs).toEqual([]);
		expect(result.favorites.map((f) => f.audioButtonId)).toEqual(["a", "b"]);
		expect(result.hasMore).toBe(false);
	});
});
