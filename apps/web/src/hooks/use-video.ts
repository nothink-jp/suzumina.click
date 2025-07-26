import type { VideoPlainObject } from "@suzumina.click/shared-types";
import { getYouTubeCategoryName } from "@suzumina.click/ui/lib/youtube-category-utils";
import { useCallback, useMemo } from "react";
import { DEFAULT_THUMBNAIL_PATH } from "@/lib/constants";

/**
 * Video PlainObject用のカスタムフック
 * Videoデータの便利なヘルパー関数と計算値を提供
 */
export function useVideo(video: VideoPlainObject) {
	// メモ化: YouTube URL
	const youtubeUrl = useMemo(() => video._computed.youtubeUrl, [video]);

	// メモ化: サムネイルURL（高品質版）
	const thumbnailUrl = useMemo(() => {
		const url = video._computed.thumbnailUrl;
		// 有効なURLかチェック（YouTube形式であることを確認）
		if (url && (url.includes("youtube.com") || url.includes("youtu.be"))) {
			return url;
		}
		// それでも無効な場合はデフォルト画像
		return DEFAULT_THUMBNAIL_PATH;
	}, [video]);

	// メモ化: 公開日のフォーマット済み文字列
	const formattedPublishedDate = useMemo(() => {
		const date = new Date(video.publishedAt);
		return date.toLocaleDateString("ja-JP", {
			timeZone: "Asia/Tokyo",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});
	}, [video]);

	// メモ化: 配信開始日時（ライブ配信の場合）
	const formattedStreamStartDate = useMemo(() => {
		const startTime = video.liveStreamingDetails?.actualStartTime;
		if (!startTime) return null;

		const date = new Date(startTime);
		return date.toLocaleDateString("ja-JP", {
			timeZone: "Asia/Tokyo",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});
	}, [video]);

	// メモ化: 表示用の日付（ライブ配信は配信開始日を優先）
	const displayDate = useMemo(() => {
		return formattedStreamStartDate || formattedPublishedDate;
	}, [formattedStreamStartDate, formattedPublishedDate]);

	// メモ化: 日付ラベル
	const dateLabel = useMemo(() => {
		return formattedStreamStartDate ? "配信開始" : "公開日";
	}, [formattedStreamStartDate]);

	// メモ化: 視聴回数のフォーマット済み文字列
	const formattedViewCount = useMemo(() => {
		return video.statistics?.viewCount?.toLocaleString() || "0";
	}, [video]);

	// メモ化: 再生時間のフォーマット済み文字列
	const formattedDuration = useMemo(() => {
		const duration = video.duration;
		if (!duration) return "";

		// PT1H2M3S 形式をパース
		const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
		if (!match) return "";

		const hours = Number.parseInt(match[1] || "0");
		const minutes = Number.parseInt(match[2] || "0");
		const seconds = Number.parseInt(match[3] || "0");

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
		}
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	}, [video]);

	// メモ化: 動画タイプのバッジ情報
	const videoBadgeInfo = useMemo(() => {
		const { videoType } = video._computed;

		switch (videoType) {
			case "live":
				return {
					text: "配信中",
					className: "bg-red-600/90 text-white",
					ariaLabel: "現在配信中のライブ配信",
				};
			case "upcoming":
				return {
					text: "配信予告",
					className: "bg-blue-600/90 text-white",
					ariaLabel: "配信予定のライブ配信",
				};
			case "archived":
				return {
					text: "配信アーカイブ",
					className: "bg-gray-600/90 text-white",
					ariaLabel: "ライブ配信のアーカイブ",
				};
			case "premiere":
				return {
					text: "プレミア公開",
					className: "bg-purple-600/90 text-white",
					ariaLabel: "プレミア公開動画",
				};
			default:
				return {
					text: "通常動画",
					className: "bg-black/70 text-white",
					ariaLabel: "通常動画コンテンツ",
				};
		}
	}, [video]);

	// メモ化: カテゴリ名
	const categoryName = useMemo(() => {
		return video.categoryId ? getYouTubeCategoryName(video.categoryId) : "";
	}, [video]);

	// コールバック: タグの検索URLを生成
	const getTagSearchUrl = useCallback((tag: string, tagType: "playlist" | "user" | "category") => {
		const params = new URLSearchParams();
		params.set("q", tag);
		params.set("type", "videos");

		switch (tagType) {
			case "playlist":
				params.set("playlistTags", tag);
				break;
			case "user":
				params.set("userTags", tag);
				break;
			case "category":
				params.set("categoryNames", tag);
				break;
		}

		return `/search?${params.toString()}`;
	}, []);

	// メモ化: プレイリストタグの配列
	const playlistTags = useMemo(() => video.playlistTags || [], [video]);

	// メモ化: ユーザータグの配列
	const userTags = useMemo(() => video.userTags || [], [video]);

	return {
		// 基本情報
		video,
		youtubeUrl,
		thumbnailUrl,

		// 日付情報
		formattedPublishedDate,
		formattedStreamStartDate,
		displayDate,
		dateLabel,

		// 統計情報
		formattedViewCount,
		formattedDuration,

		// 動画タイプ情報
		videoBadgeInfo,
		isLiveStream: video._computed.isLive,
		isUpcomingStream: video._computed.isUpcoming,
		isArchivedStream: video._computed.isArchived,
		isPremiere: video._computed.isPremiere,

		// カテゴリ・タグ情報
		categoryName,
		playlistTags,
		userTags,

		// ヘルパー関数
		getTagSearchUrl,
	};
}
