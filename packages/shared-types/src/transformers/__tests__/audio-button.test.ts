import { describe, expect, it } from "vitest";
import { audioButtonTransformers } from "../audio-button";

const { fromFirestore, createAudioButton } = audioButtonTransformers;

describe("audioButtonTransformers", () => {
	describe("durationText の表記統一", () => {
		// 0秒→"再生" / <60秒→"N秒" / 60秒以上→"m:ss" を正本とし、
		// fromFirestore / createAudioButton のどちらの経路でも同一になることを保証する。
		it.each([
			{ duration: 0, expected: "再生" },
			{ duration: 5, expected: "5秒" },
			{ duration: 59, expected: "59秒" },
			{ duration: 60, expected: "1:00" },
			{ duration: 65, expected: "1:05" },
			{ duration: 125, expected: "2:05" },
		])("duration=$duration の durationText は $expected", ({ duration, expected }) => {
			const fromFs = fromFirestore({
				id: "test",
				buttonText: "テスト",
				videoId: "video-1",
				startTime: 0,
				endTime: duration,
				duration,
			});
			expect(fromFs?._computed.durationText).toBe(expected);

			const created = createAudioButton({
				buttonText: "テスト",
				videoId: "video-1",
				videoTitle: "タイトル",
				startTime: 0,
				endTime: duration,
				creatorId: "creator-1",
				creatorName: "クリエイター",
			});
			expect(created._computed.durationText).toBe(expected);
		});

		it("同一 duration で両経路の durationText が一致する", () => {
			const duration = 5;
			const fromFs = fromFirestore({
				buttonText: "テスト",
				videoId: "video-1",
				startTime: 10,
				endTime: 15,
			});
			const created = createAudioButton({
				buttonText: "テスト",
				videoId: "video-1",
				videoTitle: "タイトル",
				startTime: 10,
				endTime: 15,
				creatorId: "creator-1",
				creatorName: "クリエイター",
			});
			expect(fromFs?._computed.durationText).toBe(created._computed.durationText);
			expect(fromFs?._computed.durationText).toBe("5秒");
			expect(duration).toBe(5);
		});
	});

	describe("fromFirestore", () => {
		it("レガシーなフィールド名（sourceVideoId / title / createdBy）を吸収する", () => {
			const result = fromFirestore({
				id: "legacy",
				title: "レガシータイトル",
				sourceVideoId: "legacy-video",
				sourceVideoTitle: "動画タイトル",
				startTime: 0,
				endTime: 30,
				createdBy: "user-1",
				createdByName: "ユーザー",
			});
			expect(result).not.toBeNull();
			expect(result?.buttonText).toBe("レガシータイトル");
			expect(result?.videoId).toBe("legacy-video");
			expect(result?.creatorId).toBe("user-1");
			expect(result?._computed.durationText).toBe("30秒");
		});

		it("buttonText か videoId が欠落していたら null を返す", () => {
			expect(fromFirestore({ videoId: "v" })).toBeNull();
			expect(fromFirestore({ buttonText: "t" })).toBeNull();
		});

		it("stats を優先しつつ engagementRate を補完する", () => {
			const result = fromFirestore({
				buttonText: "テスト",
				videoId: "video-1",
				startTime: 0,
				endTime: 10,
				stats: { playCount: 10, likeCount: 2, dislikeCount: 0 },
			});
			expect(result?.stats.engagementRate).toBeCloseTo(0.2);
			expect(result?._computed.isPopular).toBe(false);
		});
	});

	describe("createAudioButton", () => {
		it("duration を startTime/endTime から算出する", () => {
			const created = createAudioButton({
				buttonText: "テスト",
				videoId: "video-1",
				videoTitle: "タイトル",
				startTime: 100,
				endTime: 130,
				creatorId: "creator-1",
				creatorName: "クリエイター",
			});
			expect(created.duration).toBe(30);
			expect(created._computed.durationText).toBe("30秒");
		});
	});
});
