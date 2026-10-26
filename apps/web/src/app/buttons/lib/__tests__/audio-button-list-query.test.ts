import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRecentPublicAudioButtons } from "../audio-button-list-query";

const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockSelect = vi.fn();
const mockGet = vi.fn();
const mockCountGet = vi.fn();

vi.mock("@/lib/firestore", () => ({
	getFirestore: () => ({ collection: () => query }),
}));

vi.mock("@/lib/logger", () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }));

const query = {
	where: mockWhere,
	orderBy: mockOrderBy,
	limit: mockLimit,
	select: mockSelect,
	get: mockGet,
	count: () => ({ get: mockCountGet }),
};

describe("getRecentPublicAudioButtons", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		for (const fn of [mockWhere, mockOrderBy, mockLimit, mockSelect]) {
			fn.mockReturnValue(query);
		}
		mockCountGet.mockResolvedValue({ data: () => ({ count: 250 }) });
		mockGet.mockResolvedValue({ docs: [] });
	});

	it("一覧 Server Action の上限（100）を超える件数でも、指定どおりの limit で問い合わせる（SPR-378）", async () => {
		const result = await getRecentPublicAudioButtons(200);

		expect(mockWhere).toHaveBeenCalledWith("isPublic", "==", true);
		expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "desc");
		expect(mockLimit).toHaveBeenCalledWith(200);
		expect(result.totalCount).toBe(250);
	});
});
