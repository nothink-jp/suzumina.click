import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { GenericCarousel } from "@suzumina.click/ui/components/custom/generic-carousel";
import { SimpleAudioButton } from "@suzumina.click/ui/components/custom/simple-audio-button";

interface FeaturedAudioButtonsCarouselProps {
	audioButtons: FrontendAudioButtonData[];
}

export function FeaturedAudioButtonsCarousel({ audioButtons }: FeaturedAudioButtonsCarouselProps) {
	return (
		<GenericCarousel
			items={audioButtons}
			renderItem={(audioButton) => (
				<div className="h-full min-h-[80px] flex">
					<SimpleAudioButton audioButton={audioButton} className="w-full" maxTitleLength={50} />
				</div>
			)}
			emptyStateMessage="新着音声ボタンを読み込み中..."
			getItemKey={(audioButton) => audioButton.id}
		/>
	);
}
