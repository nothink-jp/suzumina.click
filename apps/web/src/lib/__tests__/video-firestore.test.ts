/**
 * video-firestore のユーザータグ読み書きテスト（SPR-273）
 *
 * ユーザータグの正本は `tags.userTags`（3層タグの1層）。読み手（一覧のタグ絞り込み・
 * 動画カード・タグエディタ）はすべて `video.tags?.userTags` を見ているため、
 * 書き込み先がトップレベル `userTags`（Legacy）だと保存しても表示されない。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFirestore } from "../firestore";
import { getVideoUserTags, updateVideoUserTags } from "../video-firestore";

const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockGet = vi.fn();
const mockUpdate = vi.fn();

vi.mock("../firestore", () => ({
	getFirestore: vi.fn(),
}));

vi.mock("../logger", () => ({
	error: vi.fn(),
	warn: vi.fn(),
	info: vi.fn(),
	debug: vi.fn(),
}));

describe("video-firestore: ユーザータグ", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getFirestore).mockReturnValue({ collection: mockCollection } as never);
		mockCollection.mockReturnValue({ doc: mockDoc });
		mockDoc.mockReturnValue({ get: mockGet, update: mockUpdate });
		mockUpdate.mockResolvedValue(undefined);
	});

	describe("updateVideoUserTags", () => {
		it("正本である tags.userTags にドット記法で書き込む", async () => {
			mockGet.mockResolvedValue({ exists: true });

			const result = await updateVideoUserTags("v1", ["タグA", "タグB"]);

			expect(result.success).toBe(true);
			expect(mockUpdate).toHaveBeenCalledWith(
				expect.objectContaining({ "tags.userTags": ["タグA", "タグB"] }),
			);
		});

		it("tags マップ全体を置換しない（同じ層の playlistTags を巻き込まない）", async () => {
			// `{ tags: { userTags } }` を渡すと update() は tags マップごと差し替えてしまい、
			// playlistTags / contentTags が消える。ドット記法であることをここで固定する。
			mockGet.mockResolvedValue({ exists: true });

			await updateVideoUserTags("v1", ["タグA"]);

			const written = mockUpdate.mock.calls[0]?.[0] as Record<string, unknown>;
			expect(written).not.toHaveProperty("tags");
		});

		it("動画が存在しなければ更新しない", async () => {
			mockGet.mockResolvedValue({ exists: false });

			const result = await updateVideoUserTags("missing", ["タグA"]);

			expect(result.success).toBe(false);
			expect(mockUpdate).not.toHaveBeenCalled();
		});
	});

	describe("getVideoUserTags", () => {
		it("tags.userTags から読む", async () => {
			mockGet.mockResolvedValue({
				exists: true,
				data: () => ({ tags: { userTags: ["タグA"], playlistTags: ["PL"] } }),
			});

			expect(await getVideoUserTags("v1")).toEqual(["タグA"]);
		});

		it("未設定なら空配列を返す", async () => {
			mockGet.mockResolvedValue({ exists: true, data: () => ({ tags: { playlistTags: ["PL"] } }) });

			expect(await getVideoUserTags("v1")).toEqual([]);
		});
	});
});
