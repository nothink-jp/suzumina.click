import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAutocompleteSuggestions } from "../autocomplete";

vi.mock("@/lib/firestore", () => ({ getFirestore: vi.fn() }));
const { getFirestore } = vi.mocked(await import("@/lib/firestore"));

// コレクション名ごとに docs を返すチェーン可能な Firestore モック
const makeFirestore = (docsByCollection: Record<string, Array<{ id: string; data: unknown }>>) => {
	const makeQuery = (name: string) => {
		const q: Record<string, unknown> = {};
		q.where = vi.fn(() => q);
		q.orderBy = vi.fn(() => q);
		q.limit = vi.fn(() => q);
		q.get = vi.fn().mockResolvedValue({
			docs: (docsByCollection[name] || []).map((d) => ({ id: d.id, data: () => d.data })),
		});
		return q;
	};
	return { collection: vi.fn((name: string) => makeQuery(name)) };
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe("getAutocompleteSuggestions", () => {
	it("空クエリはスキーマ検証エラー", async () => {
		const r = await getAutocompleteSuggestions("");
		expect(r.success).toBe(false);
	});

	it("2文字未満は空候補で即返す（Firestore を引かない）", async () => {
		getFirestore.mockReturnValue(makeFirestore({}) as never);
		const r = await getAutocompleteSuggestions("a");
		expect(r).toMatchObject({
			success: true,
			data: { suggestions: [], meta: { total: 0 } },
		});
		expect(getFirestore).not.toHaveBeenCalled();
	});

	it("人気タグ・動的タグ・タイトルを集約し人気タグを優先する", async () => {
		getFirestore.mockReturnValue(
			makeFirestore({
				audioButtons: [
					{
						id: "b1",
						data: { isPublic: true, tags: ["ゲーム", "実況"], title: "ゲーム配信", playCount: 50 },
					},
				],
				videos: [{ id: "v1", data: { title: "ゲーム実況動画" } }],
			}) as never,
		);
		const r = await getAutocompleteSuggestions("ゲーム");
		expect(r.success).toBe(true);
		if (r.success) {
			// 人気タグ「ゲーム」(count 999) が先頭
			expect(r.data.suggestions[0]).toMatchObject({ text: "ゲーム", type: "tag", count: 999 });
			expect(r.data.meta.sources.tags).toBeGreaterThan(0);
			expect(r.data.meta.sources.titles).toBeGreaterThan(0);
			// タイトル候補が含まれる
			expect(r.data.suggestions.some((s) => s.type === "title")).toBe(true);
		}
	});

	it("マッチしないクエリでも success（候補は少数）", async () => {
		getFirestore.mockReturnValue(makeFirestore({ audioButtons: [], videos: [] }) as never);
		const r = await getAutocompleteSuggestions("該当しない語");
		expect(r.success).toBe(true);
	});

	it("getFirestore が例外を投げると失敗を返す", async () => {
		getFirestore.mockImplementation(() => {
			throw new Error("fs down");
		});
		const r = await getAutocompleteSuggestions("ゲーム");
		expect(r).toEqual({ success: false, error: "オートコンプリート候補の取得に失敗しました。" });
	});
});
