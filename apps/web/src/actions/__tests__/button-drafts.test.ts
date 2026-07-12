import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: mockGetCurrentUser }));

const mockGetFirestore = vi.fn();
vi.mock("@/lib/firestore", () => ({ getFirestore: mockGetFirestore }));

vi.mock("@/lib/logger", () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));

const { createButtonDraft, deleteButtonDraft, getMyButtonDrafts } = await import(
	"../button-drafts"
);

const VALID_INPUT = {
	videoId: "9kMBmEvhwUk",
	videoTitle: "テスト配信",
	playerTime: 881.037,
	markedAtMs: Date.now(),
};

function setupFirestore({ draftCount = 0 }: { draftCount?: number } = {}) {
	const mockAdd = vi.fn(async (_doc: Record<string, unknown>) => ({ id: "draft-1" }));
	const mockDelete = vi.fn(async () => undefined);
	const mockOrderedGet = vi.fn(async () => ({ docs: [] as unknown[] }));
	const mockLimit = vi.fn(() => ({ get: mockOrderedGet }));
	const mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
	const subcollection = {
		add: mockAdd,
		count: () => ({ get: async () => ({ data: () => ({ count: draftCount }) }) }),
		orderBy: mockOrderBy,
		doc: vi.fn(() => ({ delete: mockDelete })),
	};
	const userDoc = vi.fn();
	mockGetFirestore.mockReturnValue({
		collection: () => ({ doc: userDoc.mockReturnValue({ collection: () => subcollection }) }),
	});
	return { mockAdd, mockDelete, mockOrderBy, mockLimit, mockOrderedGet, userDoc };
}

describe("createButtonDraft (SPR-146)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCurrentUser.mockResolvedValue({ discordId: "u1", isActive: true });
	});

	it("生の捕捉信号（playerTime + markedAt）を Date として保存し、プレーンを返す", async () => {
		const { mockAdd } = setupFirestore();
		const result = await createButtonDraft(VALID_INPUT);

		expect(mockAdd).toHaveBeenCalledOnce();
		const written = mockAdd.mock.calls[0]?.[0] ?? {};
		expect(written.videoId).toBe("9kMBmEvhwUk");
		expect(written.videoTitle).toBe("テスト配信");
		expect(written.playerTime).toBe(881.037);
		// Firestore は Date を Timestamp として保存する（新規コレクションの日時規約）
		expect(written.markedAt).toBeInstanceOf(Date);
		expect(written.createdAt).toBeInstanceOf(Date);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.id).toBe("draft-1");
			expect(result.data.suggestedStartTime).toBe(866); // floor(881) - 15
		}
	});

	it("playerTime=null（壁時計のみモード）も保存できる", async () => {
		const { mockAdd } = setupFirestore();
		const result = await createButtonDraft({ ...VALID_INPUT, playerTime: null });
		expect(result.success).toBe(true);
		expect(mockAdd.mock.calls[0]?.[0]?.playerTime).toBeNull();
		if (result.success) {
			expect(result.data.suggestedStartTime).toBe(0);
		}
	});

	it("未認証は error を返す（redirect しない・SPR-195）", async () => {
		mockGetCurrentUser.mockResolvedValue(null);
		const result = await createButtonDraft(VALID_INPUT);
		expect(result).toEqual({ success: false, error: "ログインが必要です" });
	});

	it("無効ユーザー（isActive=false）はブロックする", async () => {
		mockGetCurrentUser.mockResolvedValue({ discordId: "u1", isActive: false });
		const result = await createButtonDraft(VALID_INPUT);
		expect(result).toEqual({ success: false, error: "ログインが必要です" });
	});

	it.each([
		["videoId 不正", { ...VALID_INPUT, videoId: "bad" }],
		["playerTime 負値", { ...VALID_INPUT, playerTime: -1 }],
		["markedAtMs 異常値（24h超のずれ）", { ...VALID_INPUT, markedAtMs: 0 }],
	])("バリデーション: %s は保存せず error を返す", async (_label, input) => {
		const { mockAdd } = setupFirestore();
		const result = await createButtonDraft(input);
		expect(result.success).toBe(false);
		expect(mockAdd).not.toHaveBeenCalled();
	});

	it("下書きが上限件数に達していたら保存を拒否する", async () => {
		const { mockAdd } = setupFirestore({ draftCount: 500 });
		const result = await createButtonDraft(VALID_INPUT);
		expect(result.success).toBe(false);
		expect(mockAdd).not.toHaveBeenCalled();
	});
});

describe("getMyButtonDrafts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCurrentUser.mockResolvedValue({ discordId: "u1", isActive: true });
	});

	it("createdAt 降順で取得しプレーンへ変換する", async () => {
		const { mockOrderBy, mockOrderedGet } = setupFirestore();
		mockOrderedGet.mockResolvedValue({
			docs: [
				{
					id: "d1",
					data: () => ({
						videoId: "9kMBmEvhwUk",
						videoTitle: "t",
						playerTime: 34.14,
						markedAt: { toDate: () => new Date("2026-07-10T12:01:26.484Z") },
						createdAt: { toDate: () => new Date("2026-07-10T12:01:26.500Z") },
					}),
				},
			],
		});
		const result = await getMyButtonDrafts();
		expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "desc");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toHaveLength(1);
			expect(result.data[0]?.markedAt).toBe("2026-07-10T12:01:26.484Z");
			expect(result.data[0]?.suggestedStartTime).toBe(19); // floor(34) - 15
		}
	});

	it("未認証は error を返す", async () => {
		mockGetCurrentUser.mockResolvedValue(null);
		const result = await getMyButtonDrafts();
		expect(result.success).toBe(false);
	});
});

describe("deleteButtonDraft", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCurrentUser.mockResolvedValue({ discordId: "u1", isActive: true });
	});

	it("自分のサブコレクション配下の下書きを削除する", async () => {
		const { mockDelete } = setupFirestore();
		const result = await deleteButtonDraft("d1");
		expect(mockDelete).toHaveBeenCalledOnce();
		expect(result.success).toBe(true);
	});

	it("パス操作を含む draftId は拒否する", async () => {
		const { mockDelete } = setupFirestore();
		const result = await deleteButtonDraft("../users/other");
		expect(result.success).toBe(false);
		expect(mockDelete).not.toHaveBeenCalled();
	});
});
