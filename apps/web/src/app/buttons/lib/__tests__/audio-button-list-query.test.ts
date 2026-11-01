import type { AudioButton } from "@suzumina.click/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRecentPublicAudioButtons } from "../audio-button-list-query";

const mockLoadAll = vi.fn();
vi.mock("../../audio-buttons-source", () => ({
	loadAllPublicAudioButtons: () => mockLoadAll(),
}));

const button = (id: string, createdAt: string) => ({ id, createdAt }) as AudioButton;

describe("getRecentPublicAudioButtons", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("一覧と同じ全件キャッシュから新しい順に limit 件を切り出し、総数は全件の件数（SPR-349）", async () => {
		mockLoadAll.mockResolvedValue(
			Array.from({ length: 250 }, (_, i) =>
				button(`b${i}`, new Date(Date.UTC(2024, 0, 1, 0, i)).toISOString()),
			),
		);

		// 一覧 Server Action の上限（100）を超える件数でも、指定どおりに切り出す（SPR-378）
		const result = await getRecentPublicAudioButtons(200);

		expect(result.audioButtons).toHaveLength(200);
		expect(result.audioButtons[0]?.id).toBe("b249");
		expect(result.totalCount).toBe(250);
	});

	it("全件の取得失敗はそのまま伝播させる（呼び出し側がログを出して空表示にする）", async () => {
		mockLoadAll.mockRejectedValue(new Error("firestore down"));
		await expect(getRecentPublicAudioButtons(10)).rejects.toThrow("firestore down");
	});
});
