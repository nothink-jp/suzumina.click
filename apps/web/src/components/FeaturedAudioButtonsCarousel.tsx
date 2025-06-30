"use client";

import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { useEffect, useState } from "react";
import { AudioButtonWithFavoriteClient } from "./AudioButtonWithFavoriteClient";

interface FeaturedAudioButtonsCarouselProps {
	audioButtons: FrontendAudioButtonData[];
}

export function FeaturedAudioButtonsCarousel({ audioButtons }: FeaturedAudioButtonsCarouselProps) {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkMobile = () => setIsMobile(window.innerWidth < 640);
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	if (audioButtons.length === 0) {
		return (
			<div className="text-center py-12 sm:py-16 text-muted-foreground">
				<div className="text-lg sm:text-xl">新着音声ボタンを読み込み中...</div>
			</div>
		);
	}

	return (
		<div className="flex flex-wrap gap-2 sm:gap-3 items-start justify-center sm:justify-start">
			{audioButtons.map((audioButton) => (
				<AudioButtonWithFavoriteClient
					key={audioButton.id}
					audioButton={audioButton}
					className="shadow-sm hover:shadow-md transition-all duration-200 min-w-0 flex-shrink-0"
					maxTitleLength={isMobile ? 30 : 50}
				/>
			))}
		</div>
	);
}
