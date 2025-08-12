import type { WorkPlainObject } from "@suzumina.click/shared-types";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@suzumina.click/ui/components/ui/carousel";
import WorkCard from "@/app/works/components/WorkCard";
import { UI_MESSAGES } from "@/constants/ui-messages";

interface FeaturedWorksCarouselProps {
	works: WorkPlainObject[];
}

export function FeaturedWorksCarousel({ works }: FeaturedWorksCarouselProps) {
	if (works.length === 0) {
		return (
			<div className="flex items-center justify-center min-h-[240px] sm:min-h-[280px] bg-muted rounded-lg mx-2 sm:mx-0">
				<p className="text-muted-foreground text-center px-4">{UI_MESSAGES.LOADING.GENERAL}</p>
			</div>
		);
	}

	return (
		<Carousel
			className="w-full"
			opts={{
				align: "start",
				slidesToScroll: "auto",
				containScroll: "trimSnaps",
			}}
		>
			<CarouselContent className="-ml-2 md:-ml-4">
				{works.map((work, index) => (
					<CarouselItem
						key={work.id}
						className="pl-2 md:pl-4 min-w-0"
						style={{
							flexBasis: "clamp(240px, 45vw, 320px)",
							maxWidth: "320px",
						}}
					>
						<WorkCard
							work={work}
							priority={index < 3} // 最初の3つの画像のみプリロード
						/>
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious className="left-1 sm:left-2 h-10 w-10 sm:h-12 sm:w-12" />
			<CarouselNext className="right-1 sm:right-2 h-10 w-10 sm:h-12 sm:w-12" />
		</Carousel>
	);
}
