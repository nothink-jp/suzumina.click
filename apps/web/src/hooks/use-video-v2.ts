import type { Video as VideoV2 } from "@suzumina.click/shared-types";
import { useCallback, useMemo } from "react";

/**
 * Video V2 Entity用のカスタムフック
 * VideoV2エンティティの便利なヘルパー関数と計算値を提供
 */
export function useVideoV2(video: VideoV2) {
	// メモ化: YouTube URL
	const youtubeUrl = useMemo(() => video.getYouTubeUrl(), [video]);

	// メモ化: サムネイルURL（高品質版）
	const thumbnailUrl = useMemo(() => {
		try {
			const url = video.content.videoId.toThumbnailUrl();
			// 有効なURLかチェック（YouTube形式であることを確認）
			if (url.includes("youtube.com") || url.includes("youtu.be")) {
				return url;
			}
			// 無効なURLの場合はレガシー形式から取得を試みる
			const legacy = video.toLegacyFormat();
			if (legacy.thumbnailUrl && legacy.thumbnailUrl.startsWith("http")) {
				return legacy.thumbnailUrl;
			}
			// それでも無効な場合はデフォルト画像
			return "/images/no-thumbnail.svg";
		} catch {
			// エラーの場合もデフォルト画像
			return "/images/no-thumbnail.svg";
		}
	}, [video]);

	// メモ化: 公開日のフォーマット済み文字列
	const formattedPublishedDate = useMemo(() => {
		const date = new Date(video.content.publishedAt.toString());
		return date.toLocaleDateString("ja-JP", {
			timeZone: "Asia/Tokyo",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});
	}, [video]);

	// メモ化: 配信開始日時（ライブ配信の場合）
	const formattedStreamStartDate = useMemo(() => {
		const startTime = video.getLiveStreamStartTime();
		if (!startTime) return null;

		const date = new Date(startTime.toString());
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
		return video.statistics?.viewCount.toLocaleString() || "0";
	}, [video]);

	// メモ化: 再生時間のフォーマット済み文字列
	const formattedDuration = useMemo(() => {
		return video.metadata.duration?.format() || "";
	}, [video]);

	// メモ化: 動画タイプのバッジ情報
	const videoBadgeInfo = useMemo(() => {
		if (video.isLiveStream()) {
			return {
				text: "配信中",
				className: "bg-red-600/90 text-white",
				ariaLabel: "現在配信中のライブ配信",
			};
		}

		if (video.isUpcomingStream()) {
			return {
				text: "配信予告",
				className: "bg-blue-600/90 text-white",
				ariaLabel: "配信予定のライブ配信",
			};
		}

		if (video.isArchivedStream()) {
			return {
				text: "配信アーカイブ",
				className: "bg-gray-600/90 text-white",
				ariaLabel: "ライブ配信のアーカイブ",
			};
		}

		if (video.isPremiere()) {
			return {
				text: "プレミア公開",
				className: "bg-purple-600/90 text-white",
				ariaLabel: "プレミア公開動画",
			};
		}

		return {
			text: "通常動画",
			className: "bg-black/70 text-white",
			ariaLabel: "通常動画コンテンツ",
		};
	}, [video]);

	// メモ化: カテゴリ名
	const categoryName = useMemo(() => {
		return video.channel.category?.toString() || "";
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
	const playlistTags = useMemo(() => video.tags.playlistTags || [], [video]);

	// メモ化: ユーザータグの配列
	const userTags = useMemo(() => video.tags.userTags || [], [video]);

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
		isLiveStream: video.isLiveStream(),
		isUpcomingStream: video.isUpcomingStream(),
		isArchivedStream: video.isArchivedStream(),
		isPremiere: video.isPremiere(),

		// カテゴリ・タグ情報
		categoryName,
		playlistTags,
		userTags,

		// ヘルパー関数
		getTagSearchUrl,
	};
}
