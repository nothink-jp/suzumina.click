import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { SimpleAudioButton } from "@suzumina.click/ui/components/custom/simple-audio-button";

interface FeaturedAudioButtonsCarouselProps {
	audioButtons: FrontendAudioButtonData[];
}

export function FeaturedAudioButtonsCarousel({ audioButtons }: FeaturedAudioButtonsCarouselProps) {
	if (audioButtons.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">新着音声ボタンを読み込み中...</div>
		);
	}

	return (
		<div className="flex flex-wrap gap-3 items-start">
			{audioButtons.map((audioButton) => (
				<SimpleAudioButton
					key={audioButton.id}
					audioButton={audioButton}
					className="shadow-sm hover:shadow-md transition-all duration-200"
					maxTitleLength={50}
				/>
			))}
		</div>
	);
}
