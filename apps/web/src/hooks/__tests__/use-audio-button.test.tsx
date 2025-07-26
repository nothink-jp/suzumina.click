import { AudioButton } from "@suzumina.click/shared-types";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAudioButton } from "../use-audio-button";

// テスト用のAudioButtonエンティティを作成するヘルパー
function createMockAudioButton(overrides?: Partial<any>): AudioButton {
	const defaultData = {
		id: "test-button-123",
		title: "テスト音声ボタン",
		description: "これはテスト用の音声ボタンです",
		tags: ["タグ1", "タグ2", "タグ3"],
		sourceVideoId: "dQw4w9WgXcQ",
		sourceVideoTitle: "テスト動画タイトル",
		startTime: 30,
		endTime: 45,
		createdBy: "user123",
		createdByName: "テストユーザー",
		isPublic: true,
		playCount: 1234,
		likeCount: 100,
		dislikeCount: 5,
		favoriteCount: 50,
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
		...overrides,
	};

	return AudioButton.fromLegacy(defaultData);
}

describe("useAudioButton", () => {
	it("基本的な音声ボタン情報を返す", () => {
		const audioButton = createMockAudioButton();
		const { result } = renderHook(() => useAudioButton(audioButton));

		expect(result.current.audioButton).toBe(audioButton);
		expect(result.current.buttonText).toBe("テスト音声ボタン");
		expect(result.current.tags).toEqual(["タグ1", "タグ2", "タグ3"]);
	});

	it("再生時間を正しく計算する", () => {
		const audioButton = createMockAudioButton({
			startTime: 30,
			endTime: 90,
		});
		const { result } = renderHook(() => useAudioButton(audioButton));

		expect(result.current.durationInSeconds).toBe(60);
		expect(result.current.formattedDuration).toBe("1:00");
	});

	it("タイムスタンプを正しくフォーマットする", () => {
		const audioButton = createMockAudioButton({
			startTime: 3665, // 1:01:05
			endTime: 3725, // 1:02:05
		});
		const { result } = renderHook(() => useAudioButton(audioButton));

		expect(result.current.timestampDisplay).toBe("1:01:05 - 1:02:05");
	});

	it("統計情報をフォーマットする", () => {
		const audioButton = createMockAudioButton({
			playCount: 123456,
			likeCount: 1234,
			dislikeCount: 12,
		});
		const { result } = renderHook(() => useAudioButton(audioButton));

		expect(result.current.formattedPlayCount).toBe("123,456");
		expect(result.current.formattedLikeCount).toBe("1,234");
		expect(result.current.formattedDislikeCount).toBe("12");
	});

	it("YouTube URLを正しく生成する", () => {
		const audioButton = createMockAudioButton({
			sourceVideoId: "dQw4w9WgXcQ",
			startTime: 120,
		});
		const { result } = renderHook(() => useAudioButton(audioButton));

		expect(result.current.youtubeUrl).toBe("https://youtube.com/watch?v=dQw4w9WgXcQ&t=120");
	});

	it("タグ検索URLを生成する", () => {
		const audioButton = createMockAudioButton();
		const { result } = renderHook(() => useAudioButton(audioButton));

		const tagUrl = result.current.getTagSearchUrl("テストタグ");
		expect(tagUrl).toBe(
			"/search?q=%E3%83%86%E3%82%B9%E3%83%88%E3%82%BF%E3%82%B0&type=audioButtons&tags=%E3%83%86%E3%82%B9%E3%83%88%E3%82%BF%E3%82%B0",
		);
	});

	it("人気度スコアを計算する", () => {
		const audioButton = createMockAudioButton({
			playCount: 1000,
			likeCount: 100,
			dislikeCount: 10,
		});
		const { result } = renderHook(() => useAudioButton(audioButton));

		// ButtonStatisticsのcalculatePopularityScoreメソッドの実装に依存
		expect(result.current.popularityScore).toBeGreaterThan(0);
	});

	it("エンゲージメント率を計算する", () => {
		const audioButton = createMockAudioButton({
			playCount: 1000,
			likeCount: 100,
			dislikeCount: 10,
		});
		const { result } = renderHook(() => useAudioButton(audioButton));

		// エンゲージメント率 = (いいね + 低評価) / 再生回数 * 100
		expect(result.current.engagementRate).toBe(11);
	});

	it("秒単位の短い再生時間を正しくフォーマットする", () => {
		const audioButton = createMockAudioButton({
			startTime: 0,
			endTime: 5,
		});
		const { result } = renderHook(() => useAudioButton(audioButton));

		expect(result.current.formattedDuration).toBe("0:05");
	});

	it("1時間を超える再生時間も正しくフォーマットする", () => {
		const audioButton = createMockAudioButton({
			startTime: 0,
			endTime: 3665, // 1時間1分5秒
		});
		const { result } = renderHook(() => useAudioButton(audioButton));

		expect(result.current.formattedDuration).toBe("61:05");
	});
});
