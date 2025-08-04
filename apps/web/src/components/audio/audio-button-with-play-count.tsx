"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { useEffect } from "react";
import { usePlayCount } from "@/hooks/use-play-count";
import { AudioButtonWithFavoriteClient } from "./audio-button-with-favorite-client";

interface AudioButtonWithPlayCountProps {
	audioButton: AudioButtonPlainObject;
	className?: string;
	maxTitleLength?: number;
	showFavorite?: boolean;
	initialIsFavorited?: boolean;
	initialIsLiked?: boolean;
	initialIsDisliked?: boolean;
	searchQuery?: string;
	highlightClassName?: string;
}

/**
 * Audio button wrapper that tracks play count increments
 */
export function AudioButtonWithPlayCount({
	audioButton,
	className,
	maxTitleLength,
	showFavorite = true,
	initialIsFavorited,
	initialIsLiked,
	initialIsDisliked,
	searchQuery,
	highlightClassName,
}: AudioButtonWithPlayCountProps) {
	const { handlePlay, cleanup } = usePlayCount();

	// Cleanup on unmount
	useEffect(() => {
		return cleanup;
	}, [cleanup]);

	return (
		<AudioButtonWithFavoriteClient
			audioButton={audioButton}
			onPlay={() => handlePlay(audioButton.id)}
			className={className}
			maxTitleLength={maxTitleLength}
			showFavorite={showFavorite}
			initialIsFavorited={initialIsFavorited}
			initialIsLiked={initialIsLiked}
			initialIsDisliked={initialIsDisliked}
			searchQuery={searchQuery}
			highlightClassName={highlightClassName}
		/>
	);
}
