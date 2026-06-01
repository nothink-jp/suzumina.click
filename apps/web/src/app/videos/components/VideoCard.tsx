import type { VideoPlainObject } from "@suzumina.click/shared-types";
import { ThreeLayerTagDisplay } from "@suzumina.click/ui/components/custom/three-layer-tag-display";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { getYouTubeCategoryName } from "@suzumina.click/ui/lib/youtube-category-utils";
import { Calendar, Clock, Lock, Radio, Video } from "lucide-react";
import Link from "next/link";
import React from "react";
import ThumbnailImage from "@/components/ui/thumbnail-image";
import { buildTagSearchHref } from "@/lib/tag-search";
import VideoCardActions from "./VideoCardActions";

// 動画タイプ別バッジ情報（純関数）
function getVideoBadgeInfo(video: VideoPlainObject) {
	// VideoPlainObject は常に_computedプロパティを持つ
	const { videoType } = video._computed;
	switch (videoType) {
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
		case "possibly_live":
			return {
				text: "配信中（推定）",
				icon: Radio,
				className: "bg-red-600/90 text-white",
				ariaLabel: "配信中の可能性があるライブ配信",
			};
		case "archived":
			return {
				text: "配信アーカイブ",
				icon: Radio,
				className: "bg-gray-600/90 text-white",
				ariaLabel: "ライブ配信のアーカイブ",
			};
		case "premiere":
			return {
				text: "プレミア公開",
				icon: Video,
				className: "bg-purple-600/90 text-white",
				ariaLabel: "プレミア公開動画",
			};
		default:
			return {
				text: "通常動画",
				icon: Video,
				className: "bg-black/70 text-white",
				ariaLabel: "通常動画コンテンツ",
			};
	}
}

// 表示日付（純関数）: ライブ配信は配信開始時間を優先し、無効なら公開時間にフォールバック
function getDisplayDate(video: VideoPlainObject) {
	const formatJpDate = (value: string) =>
		new Date(value).toLocaleDateString("ja-JP", {
			timeZone: "Asia/Tokyo",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});

	const streamStartTime = video.liveStreamingDetails?.actualStartTime;
	if (streamStartTime) {
		const date = new Date(streamStartTime);
		if (!Number.isNaN(date.getTime())) {
			return {
				formattedDate: formatJpDate(streamStartTime),
				displayLabel: "配信開始",
				dateTimeValue: streamStartTime,
			};
		}
	}

	const publishedDate = new Date(video.publishedAt);
	if (Number.isNaN(publishedDate.getTime())) {
		// 無効な日付文字列はそのまま表示
		return {
			formattedDate: video.publishedAt,
			displayLabel: "公開日",
			dateTimeValue: video.publishedAt,
		};
	}
	return {
		formattedDate: formatJpDate(video.publishedAt),
		displayLabel: "公開日",
		dateTimeValue: video.publishedAt,
	};
}

interface VideoCardProps {
	video: VideoPlainObject;
	variant?: "grid" | "sidebar";
	priority?: boolean; // LCP画像最適化用
}

/**
 * 動画カード（server shell）。
 * 認証ゲートを伴うアクションは {@link VideoCardActions}（client island）に隔離し、
 * 本体は純表示に徹する。WorkCard と同じ「shell + island」構造。
 */
function VideoCard({ video, variant = "grid", priority = false }: VideoCardProps) {
	const actualButtonCount = video.audioButtonCount ?? 0;
	const { formattedDate, displayLabel, dateTimeValue } = getDisplayDate(video);
	const categoryName = getYouTubeCategoryName(video.categoryId);
	const videoBadgeInfo = getVideoBadgeInfo(video);

	return (
		<article
			className="hover:shadow-lg transition-shadow group border bg-card text-card-foreground rounded-lg shadow-sm h-full flex flex-col"
			aria-labelledby={`video-title-${video.id}`}
			data-testid="video-card"
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
								src={video._computed.thumbnailUrl}
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
								asChild
								variant="secondary"
								className="bg-white/90 text-foreground cursor-pointer hover:bg-white"
								aria-label={`${actualButtonCount}個の音声ボタン一覧を見る`}
							>
								<Link href={`/buttons?videoId=${video.id}`}>{actualButtonCount} ボタン</Link>
							</Badge>
						</div>
					)}
					{video.status?.embeddable === false && (
						<div className="absolute top-2 right-2">
							<Badge
								variant="destructive"
								className="bg-red-600/90 text-white"
								aria-label="埋め込み制限あり"
								title="この動画は埋め込みが制限されているため、音声ボタンを作成できません"
							>
								<Lock className="h-3 w-3 mr-1" aria-hidden="true" />
								埋め込み不可
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
							playlistTags={video.tags?.playlistTags || []}
							userTags={video.tags?.userTags || []}
							categoryId={video.categoryId}
							categoryName={categoryName || undefined}
							size="sm"
							maxTagsPerLayer={5}
							showEmptyLayers={false}
							showCategory={true}
							compact={true}
							tagHref={buildTagSearchHref}
						/>
					</div>

					{/* アクションボタン（認証ゲートは client island に隔離） */}
					<VideoCardActions video={video} variant={variant} />
				</div>
			</div>
		</article>
	);
}

export default VideoCard;
