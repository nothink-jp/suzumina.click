import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { AudioButtonV2 } from "@suzumina.click/shared-types";
import { memo, useMemo } from "react";
import AudioButtonCardV2 from "./audio-button-card-v2";
import { AudioButtonListV2 } from "./audio-button-list-v2";

/**
 * 既存のFrontendAudioButtonDataをAudioButtonV2に変換するアダプター
 */
export function convertToAudioButtonV2(audioButtonData: FrontendAudioButtonData): AudioButtonV2 {
	return AudioButtonV2.fromLegacy({
		id: audioButtonData.id,
		title: audioButtonData.title,
		description: audioButtonData.description || undefined,
		tags: audioButtonData.tags || [],
		sourceVideoId: audioButtonData.sourceVideoId,
		sourceVideoTitle: audioButtonData.sourceVideoTitle || undefined,
		startTime: audioButtonData.startTime,
		endTime: audioButtonData.endTime,
		createdBy: audioButtonData.createdBy,
		createdByName: audioButtonData.createdByName,
		isPublic: audioButtonData.isPublic ?? true,
		playCount: audioButtonData.playCount || 0,
		likeCount: audioButtonData.likeCount || 0,
		dislikeCount: audioButtonData.dislikeCount || 0,
		favoriteCount: audioButtonData.favoriteCount || 0,
		createdAt: audioButtonData.createdAt,
		updatedAt: audioButtonData.updatedAt,
	});
}

/**
 * 複数のFrontendAudioButtonDataをAudioButtonV2配列に変換
 */
export function convertToAudioButtonV2Array(
	audioButtonsData: FrontendAudioButtonData[],
): AudioButtonV2[] {
	return audioButtonsData.map(convertToAudioButtonV2);
}

interface AudioButtonCardAdapterProps {
	audioButton: FrontendAudioButtonData;
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

/**
 * 既存のAudioButtonカードインターフェースに対応するアダプターコンポーネント
 * FrontendAudioButtonDataを受け取り、AudioButtonV2に変換してAudioButtonCardV2に渡す
 */
export const AudioButtonCardAdapter = memo(function AudioButtonCardAdapter({
	audioButton,
	playCount,
	isFavorited,
	isLiked,
	isDisliked,
	onPlay,
	onFavoriteToggle,
	onLikeToggle,
	onDislikeToggle,
	className,
	showStats,
}: AudioButtonCardAdapterProps) {
	const audioButtonV2 = useMemo(() => convertToAudioButtonV2(audioButton), [audioButton]);

	return (
		<AudioButtonCardV2
			audioButton={audioButtonV2}
			playCount={playCount ?? audioButton.playCount}
			isFavorited={isFavorited}
			isLiked={isLiked}
			isDisliked={isDisliked}
			onPlay={onPlay}
			onFavoriteToggle={onFavoriteToggle}
			onLikeToggle={onLikeToggle}
			onDislikeToggle={onDislikeToggle}
			className={className}
			showStats={showStats}
		/>
	);
});

interface AudioButtonListAdapterProps {
	audioButtons: FrontendAudioButtonData[];
	loading?: boolean;
	error?: string | null;
	onPlay?: (audioButtonId: string) => void;
	onFavoriteToggle?: (audioButtonId: string) => void;
	onLikeToggle?: (audioButtonId: string) => void;
	onDislikeToggle?: (audioButtonId: string) => void;
	className?: string;
	showStats?: boolean;
}

/**
 * 既存のAudioButtonリストインターフェースに対応するアダプターコンポーネント
 * FrontendAudioButtonData配列を受け取り、AudioButtonV2配列に変換してAudioButtonListV2に渡す
 */
export const AudioButtonListAdapter = memo(function AudioButtonListAdapter({
	audioButtons,
	loading,
	error,
	onPlay,
	onFavoriteToggle,
	onLikeToggle,
	onDislikeToggle,
	className,
	showStats,
}: AudioButtonListAdapterProps) {
	const audioButtonsV2 = useMemo(() => convertToAudioButtonV2Array(audioButtons), [audioButtons]);

	// 既存データから状態マップを作成
	const playCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		audioButtons.forEach((ab) => {
			counts[ab.id] = ab.playCount || 0;
		});
		return counts;
	}, [audioButtons]);

	return (
		<AudioButtonListV2
			audioButtons={audioButtonsV2}
			playCounts={playCounts}
			loading={loading}
			error={error}
			onPlay={onPlay}
			onFavoriteToggle={onFavoriteToggle}
			onLikeToggle={onLikeToggle}
			onDislikeToggle={onDislikeToggle}
			className={className}
			showStats={showStats}
		/>
	);
});
