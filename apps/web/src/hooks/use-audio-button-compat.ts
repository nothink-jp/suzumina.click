import {
	AudioButtonCompat,
	type AudioButtonPlainObject,
	toAudioButtonCompat,
} from "@suzumina.click/shared-types";
import { useCallback, useMemo } from "react";

/**
 * AudioButton Entity/PlainObject両対応のカスタムフック
 * 段階的移行のための互換性レイヤー
 */
export function useAudioButtonCompat(audioButton: AudioButtonPlainObject | AudioButtonCompat) {
	// 互換性ラッパーに変換
	const compat = useMemo(() => {
		try {
			return toAudioButtonCompat(audioButton);
		} catch (_error) {
			// テスト環境以外でエラーログを出力
			if (process.env.NODE_ENV !== "test") {
			}
			// フォールバック: 最小限のデータを返す
			return new AudioButtonCompat({
				id: "unknown",
				title: "Unknown",
				sourceVideoId: "",
				sourceVideoTitle: "",
				startTime: 0,
				tags: [],
				createdBy: "",
				createdByName: "",
				isPublic: false,
				playCount: 0,
				likeCount: 0,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				_computed: {
					isPopular: false,
					engagementRate: 0,
					engagementRatePercentage: 0,
					popularityScore: 0,
					searchableText: "",
					durationText: "0:00",
					relativeTimeText: "",
				},
			});
		}
	}, [audioButton]);

	// メモ化: ボタンテキスト
	const buttonText = useMemo(() => compat.content.text.toString(), [compat]);

	// メモ化: タグ配列
	const tags = useMemo(() => compat.content.tags.toArray(), [compat]);

	// メモ化: 再生時間（秒）
	const durationInSeconds = useMemo(() => {
		const start = compat.reference.startTimestamp.toSeconds();
		const end = compat.reference.endTimestamp?.toSeconds() ?? start;
		return end - start;
	}, [compat]);

	// メモ化: フォーマット済み再生時間
	const formattedDuration = useMemo(() => {
		const totalSeconds = durationInSeconds;
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = Math.floor(totalSeconds % 60);
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	}, [durationInSeconds]);

	// メモ化: 再生回数のフォーマット
	const formattedPlayCount = useMemo(() => {
		return compat.statistics.viewCount.toNumber().toLocaleString();
	}, [compat]);

	// メモ化: いいね数のフォーマット
	const formattedLikeCount = useMemo(() => {
		return compat.statistics.likeCount.toNumber().toLocaleString();
	}, [compat]);

	// メモ化: 低評価数のフォーマット
	const formattedDislikeCount = useMemo(() => {
		return compat.statistics.dislikeCount.toNumber().toLocaleString();
	}, [compat]);

	// メモ化: YouTube URL
	const youtubeUrl = useMemo(() => {
		const videoId = compat.reference.videoId.toString();
		const startTime = compat.reference.startTimestamp.toSeconds();
		return `https://youtube.com/watch?v=${videoId}&t=${startTime}`;
	}, [compat]);

	// メモ化: タイムスタンプ表示
	const timestampDisplay = useMemo(() => {
		const start = compat.reference.startTimestamp.format();
		const end = compat.reference.endTimestamp?.format();
		return end ? `${start} - ${end}` : start;
	}, [compat]);

	// コールバック: タグの検索URLを生成
	const getTagSearchUrl = useCallback((tag: string) => {
		const params = new URLSearchParams();
		params.set("q", tag);
		params.set("type", "audioButtons");
		params.set("tags", tag);
		return `/search?${params.toString()}`;
	}, []);

	// メモ化: 人気度スコア
	const popularityScore = useMemo(() => {
		return compat.getPopularityScore();
	}, [compat]);

	// メモ化: エンゲージメント率
	const engagementRate = useMemo(() => {
		return compat.getEngagementRatePercentage();
	}, [compat]);

	return {
		// 基本情報
		audioButton: compat,
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
		getTagSearchUrl,

		// PlainObject（必要な場合）
		plainObject: compat.toPlainObject(),
	};
}
