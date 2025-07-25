"use client";

import type { Video as VideoV2 } from "@suzumina.click/shared-types";
import { ThreeLayerTagDisplay } from "@suzumina.click/ui/components/custom/three-layer-tag-display";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Calendar, Clock, Eye, Plus, Radio, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import React, { memo, useCallback } from "react";
import ThumbnailImage from "@/components/ui/thumbnail-image";
import { useVideoV2 } from "@/hooks/use-video-v2";

interface VideoCardV2Props {
	video: VideoV2;
	audioButtonCount?: number;
	variant?: "grid" | "sidebar";
	priority?: boolean;
}

/**
 * Video V2 Entity用のカードコンポーネント
 * 既存のVideoCardとの互換性を保ちながら、新しいEntity構造に対応
 */
export const VideoCardV2 = memo(function VideoCardV2({
	video,
	audioButtonCount = 0,
	variant = "grid",
	priority = false,
}: VideoCardV2Props) {
	const { data: session } = useSession();
	const router = useRouter();
	const isGrid = variant === "grid";

	// useVideoV2フックを使用して必要な情報を取得
	const {
		youtubeUrl,
		thumbnailUrl,
		displayDate,
		dateLabel,
		videoBadgeInfo,
		isArchivedStream,
		categoryName,
		playlistTags,
		userTags,
		getTagSearchUrl,
	} = useVideoV2(video);

	// タグクリック時のハンドラー
	const handleTagClick = useCallback(
		(tag: string, layer: "playlist" | "user" | "category") => {
			const url = getTagSearchUrl(tag, layer);
			router.push(url);
		},
		[router, getTagSearchUrl],
	);

	// 音声ボタン作成可能かどうかの判定
	const canCreateButton = session?.user && isArchivedStream;
	const createButtonReason = !session?.user
		? "音声ボタンを作成するにはすずみなふぁみりーメンバーとしてログインが必要です"
		: !isArchivedStream
			? "音声ボタンを作成できるのは配信アーカイブのみです"
			: undefined;

	// 動画タイプに応じたアイコンコンポーネント
	const BadgeIcon =
		videoBadgeInfo.text === "配信中" || videoBadgeInfo.text === "配信アーカイブ"
			? Radio
			: videoBadgeInfo.text === "配信予告"
				? Clock
				: Video;

	return (
		<article
			className="hover:shadow-lg transition-shadow group border bg-card text-card-foreground rounded-lg shadow-sm h-full flex flex-col"
			aria-labelledby={`video-title-${video.id}`}
		>
			<div className="flex flex-col h-full">
				{/* サムネイル部分 */}
				<div className="relative">
					<Link
						href={`/videos/${video.id}`}
						className="block relative"
						aria-describedby={`video-desc-${video.id}`}
					>
						<div className="relative aspect-[16/9] bg-black rounded-t-lg overflow-hidden">
							<ThumbnailImage
								src={thumbnailUrl}
								alt={`${video.metadata.title.toString()}のサムネイル画像`}
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

					{/* 動画タイプバッジ */}
					<div className="absolute bottom-2 right-2">
						<Badge className={videoBadgeInfo.className} aria-label={videoBadgeInfo.ariaLabel}>
							<BadgeIcon className="h-3 w-3 mr-1" aria-hidden="true" />
							{videoBadgeInfo.text}
						</Badge>
					</div>

					{/* 音声ボタン数バッジ */}
					{audioButtonCount > 0 && (
						<div className="absolute top-2 left-2">
							<Badge
								variant="secondary"
								className="bg-white/90 text-foreground"
								aria-label={`${audioButtonCount}個の音声ボタンが作成されています`}
							>
								{audioButtonCount} ボタン
							</Badge>
						</div>
					)}
				</div>

				{/* コンテンツ部分 */}
				<div className="p-4 flex flex-col flex-1">
					<Link href={`/videos/${video.id}`} className="block group">
						<h3
							id={`video-title-${video.id}`}
							className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-foreground/80 transition-colors text-foreground"
						>
							{video.metadata.title.toString()}
						</h3>
					</Link>

					<p
						id={`video-desc-${video.id}`}
						className="text-sm text-muted-foreground mb-3 line-clamp-2 flex-1"
					>
						{video.metadata.description.toString()}
					</p>

					<div className="flex items-center text-sm text-muted-foreground mb-3">
						<Calendar className="h-4 w-4 mr-1" aria-hidden="true" />
						<time
							dateTime={video.content.publishedAt.toString()}
							title={`${dateLabel}: ${displayDate}`}
						>
							{displayDate}
						</time>
					</div>

					{/* タグ表示 */}
					<div className="mb-4">
						<ThreeLayerTagDisplay
							playlistTags={playlistTags}
							userTags={userTags}
							categoryId={video.channel.category?.toId() || ""}
							categoryName={categoryName}
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
										aria-label={`${video.metadata.title.toString()}の音声ボタンを作成`}
										className="flex items-center whitespace-nowrap"
									>
										<Plus className="h-4 w-4 mr-1" aria-hidden="true" />
										ボタン作成
									</Link>
								</Button>
							</fieldset>
						) : (
							<div>
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
								{createButtonReason && (
									<p className="text-xs text-muted-foreground mt-2 text-center">
										{createButtonReason}
									</p>
								)}
							</div>
						)
					) : (
						<Button
							variant="outline"
							size="sm"
							className="w-full border text-muted-foreground hover:bg-accent min-h-[44px]"
							asChild
						>
							<Link href={`/videos/${video.id}`} aria-describedby={`video-title-${video.id}`}>
								<Eye className="h-4 w-4 mr-2" aria-hidden="true" />
								動画を見る
							</Link>
						</Button>
					)}
				</div>
			</div>
		</article>
	);
});

export default VideoCardV2;
