import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { SimpleAudioButton } from "@suzumina.click/ui/components/custom/simple-audio-button";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@suzumina.click/ui/components/ui/carousel";

interface FeaturedAudioButtonsCarouselProps {
	audioButtons: FrontendAudioButtonData[];
}

export function FeaturedAudioButtonsCarousel({ audioButtons }: FeaturedAudioButtonsCarouselProps) {
	if (audioButtons.length === 0) {
		return (
			<div className="flex items-center justify-center min-h-[280px] bg-muted rounded-lg">
				<p className="text-muted-foreground">新着音声ボタンを読み込み中...</p>
			</div>
		);
	}

	return (
		<Carousel className="w-full">
			<CarouselContent className="-ml-2 md:-ml-4">
				{audioButtons.map((audioButton) => (
					<CarouselItem
						key={audioButton.id}
						className="pl-2 md:pl-4 basis-full xs:basis-1/2 sm:basis-1/3 lg:basis-1/4 xl:basis-1/5"
					>
						<div className="h-full min-h-[80px] flex">
							<SimpleAudioButton audioButton={audioButton} className="w-full" maxTitleLength={50} />
						</div>
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious className="left-2" />
			<CarouselNext className="right-2" />
		</Carousel>
	);
}
