import type { AudioButtonV2 } from "@suzumina.click/shared-types";
import { useCallback, useMemo } from "react";

/**
 * AudioButton V2 Entity用のカスタムフック
 * AudioButtonV2エンティティの便利なヘルパー関数と計算値を提供
 */
export function useAudioButtonV2(audioButton: AudioButtonV2) {
	// メモ化: ボタンテキスト
	const buttonText = useMemo(() => audioButton.content.text.toString(), [audioButton]);

	// メモ化: タグ配列
	const tags = useMemo(() => audioButton.content.tags.toArray(), [audioButton]);

	// メモ化: 再生時間（秒）
	const durationInSeconds = useMemo(() => {
		const start = audioButton.reference.startTimestamp.toSeconds();
		const end = audioButton.reference.endTimestamp?.toSeconds() ?? start;
		return end - start;
	}, [audioButton]);

	// メモ化: フォーマット済み再生時間
	const formattedDuration = useMemo(() => {
		const totalSeconds = durationInSeconds;
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = Math.floor(totalSeconds % 60);
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	}, [durationInSeconds]);

	// メモ化: 再生回数のフォーマット
	const formattedPlayCount = useMemo(() => {
		return audioButton.statistics.viewCount.toNumber().toLocaleString();
	}, [audioButton]);

	// メモ化: いいね数のフォーマット
	const formattedLikeCount = useMemo(() => {
		return audioButton.statistics.likeCount.toNumber().toLocaleString();
	}, [audioButton]);

	// メモ化: 低評価数のフォーマット
	const formattedDislikeCount = useMemo(() => {
		return audioButton.statistics.dislikeCount.toNumber().toLocaleString();
	}, [audioButton]);

	// メモ化: YouTube URL
	const youtubeUrl = useMemo(() => {
		const videoId = audioButton.reference.videoId.toString();
		const startTime = audioButton.reference.startTimestamp.toSeconds();
		return `https://youtube.com/watch?v=${videoId}&t=${startTime}`;
	}, [audioButton]);

	// メモ化: タイムスタンプ表示
	const timestampDisplay = useMemo(() => {
		const start = audioButton.reference.startTimestamp.format();
		const end = audioButton.reference.endTimestamp?.format();
		return end ? `${start} - ${end}` : start;
	}, [audioButton]);

	// コールバック: タグの検索URLを生成
	const getTagSearchUrl = useCallback((tag: string) => {
		const params = new URLSearchParams();
		params.set("q", tag);
		params.set("type", "audioButtons");
		params.set("tags", tag);
		return `/search?${params.toString()}`;
	}, []);

	// メモ化: 人気度スコア（Entity内のビジネスロジックを使用）
	const popularityScore = useMemo(() => {
		return audioButton.getPopularityScore();
	}, [audioButton]);

	// メモ化: エンゲージメント率（Entity内のビジネスロジックを使用）
	const engagementRate = useMemo(() => {
		return audioButton.calculateEngagementRate();
	}, [audioButton]);

	return {
		// 基本情報
		audioButton,
		buttonText,
		tags,

		// 時間関連
		durationInSeconds,
		formattedDuration,
		timestampDisplay,

		// 統計情報
		formattedPlayCount,
		formattedLikeCount,
		formattedDislikeCount,
		popularityScore,
		engagementRate,

		// URL関連
		youtubeUrl,

		// ヘルパー関数
		getTagSearchUrl,
	};
}
