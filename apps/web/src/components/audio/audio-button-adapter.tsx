import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { AudioButton } from "@suzumina.click/shared-types";
import { memo, useMemo } from "react";
import AudioButtonCard from "./audio-button-card";
import { AudioButtonList } from "./audio-button-list";

/**
 * 既存のFrontendAudioButtonDataをAudioButtonに変換するアダプター
 */
export function convertToAudioButton(audioButtonData: FrontendAudioButtonData): AudioButton {
	return AudioButton.fromLegacy({
		id: audioButtonData.id,
		title: audioButtonData.title,
		description: audioButtonData.description || undefined,
		tags: audioButtonData.tags || [],
		sourceVideoId: audioButtonData.sourceVideoId,
		sourceVideoTitle: audioButtonData.sourceVideoTitle || undefined,
		startTime: audioButtonData.startTime,
		endTime: audioButtonData.endTime || audioButtonData.startTime,
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
 * 複数のFrontendAudioButtonDataをAudioButton配列に変換
 */
export function convertToAudioButtonArray(
	audioButtonsData: FrontendAudioButtonData[],
): AudioButton[] {
	return audioButtonsData.map(convertToAudioButton);
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
 * FrontendAudioButtonDataを受け取り、AudioButtonに変換してAudioButtonCardに渡す
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
	const audioButtonEntity = useMemo(() => convertToAudioButton(audioButton), [audioButton]);

	return (
		<AudioButtonCard
			audioButton={audioButtonEntity}
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
 * FrontendAudioButtonData配列を受け取り、AudioButton配列に変換してAudioButtonListに渡す
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
	const audioButtonEntities = useMemo(
		() => convertToAudioButtonArray(audioButtons),
		[audioButtons],
	);

	// 既存データから状態マップを作成
	const playCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		audioButtons.forEach((ab) => {
			counts[ab.id] = ab.playCount || 0;
		});
		return counts;
	}, [audioButtons]);

	return (
		<AudioButtonList
			audioButtons={audioButtonEntities}
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
