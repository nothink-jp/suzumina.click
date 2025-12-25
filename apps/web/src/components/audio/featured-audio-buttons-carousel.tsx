"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { useEffect, useMemo, useState } from "react";
import { UI_MESSAGES } from "@/constants/ui-messages";
import { useAudioButtonStatuses } from "@/hooks/use-audio-button-statuses";
import { AudioButtonWithPlayCount } from "./audio-button-with-play-count";

interface FeaturedAudioButtonsCarouselProps {
	audioButtons: AudioButtonPlainObject[];
}

export function FeaturedAudioButtonsCarousel({ audioButtons }: FeaturedAudioButtonsCarouselProps) {
	const [isMobile, setIsMobile] = useState(false);

	const audioButtonIds = useMemo(() => audioButtons.map((button) => button.id), [audioButtons]);

	const { likeDislikeStatuses, favoriteStatuses } = useAudioButtonStatuses(audioButtonIds);

	useEffect(() => {
		const checkMobile = () => setIsMobile(window.innerWidth < 640);
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	if (audioButtons.length === 0) {
		return (
			<div className="text-center py-12 sm:py-16 text-muted-foreground">
				<div className="text-lg sm:text-xl">{UI_MESSAGES.LOADING.GENERAL}</div>
			</div>
		);
	}

	return (
		<div className="flex flex-wrap gap-2 sm:gap-3 items-start justify-center">
			{audioButtons.map((audioButton) => {
				const likeDislikeStatus = likeDislikeStatuses[audioButton.id];
				const isFavorited = favoriteStatuses[audioButton.id] || false;

				return (
					<AudioButtonWithPlayCount
						key={audioButton.id}
						audioButton={audioButton}
						className="shadow-sm hover:shadow-md transition-all duration-200 min-w-0 flex-shrink-0"
						maxTitleLength={isMobile ? 30 : 50}
						initialIsFavorited={isFavorited}
						initialIsLiked={likeDislikeStatus?.isLiked || false}
						initialIsDisliked={likeDislikeStatus?.isDisliked || false}
					/>
				);
			})}
		</div>
	);
}
