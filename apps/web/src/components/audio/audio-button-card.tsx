import type { AudioButton, FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { type AudioControls, AudioPlayer } from "@suzumina.click/ui/components/custom/audio-player";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Clock, Heart, Pause, Play, ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { memo, useCallback, useRef, useState } from "react";
import { useAudioButton } from "@/hooks/use-audio-button";

interface AudioButtonCardV2Props {
	audioButton: AudioButton;
	playCount?: number;
	isFavorited?: boolean;
	isLiked?: boolean;
	isDisliked?: boolean;
	onPlay?: () => void;
	onFavoriteToggle?: () => void;
	onLikeToggle?: () => void;
	onDislikeToggle?: () => void;
	className?: string;
	showStats?: boolean;
}

// AudioButtonからFrontendAudioButtonDataへの変換
function convertToFrontendData(
	audioButton: AudioButton,
	formattedDuration: string,
): FrontendAudioButtonData {
	return {
		id: audioButton.id.toString(),
		sourceVideoId: audioButton.reference.videoId.toString(),
		startTime: audioButton.reference.startTimestamp.toSeconds(),
		endTime:
			audioButton.reference.endTimestamp?.toSeconds() ??
			audioButton.reference.startTimestamp.toSeconds(),
		title: audioButton.content.text.toString(),
		tags: audioButton.content.tags.toArray(),
		createdBy: audioButton.createdBy.id,
		createdByName: audioButton.createdBy.name,
		playCount: audioButton.statistics.viewCount.toNumber(),
		likeCount: audioButton.statistics.likeCount.toNumber(),
		dislikeCount: audioButton.statistics.dislikeCount.toNumber(),
		favoriteCount: audioButton.favoriteCount,
		isPublic: audioButton.isPublic,
		createdAt: audioButton.createdAt.toISOString(),
		updatedAt: audioButton.updatedAt.toISOString(),
		durationText: formattedDuration,
		relativeTimeText: new Date(audioButton.createdAt).toLocaleDateString(),
	};
}

/**
 * AudioButton Card V2 コンポーネント
 * 新しいAudioButton V2 Entity構造に対応したカードコンポーネント
 */
export const AudioButtonCardV2 = memo(function AudioButtonCardV2({
	audioButton,
	playCount,
	isFavorited = false,
	isLiked = false,
	isDisliked = false,
	onPlay,
	onFavoriteToggle,
	onLikeToggle,
	onDislikeToggle,
	className = "",
	showStats = true,
}: AudioButtonCardV2Props) {
	const { data: session } = useSession();
	const router = useRouter();
	const [isPlaying, setIsPlaying] = useState(false);
	const isAuthenticated = !!session?.user;

	const {
		buttonText,
		tags,
		formattedDuration,
		timestampDisplay,
		formattedPlayCount,
		formattedLikeCount,
		youtubeUrl,
		getTagSearchUrl,
	} = useAudioButton(audioButton);

	// AudioPlayerのrefを作成
	const audioControlsRef = useRef<AudioControls>(null);

	// 再生ハンドラー
	const handlePlay = useCallback(() => {
		if (audioControlsRef.current?.isReady) {
			if (isPlaying) {
				audioControlsRef.current.pause();
			} else {
				audioControlsRef.current.play();
			}
		}
	}, [isPlaying]);

	// AudioPlayerコールバック
	const handleAudioPlay = useCallback(() => {
		setIsPlaying(true);
		onPlay?.();
	}, [onPlay]);

	const handleAudioPause = useCallback(() => {
		setIsPlaying(false);
	}, []);

	const handleAudioEnd = useCallback(() => {
		setIsPlaying(false);
	}, []);

	// タグクリックハンドラー
	const handleTagClick = useCallback(
		(tag: string) => {
			router.push(getTagSearchUrl(tag));
		},
		[router, getTagSearchUrl],
	);

	return (
		<article
			className={`group relative rounded-lg border bg-card p-4 transition-all hover:shadow-md ${className}`}
			aria-labelledby={`audio-button-${audioButton.id.toString()}`}
		>
			{/* ヘッダー部分 */}
			<div className="mb-3 flex items-start justify-between gap-2">
				<h3
					id={`audio-button-${audioButton.id.toString()}`}
					className="line-clamp-2 text-lg font-semibold"
				>
					{buttonText}
				</h3>
				{audioButton.isPublic ? (
					<Badge variant="outline" className="shrink-0">
						公開
					</Badge>
				) : (
					<Badge variant="secondary" className="shrink-0">
						非公開
					</Badge>
				)}
			</div>

			{/* ソース動画情報 */}
			<div className="mb-3 text-sm text-muted-foreground">
				<Link
					href={youtubeUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="hover:text-foreground hover:underline"
				>
					{audioButton.reference.videoTitle.toString()}
				</Link>
				<div className="mt-1 flex items-center gap-2 text-xs">
					<Clock className="h-3 w-3" />
					<span>{timestampDisplay}</span>
					<span>•</span>
					<span>{formattedDuration}</span>
				</div>
			</div>

			{/* タグ */}
			{tags.length > 0 && (
				<div className="mb-3 flex flex-wrap gap-1">
					{tags.map((tag) => (
						<button key={tag} type="button" onClick={() => handleTagClick(tag)} className="text-xs">
							<Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
								{tag}
							</Badge>
						</button>
					))}
				</div>
			)}

			{/* 統計情報 */}
			{showStats && (
				<div className="mb-3 flex items-center gap-4 text-sm text-muted-foreground">
					<div className="flex items-center gap-1">
						<Play className="h-3 w-3" />
						<span>{playCount?.toLocaleString() ?? formattedPlayCount}</span>
					</div>
					<div className="flex items-center gap-1">
						<ThumbsUp className="h-3 w-3" />
						<span>{formattedLikeCount}</span>
					</div>
				</div>
			)}

			{/* アクションボタン */}
			<div className="flex items-center gap-2">
				<Button size="sm" variant="default" onClick={handlePlay} className="flex-1">
					{isPlaying ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
					{isPlaying ? "一時停止" : "再生"}
				</Button>

				<Button
					size="sm"
					variant={isFavorited ? "secondary" : "outline"}
					onClick={onFavoriteToggle}
					disabled={!isAuthenticated}
					aria-label={isFavorited ? "お気に入りから削除" : "お気に入りに追加"}
				>
					<Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
				</Button>

				<Button
					size="sm"
					variant={isLiked ? "secondary" : "outline"}
					onClick={onLikeToggle}
					disabled={!isAuthenticated}
					aria-label={isLiked ? "いいねを取り消す" : "いいね"}
				>
					<ThumbsUp className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
				</Button>

				<Button
					size="sm"
					variant={isDisliked ? "secondary" : "outline"}
					onClick={onDislikeToggle}
					disabled={!isAuthenticated}
					aria-label={isDisliked ? "低評価を取り消す" : "低評価"}
				>
					<ThumbsDown className={`h-4 w-4 ${isDisliked ? "fill-current" : ""}`} />
				</Button>
			</div>

			{/* 作成者情報（フッター） */}
			<div className="mt-3 border-t pt-3 text-xs text-muted-foreground">
				<span>作成者: {audioButton.createdBy.name}</span>
			</div>

			{/* AudioPlayer（非表示） */}
			<AudioPlayer
				ref={audioControlsRef}
				audioButton={convertToFrontendData(audioButton, formattedDuration)}
				onPlay={handleAudioPlay}
				onPause={handleAudioPause}
				onEnd={handleAudioEnd}
			/>
		</article>
	);
});

export default AudioButtonCardV2;
