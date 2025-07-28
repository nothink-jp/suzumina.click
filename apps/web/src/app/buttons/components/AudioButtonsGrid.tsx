"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { useMemo } from "react";
import { AudioButtonWithPlayCount } from "@/components/audio/audio-button-with-play-count";
import { useFavoriteStatusBulk } from "@/hooks/useFavoriteStatusBulk";

interface AudioButtonsGridProps {
	audioButtons: AudioButtonPlainObject[];
	searchQuery?: string;
}

export function AudioButtonsGrid({ audioButtons, searchQuery }: AudioButtonsGridProps) {
	// お気に入り状態一括取得
	const audioButtonIds = useMemo(() => audioButtons.map((button) => button.id), [audioButtons]);
	const { favoriteStates } = useFavoriteStatusBulk(audioButtonIds);

	return (
		<div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-suzuka-100 p-6">
			<div className="flex flex-wrap gap-3 items-start">
				{audioButtons.map((audioButton) => (
					<AudioButtonWithPlayCount
						key={audioButton.id}
						audioButton={audioButton}
						className="shadow-sm hover:shadow-md transition-all duration-200"
						searchQuery={searchQuery}
						highlightClassName="bg-suzuka-200 text-suzuka-900 px-0.5 rounded"
						initialIsFavorited={favoriteStates.get(audioButton.id) || false}
					/>
				))}
			</div>
		</div>
	);
}
