import type { AudioButton } from "@suzumina.click/shared-types";
import { useCallback, useMemo } from "react";

/**
 * AudioButton用のカスタムフック
 * AudioButtonの便利なヘルパー関数と計算値を提供
 */
export function useAudioButton(audioButton: AudioButton) {
	// メモ化: フォーマット済み再生時間
	const formattedDuration = useMemo(() => {
		const totalSeconds = audioButton.duration;
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = Math.floor(totalSeconds % 60);
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	}, [audioButton.duration]);

	// メモ化: 再生回数のフォーマット
	const formattedPlayCount = useMemo(() => {
		return audioButton.stats.playCount.toLocaleString();
	}, [audioButton.stats.playCount]);

	// メモ化: いいね数のフォーマット
	const formattedLikeCount = useMemo(() => {
		return audioButton.stats.likeCount.toLocaleString();
	}, [audioButton.stats.likeCount]);

	// メモ化: 低評価数のフォーマット
	const formattedDislikeCount = useMemo(() => {
		return audioButton.stats.dislikeCount.toLocaleString();
	}, [audioButton.stats.dislikeCount]);

	// メモ化: YouTube URL
	const youtubeUrl = useMemo(() => {
		const videoId = audioButton.videoId;
		const startTime = Math.floor(audioButton.startTime);
		return `https://youtube.com/watch?v=${videoId}&t=${startTime}`;
	}, [audioButton.videoId, audioButton.startTime]);

	// メモ化: タイムスタンプ表示
	const timestampDisplay = useMemo(() => {
		const formatTime = (seconds: number) => {
			const hours = Math.floor(seconds / 3600);
			const mins = Math.floor((seconds % 3600) / 60);
			const secs = Math.floor(seconds % 60);

			if (hours > 0) {
				return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
			}
			return `${mins}:${secs.toString().padStart(2, "0")}`;
		};

		const start = formatTime(audioButton.startTime);
		const end = formatTime(audioButton.endTime);
		return audioButton.startTime !== audioButton.endTime ? `${start} - ${end}` : start;
	}, [audioButton.startTime, audioButton.endTime]);

	// コールバック: タグの検索URLを生成
	const getTagSearchUrl = useCallback((tag: string) => {
		const params = new URLSearchParams();
		params.set("q", tag);
		params.set("type", "audioButtons");
		params.set("tags", tag);
		return `/search?${params.toString()}`;
	}, []);

	return {
		// 基本情報
		audioButton,
		buttonText: audioButton.buttonText,
		tags: audioButton.tags,

		// 時間関連
		durationInSeconds: audioButton.duration,
		formattedDuration,
		timestampDisplay,

		// 統計情報
		formattedPlayCount,
		formattedLikeCount,
		formattedDislikeCount,
		popularityScore: audioButton._computed.popularityScore,
		engagementRate: audioButton._computed.engagementRatePercentage,

		// URL関連
		youtubeUrl,
		getTagSearchUrl,
	};
}
