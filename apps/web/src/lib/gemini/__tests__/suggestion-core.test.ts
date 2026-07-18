import { describe, expect, it } from "vitest";
import {
	buildSuggestionPrompt,
	clipRange,
	MAX_SEGMENT_SECONDS,
	parseSuggestionResponse,
	validateSegment,
} from "../suggestion-core";

describe("clipRange", () => {
	it("区間の前後に2秒の余白を付け、整数秒に丸める", () => {
		expect(clipRange(411.3, 414.7)).toEqual({
			startOffsetSeconds: 409,
			endOffsetSeconds: 417,
		});
	});

	it("動画冒頭では開始オフセットを0未満にしない", () => {
		expect(clipRange(0.5, 3)).toEqual({ startOffsetSeconds: 0, endOffsetSeconds: 5 });
	});
});

describe("validateSegment", () => {
	it("正常な区間はnullを返す", () => {
		expect(validateSegment(10, 15)).toBeNull();
	});

	it("開始が負・非数は不正", () => {
		expect(validateSegment(-1, 5)).not.toBeNull();
		expect(validateSegment(Number.NaN, 5)).not.toBeNull();
		expect(validateSegment(0, Number.POSITIVE_INFINITY)).not.toBeNull();
	});

	it("終了が開始以前は不正", () => {
		expect(validateSegment(10, 10)).not.toBeNull();
		expect(validateSegment(10, 9)).not.toBeNull();
	});

	it("上限秒を超える区間は不正（コスト上限）", () => {
		expect(validateSegment(0, MAX_SEGMENT_SECONDS)).toBeNull();
		expect(validateSegment(0, MAX_SEGMENT_SECONDS + 1)).not.toBeNull();
	});
});

describe("buildSuggestionPrompt", () => {
	it("既存タグ語彙をプロンプトに含める", () => {
		const prompt = buildSuggestionPrompt(["挨拶", "ゲーム"]);
		expect(prompt).toContain("挨拶, ゲーム");
		expect(prompt).toContain("transcript");
		expect(prompt).toContain("titles");
		expect(prompt).toContain("tags");
	});
});

describe("parseSuggestionResponse", () => {
	const valid = JSON.stringify({
		transcript: " やべ、いるわ ",
		titles: ["やべ、いるわ", "即死に笑うみなせ", "やべ、いるわ"],
		tags: ["ゲーム", "涼花みなせ", "バイオハザード5"],
	});

	it("正常応答をtrim・重複排除して返し、除外タグを落とす", () => {
		const result = parseSuggestionResponse(valid);
		expect(result).not.toBeNull();
		expect(result?.transcript).toBe("やべ、いるわ");
		// 重複「やべ、いるわ」は1つに
		expect(result?.titles).toEqual(["やべ、いるわ", "即死に笑うみなせ"]);
		// 暗黙前提タグ「涼花みなせ」は除外
		expect(result?.tags).toEqual(["ゲーム", "バイオハザード5"]);
	});

	it("JSONでない応答はnull", () => {
		expect(parseSuggestionResponse("すみません、生成できません")).toBeNull();
		expect(parseSuggestionResponse("null")).toBeNull();
	});

	it("titlesが空・欠落・非文字列のみならnull（候補として不成立）", () => {
		expect(parseSuggestionResponse(JSON.stringify({ transcript: "a", tags: [] }))).toBeNull();
		expect(
			parseSuggestionResponse(JSON.stringify({ transcript: "a", titles: [], tags: [] })),
		).toBeNull();
		expect(
			parseSuggestionResponse(JSON.stringify({ transcript: "a", titles: [1, null], tags: [] })),
		).toBeNull();
	});

	it("バリデーション上限に合わせてタイトル100字・タグ30字に切り詰める", () => {
		const result = parseSuggestionResponse(
			JSON.stringify({
				transcript: "t",
				titles: ["あ".repeat(150)],
				tags: ["い".repeat(50)],
			}),
		);
		expect(result?.titles[0]).toHaveLength(100);
		expect(result?.tags[0]).toHaveLength(30);
	});

	it("tags欠落は空配列として成立する", () => {
		const result = parseSuggestionResponse(JSON.stringify({ transcript: "t", titles: ["a"] }));
		expect(result?.tags).toEqual([]);
	});
});
