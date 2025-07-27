import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { AudioButton, type FirestoreServerAudioButtonData } from "@suzumina.click/shared-types";
import { memo, useMemo } from "react";
import AudioButtonCard from "./audio-button-card";
import { AudioButtonList } from "./audio-button-list";

/**
 * 既存のPlainObjectデータをAudioButtonに変換するアダプター
 */
export function convertToAudioButton(
	audioButtonData: AudioButtonPlainObject | FirestoreServerAudioButtonData,
): AudioButton | null {
	// AudioButtonPlainObject形式の場合（_computedプロパティがある）
	if ("_computed" in audioButtonData) {
		const plainObject = audioButtonData as AudioButtonPlainObject;
		const firestoreData: FirestoreServerAudioButtonData = {
			id: plainObject.id,
			title: plainObject.title,
			description: plainObject.description || undefined,
			tags: plainObject.tags || [],
			sourceVideoId: plainObject.sourceVideoId,
			sourceVideoTitle: plainObject.sourceVideoTitle || undefined,
			sourceVideoThumbnailUrl: plainObject.sourceVideoThumbnailUrl || undefined,
			startTime: plainObject.startTime,
			endTime: plainObject.endTime || plainObject.startTime,
			createdBy: plainObject.createdBy,
			createdByName: plainObject.createdByName,
			isPublic: plainObject.isPublic ?? true,
			playCount: plainObject.playCount || 0,
			likeCount: plainObject.likeCount || 0,
			dislikeCount: plainObject.dislikeCount || 0,
			favoriteCount: plainObject.favoriteCount || 0,
			createdAt: plainObject.createdAt,
			updatedAt: plainObject.updatedAt,
		};
		return AudioButton.fromFirestoreData(firestoreData);
	}

	// FirestoreServerAudioButtonData形式の場合
	return AudioButton.fromFirestoreData(audioButtonData as FirestoreServerAudioButtonData);
}

/**
 * 複数のAudioButtonPlainObjectをAudioButton配列に変換
 */
export function convertToAudioButtonArray(
	audioButtonsData: (AudioButtonPlainObject | FirestoreServerAudioButtonData)[],
): AudioButton[] {
	return audioButtonsData
		.map(convertToAudioButton)
		.filter((button): button is AudioButton => button !== null);
}

interface AudioButtonCardAdapterProps {
	audioButton: AudioButtonPlainObject | FirestoreServerAudioButtonData;
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
 * AudioButtonPlainObjectまたはFirestoreServerAudioButtonDataを受け取り、AudioButtonに変換してAudioButtonCardに渡す
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

	if (!audioButtonEntity) {
		return null;
	}

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
	audioButtons: (AudioButtonPlainObject | FirestoreServerAudioButtonData)[];
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
 * AudioButtonPlainObjectまたはFirestoreServerAudioButtonData配列を受け取り、AudioButton配列に変換してAudioButtonListに渡す
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
			if (ab.id) {
				counts[ab.id] = ab.playCount || 0;
			}
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
