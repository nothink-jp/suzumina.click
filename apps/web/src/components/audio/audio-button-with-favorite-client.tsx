"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { AudioButton } from "@suzumina.click/ui/components/custom/audio-button";
import { useRouter } from "next/navigation";
import { useAudioButtonEngagement } from "@/hooks/use-audio-button-engagement";
import { buildXShareUrl } from "@/lib/x-share";

/**
 * 一覧用 AudioButton の client island。
 * per-user 状態（お気に入り/高評価）の正本は use-audio-button-engagement（詳細/モーダルと共有・SPR-257）。
 */

interface AudioButtonWithFavoriteClientProps {
	audioButton: AudioButtonPlainObject;
	onPlay?: () => void;
	className?: string;
	maxTitleLength?: number;
	initialIsFavorited?: boolean;
	initialIsLiked?: boolean;
	searchQuery?: string;
	highlightClassName?: string;
}

export function AudioButtonWithFavoriteClient({
	audioButton,
	onPlay,
	className,
	maxTitleLength,
	initialIsFavorited = false,
	initialIsLiked = false,
	searchQuery,
	highlightClassName,
}: AudioButtonWithFavoriteClientProps) {
	const router = useRouter();
	const { isAuthenticated, isFavorited, toggleFavorite, isLiked, likeCount, toggleLike } =
		useAudioButtonEngagement(audioButton, { initialIsFavorited, initialIsLiked });

	return (
		<AudioButton
			audioButton={{
				...audioButton,
				stats: { ...audioButton.stats, likeCount },
			}}
			onPlay={onPlay}
			className={className}
			maxTitleLength={maxTitleLength}
			showDetailLink={true}
			onDetailClick={() => router.push(`/buttons/${audioButton.id}`)}
			isFavorite={isFavorited}
			onFavoriteToggle={toggleFavorite}
			isLiked={isLiked}
			onLikeToggle={toggleLike}
			searchQuery={searchQuery}
			highlightClassName={highlightClassName}
			isAuthenticated={isAuthenticated}
			xShareUrl={buildXShareUrl(audioButton.id, audioButton.buttonText)}
		/>
	);
}
