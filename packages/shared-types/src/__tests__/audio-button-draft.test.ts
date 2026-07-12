import { describe, expect, it } from "vitest";
import { audioButtonDraftTransformers } from "../transformers/audio-button-draft";
import {
	AUDIO_BUTTON_DRAFT_PREROLL_SECONDS,
	calculateDraftSuggestedStartTime,
} from "../types/audio-button-draft";

describe("calculateDraftSuggestedStartTime", () => {
	it("playerTime からプリロール分（15秒）巻き戻す（SPR-145 実測由来の定数）", () => {
		expect(AUDIO_BUTTON_DRAFT_PREROLL_SECONDS).toBe(15);
		expect(calculateDraftSuggestedStartTime(100.7)).toBe(85);
	});

	it("配信冒頭のマークは 0 未満にならない（クランプ）", () => {
		expect(calculateDraftSuggestedStartTime(5.2)).toBe(0);
		expect(calculateDraftSuggestedStartTime(0)).toBe(0);
	});

	it("playerTime が無い（壁時計のみモード）場合は 0", () => {
		expect(calculateDraftSuggestedStartTime(null)).toBe(0);
		expect(calculateDraftSuggestedStartTime(Number.NaN)).toBe(0);
	});
});

describe("audioButtonDraftTransformers.fromFirestore", () => {
	const base = {
		videoId: "9kMBmEvhwUk",
		videoTitle: "テスト配信",
		playerTime: 881.037,
	};

	it("Timestamp（toDate を持つオブジェクト）を ISO string へ変換し、推奨開始秒を導出する", () => {
		const ts = { toDate: () => new Date("2026-07-10T12:15:33.374Z") };
		const draft = audioButtonDraftTransformers.fromFirestore("d1", {
			...base,
			markedAt: ts,
			createdAt: ts,
		});
		expect(draft).toEqual({
			id: "d1",
			videoId: "9kMBmEvhwUk",
			videoTitle: "テスト配信",
			playerTime: 881.037,
			markedAt: "2026-07-10T12:15:33.374Z",
			createdAt: "2026-07-10T12:15:33.374Z",
			suggestedStartTime: 866,
		});
	});

	it("Date / string の日時もそのまま ISO string に正規化する（型混在への防御）", () => {
		const draft = audioButtonDraftTransformers.fromFirestore("d2", {
			...base,
			playerTime: null,
			markedAt: new Date("2026-07-10T12:00:00.000Z"),
			createdAt: "2026-07-10T12:00:01.000Z",
		});
		expect(draft.markedAt).toBe("2026-07-10T12:00:00.000Z");
		expect(draft.createdAt).toBe("2026-07-10T12:00:01.000Z");
		expect(draft.suggestedStartTime).toBe(0);
	});
});
