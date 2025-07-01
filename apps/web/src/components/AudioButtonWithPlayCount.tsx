"use client";

import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { useEffect } from "react";
import { usePlayCount } from "@/hooks/usePlayCount";
import { AudioButtonWithFavoriteClient } from "./AudioButtonWithFavoriteClient";

interface AudioButtonWithPlayCountProps {
	audioButton: FrontendAudioButtonData;
	className?: string;
	maxTitleLength?: number;
	showFavorite?: boolean;
	initialIsFavorited?: boolean;
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
			searchQuery={searchQuery}
			highlightClassName={highlightClassName}
		/>
	);
}
