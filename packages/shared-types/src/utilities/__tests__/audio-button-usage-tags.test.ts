import { describe, expect, it } from "vitest";
import { AUDIO_BUTTON_USAGE_TAGS, isAudioButtonUsageTag } from "../audio-button-usage-tags";

describe("AUDIO_BUTTON_USAGE_TAGS", () => {
	it("SPR-260 で確定した9カテゴリを保持する（語彙変更は運用判断を伴うため退行防止）", () => {
		expect(AUDIO_BUTTON_USAGE_TAGS).toEqual([
			"あいさつ",
			"返事・リアクション",
			"笑い",
			"擬音・音ネタ",
			"うた",
			"ツッコミ・煽り",
			"応援・褒め",
			"あまあま",
			"名言・迷言",
		]);
	});
});

describe("isAudioButtonUsageTag", () => {
	it("公式語彙は true", () => {
		expect(isAudioButtonUsageTag("あいさつ")).toBe(true);
		expect(isAudioButtonUsageTag("名言・迷言")).toBe(true);
	});

	it("自由タグ・出典系タグは false", () => {
		expect(isAudioButtonUsageTag("龍が如く極")).toBe(false);
		expect(isAudioButtonUsageTag("おひょ")).toBe(false);
		expect(isAudioButtonUsageTag("挨拶")).toBe(false);
	});
});
