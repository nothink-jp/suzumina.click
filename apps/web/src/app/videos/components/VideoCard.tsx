"use client";

import type { FrontendVideoData } from "@suzumina.click/shared-types";
import {
	canCreateAudioButton,
	getAudioButtonCreationErrorMessage,
	parseDurationToSeconds,
} from "@suzumina.click/shared-types";
import { ThreeLayerTagDisplay } from "@suzumina.click/ui/components/custom/three-layer-tag-display";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { getYouTubeCategoryName } from "@suzumina.click/ui/lib/youtube-category-utils";
import { Calendar, Clock, ExternalLink, Eye, Plus, Radio, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import React, { memo, useCallback, useMemo } from "react";
import ThumbnailImage from "@/components/ui/thumbnail-image";

// Helper function to get video badge information
function getVideoBadgeInfo(video: FrontendVideoData) {
	switch (video.liveBroadcastContent) {
		case "live":
			return {
				text: "配信中",
				icon: Radio,
				className: "bg-red-600/90 text-white",
				ariaLabel: "現在配信中のライブ配信",
			};
		case "upcoming":
			return {
				text: "配信予告",
				icon: Clock,
				className: "bg-blue-600/90 text-white",
				ariaLabel: "配信予定のライブ配信",
			};
		case "none":
			return getVideoBadgeInfoForNone(video);
		default:
			return {
				text: "動画",
				icon: Video,
				className: "bg-black/70 text-white",
				ariaLabel: "動画コンテンツ",
			};
	}
}

// Helper function for liveBroadcastContent === "none" cases
function getVideoBadgeInfoForNone(video: FrontendVideoData) {
	// 明示的にアーカイブと設定されている場合
	if (video.videoType === "archived") {
		return {
			text: "配信アーカイブ",
			icon: Radio,
			className: "bg-gray-600/90 text-white",
			ariaLabel: "ライブ配信のアーカイブ",
		};
	}

	// liveStreamingDetails が存在する場合の詳細判定
	if (video.liveStreamingDetails?.actualEndTime) {
		return getVideoBadgeInfoForLiveDetails(video);
	}

	// プレミア公開動画の判定（liveStreamingDetails は存在するが actualEndTime がない）
	if (video.liveStreamingDetails && !video.liveStreamingDetails.actualEndTime) {
		return {
			text: "プレミア公開",
			icon: Video,
			className: "bg-purple-600/90 text-white",
			ariaLabel: "プレミア公開動画",
		};
	}

	// 通常動画
	return {
		text: "通常動画",
		icon: Video,
		className: "bg-black/70 text-white",
		ariaLabel: "通常動画コンテンツ",
	};
}

// Helper function for live streaming details classification
function getVideoBadgeInfoForLiveDetails(video: FrontendVideoData) {
	// 15分以下はプレミア公開、超過はライブアーカイブ
	const durationSeconds = parseDurationToSeconds(video.duration);
	const fifteenMinutes = 15 * 60; // 900秒

	if (durationSeconds > 0 && durationSeconds <= fifteenMinutes) {
		return {
			text: "プレミア公開",
			icon: Video,
			className: "bg-purple-600/90 text-white",
			ariaLabel: "プレミア公開動画",
		};
	}

	return {
		text: "配信アーカイブ",
		icon: Radio,
		className: "bg-gray-600/90 text-white",
		ariaLabel: "ライブ配信のアーカイブ",
	};
}

interface VideoCardProps {
	video: FrontendVideoData;
	buttonCount?: number; // 従来の互換性のため残すが、video.audioButtonCountを優先
	variant?: "grid" | "sidebar";
	priority?: boolean; // LCP画像最適化用
}

// パフォーマンス向上: VideoCardをメモ化して不要な再レンダリングを防ぐ
const VideoCard = memo(function VideoCard({
	video,
	buttonCount,
	variant = "grid",
	priority = false,
}: VideoCardProps) {
	const { data: session } = useSession();
	const router = useRouter();
	const isGrid = variant === "grid";

	// 音声ボタン数: video.audioButtonCountを優先し、なければbuttonCountを使用
	const actualButtonCount = video.audioButtonCount ?? buttonCount ?? 0;

	// メモ化: 日付フォーマットを最適化（ライブ配信は配信開始時間を優先）
	const { formattedDate, displayLabel, dateTimeValue } = useMemo(() => {
		// ライブ配信アーカイブの場合は配信開始時間を使用
		const isLiveStream = video.liveStreamingDetails?.actualStartTime;
		const streamStartTime = video.liveStreamingDetails?.actualStartTime;

		if (isLiveStream && streamStartTime) {
			try {
				const date = new Date(streamStartTime);
				// Invalid Dateチェックを追加
				if (Number.isNaN(date.getTime())) {
					// 配信開始時間が無効な場合は公開時間にフォールバック
				} else {
					return {
						formattedDate: date.toLocaleDateString("ja-JP", {
							timeZone: "Asia/Tokyo",
							year: "numeric",
							month: "2-digit",
							day: "2-digit",
						}),
						displayLabel: "配信開始",
						dateTimeValue: streamStartTime,
					};
				}
			} catch {
				// 配信開始時間の解析に失敗した場合は公開時間にフォールバック
			}
		}

		// 通常動画または配信開始時間が無効な場合は公開時間を使用
		try {
			const date = new Date(video.publishedAt);
			// Invalid Dateチェックを追加
			if (Number.isNaN(date.getTime())) {
				return {
					formattedDate: video.publishedAt,
					displayLabel: "公開日",
					dateTimeValue: video.publishedAt,
				};
			}
			return {
				formattedDate: date.toLocaleDateString("ja-JP", {
					timeZone: "Asia/Tokyo",
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
				}),
				displayLabel: "公開日",
				dateTimeValue: video.publishedAt,
			};
		} catch {
			return {
				formattedDate: video.publishedAt,
				displayLabel: "公開日",
				dateTimeValue: video.publishedAt,
			};
		}
	}, [video.publishedAt, video.liveStreamingDetails?.actualStartTime]);

	// メモ化: YouTube URLを最適化
	const _youtubeUrl = useMemo(
		() => `https://youtube.com/watch?v=${video.videoId}`,
		[video.videoId],
	);

	// メモ化: YouTubeカテゴリ名取得
	const categoryName = useMemo(() => {
		return getYouTubeCategoryName(video.categoryId);
	}, [video.categoryId]);

	// タグクリック時の検索ページ遷移
	const handleTagClick = useCallback(
		(tag: string, layer: "playlist" | "user" | "category") => {
			const params = new URLSearchParams();
			params.set("q", tag);
			params.set("type", "videos");

			// 層に応じたフィルターパラメータを設定
			switch (layer) {
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

			router.push(`/search?${params.toString()}`);
		},
		[router],
	);

	// メモ化: 音声ボタン作成可能判定（認証状態も考慮）
	const canCreateButtonData = useMemo(() => {
		// ログインしていない場合
		if (!session?.user) {
			return {
				canCreate: false,
				reason: "音声ボタンを作成するにはすずみなふぁみりーメンバーとしてログインが必要です",
			};
		}

		// 動画の条件をチェック
		const videoCanCreate = canCreateAudioButton(video);
		if (!videoCanCreate) {
			const reason =
				getAudioButtonCreationErrorMessage(video) ||
				"音声ボタンを作成できるのは配信アーカイブのみです";
			return {
				canCreate: false,
				reason,
			};
		}

		return { canCreate: true, reason: undefined };
	}, [video, session?.user]);

	const canCreateButton = canCreateButtonData.canCreate;

	// メモ化: 動画タイプバッジの情報
	const videoBadgeInfo = useMemo(() => {
		return getVideoBadgeInfo(video);
	}, [video]);

	return (
		<article
			className="hover:shadow-lg transition-shadow group border bg-card text-card-foreground rounded-lg shadow-sm h-full flex flex-col"
			aria-labelledby={`video-title-${video.id}`}
		>
			<div className="flex flex-col h-full">
				<div className="relative">
					<Link
						href={`/videos/${video.id}`}
						className="block relative"
						aria-describedby={`video-desc-${video.id}`}
					>
						<div className="relative aspect-[16/9] bg-black rounded-t-lg overflow-hidden">
							<ThumbnailImage
								src={video.thumbnailUrl}
								alt={`${video.title}のサムネイル画像`}
								className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
								priority={priority}
								width={384}
								height={216}
								sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
								quality={priority ? 90 : 80}
								loading={priority ? "eager" : "lazy"}
							/>
						</div>
					</Link>
					<div className="absolute bottom-2 right-2">
						<Badge className={videoBadgeInfo.className} aria-label={videoBadgeInfo.ariaLabel}>
							{React.createElement(videoBadgeInfo.icon, {
								className: "h-3 w-3 mr-1",
								"aria-hidden": "true",
							})}
							{videoBadgeInfo.text}
						</Badge>
					</div>
					{actualButtonCount > 0 && (
						<div className="absolute top-2 left-2">
							<Badge
								variant="secondary"
								className="bg-white/90 text-foreground"
								aria-label={`${actualButtonCount}個の音声ボタンが作成されています`}
							>
								{actualButtonCount} ボタン
							</Badge>
						</div>
					)}
				</div>
				<div className="p-4 flex flex-col flex-1">
					<Link href={`/videos/${video.id}`} className="block group">
						<h3
							id={`video-title-${video.id}`}
							className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-foreground/80 transition-colors text-foreground"
						>
							{video.title}
						</h3>
					</Link>
					<p
						id={`video-desc-${video.id}`}
						className="text-sm text-muted-foreground mb-3 line-clamp-2 flex-1"
					>
						{video.description}
					</p>
					<div className="flex items-center text-sm text-muted-foreground mb-3">
						<Calendar className="h-4 w-4 mr-1" aria-hidden="true" />
						<time dateTime={dateTimeValue} title={`${displayLabel}: ${formattedDate}`}>
							{formattedDate}
						</time>
					</div>

					{/* タグ表示（一列・コンパクト） */}
					<div className="mb-4">
						<ThreeLayerTagDisplay
							playlistTags={video.playlistTags || []}
							userTags={video.userTags || []}
							categoryId={video.categoryId}
							categoryName={categoryName || undefined}
							size="sm"
							maxTagsPerLayer={5}
							showEmptyLayers={false}
							showCategory={true}
							compact={true}
							onTagClick={handleTagClick}
						/>
					</div>

					{/* アクションボタン */}
					{isGrid ? (
						canCreateButton ? (
							<fieldset className="flex gap-2" aria-label="動画アクション">
								<Button
									size="sm"
									variant="outline"
									className="flex-1 border text-muted-foreground hover:bg-accent min-h-[44px] text-sm"
									asChild
								>
									<Link href={`/videos/${video.id}`} aria-describedby={`video-title-${video.id}`}>
										<Eye className="h-4 w-4 mr-1" aria-hidden="true" />
										詳細を見る
									</Link>
								</Button>
								<Button size="sm" variant="default" className="flex-1 min-h-[44px] text-sm" asChild>
									<Link
										href={`/buttons/create?video_id=${video.id}`}
										aria-label={`${video.title}の音声ボタンを作成`}
										className="flex items-center whitespace-nowrap"
									>
										<Plus className="h-4 w-4 mr-1" aria-hidden="true" />
										ボタン作成
									</Link>
								</Button>
							</fieldset>
						) : (
							<Button
								size="sm"
								variant="outline"
								className="w-full border text-muted-foreground hover:bg-accent min-h-[44px] text-sm"
								asChild
							>
								<Link href={`/videos/${video.id}`} aria-describedby={`video-title-${video.id}`}>
									<Eye className="h-4 w-4 mr-1" aria-hidden="true" />
									詳細を見る
								</Link>
							</Button>
						)
					) : (
						<Button
							variant="outline"
							size="sm"
							className="w-full border text-muted-foreground hover:bg-accent min-h-[44px]"
							asChild
						>
							<Link href={`/videos/${video.id}`} aria-describedby={`video-title-${video.id}`}>
								<ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
								動画を見る
							</Link>
						</Button>
					)}
				</div>
			</div>
		</article>
	);
});

export default VideoCard;
