"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { EmptyState } from "@suzumina.click/ui/components/custom";
import { Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAudioButtonStatuses } from "@/hooks/use-audio-button-statuses";
import { AudioButtonWithPlayCount } from "./audio-button-with-play-count";

export interface FeaturedAudioButtonsCarouselProps {
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
		return <EmptyState icon={<Volume2 className="h-6 w-6" />} title="音声ボタンがありません" />;
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
					/>
				);
			})}
		</div>
	);
}
