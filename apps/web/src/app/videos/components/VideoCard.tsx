import type { FrontendVideoData } from "@suzumina.click/shared-types/src/video";
import { canCreateAudioButton } from "@suzumina.click/shared-types/src/video";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Calendar, Clock, ExternalLink, Eye, Plus, Radio, Video } from "lucide-react";
import Link from "next/link";
import React, { memo, useMemo } from "react";
import ThumbnailImage from "@/components/ThumbnailImage";

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
			} catch {
				// 配信開始時間の解析に失敗した場合は公開時間にフォールバック
			}
		}

		// 通常動画または配信開始時間が無効な場合は公開時間を使用
		try {
			const date = new Date(video.publishedAt);
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

	// メモ化: 音声ボタン作成可能判定
	const canCreateButton = useMemo(() => canCreateAudioButton(video), [video]);

	// メモ化: 動画タイプバッジの情報
	const videoBadgeInfo = useMemo(() => {
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
				// videoType が"archived"の場合、または liveStreamingDetails に actualStartTime と actualEndTime がある場合は配信アーカイブ
				if (
					video.videoType === "archived" ||
					(video.liveStreamingDetails?.actualStartTime && video.liveStreamingDetails?.actualEndTime)
				) {
					return {
						text: "配信アーカイブ",
						icon: Radio,
						className: "bg-gray-600/90 text-white",
						ariaLabel: "ライブ配信のアーカイブ",
					};
				}
				return {
					text: "動画",
					icon: Video,
					className: "bg-black/70 text-white",
					ariaLabel: "動画コンテンツ",
				};
			default:
				return {
					text: "動画",
					icon: Video,
					className: "bg-black/70 text-white",
					ariaLabel: "動画コンテンツ",
				};
		}
	}, [
		video.liveBroadcastContent,
		video.videoType,
		video.liveStreamingDetails?.actualStartTime,
		video.liveStreamingDetails?.actualEndTime,
	]);

	return (
		<article
			className="hover:shadow-lg transition-shadow group border bg-card text-card-foreground rounded-lg shadow-sm"
			aria-labelledby={`video-title-${video.id}`}
		>
			<div className="p-0">
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
								sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
				<div className="p-4">
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
						className="text-sm text-muted-foreground mb-3 line-clamp-2"
					>
						{video.description}
					</p>
					<div className="flex items-center text-sm text-muted-foreground mb-3">
						<Calendar className="h-4 w-4 mr-1" aria-hidden="true" />
						<time dateTime={dateTimeValue} title={`${displayLabel}: ${formattedDate}`}>
							{formattedDate}
						</time>
					</div>

					{/* アクションボタン */}
					{isGrid ? (
						<fieldset className="flex gap-2" aria-label="動画アクション">
							<Button
								size="sm"
								variant="outline"
								className="flex-1 border text-muted-foreground hover:bg-accent min-h-[44px]"
								asChild
							>
								<Link href={`/videos/${video.id}`} aria-describedby={`video-title-${video.id}`}>
									<Eye className="h-4 w-4 mr-1" aria-hidden="true" />
									詳細を見る
								</Link>
							</Button>
							<Button
								size="sm"
								variant="default"
								className="flex-1 min-h-[44px]"
								disabled={!canCreateButton}
								asChild={canCreateButton}
								title={
									canCreateButton ? undefined : "音声ボタンを作成できるのは配信アーカイブのみです"
								}
							>
								{canCreateButton ? (
									<Link
										href={`/buttons/create?video_id=${video.id}`}
										aria-label={`${video.title}の音声ボタンを作成`}
										className="flex items-center whitespace-nowrap"
									>
										<Plus className="h-4 w-4 mr-1" aria-hidden="true" />
										ボタン作成
									</Link>
								) : (
									<span className="flex items-center whitespace-nowrap">
										<Plus className="h-4 w-4 mr-1" aria-hidden="true" />
										ボタン作成
									</span>
								)}
							</Button>
						</fieldset>
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
