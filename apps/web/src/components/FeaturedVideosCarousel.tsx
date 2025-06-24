import type { FrontendVideoData } from "@suzumina.click/shared-types/src/video";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@suzumina.click/ui/components/ui/carousel";
import VideoCard from "@/app/videos/components/VideoCard";

interface FeaturedVideosCarouselProps {
	videos: FrontendVideoData[];
}

export function FeaturedVideosCarousel({ videos }: FeaturedVideosCarouselProps) {
	if (videos.length === 0) {
		return (
			<div className="flex items-center justify-center min-h-[280px] bg-muted rounded-lg">
				<p className="text-muted-foreground">新着動画を読み込み中...</p>
			</div>
		);
	}

	return (
		<Carousel className="w-full">
			<CarouselContent className="-ml-2 md:-ml-4">
				{videos.map((video) => (
					<CarouselItem
						key={video.id}
						className="pl-2 md:pl-4 basis-full xs:basis-1/2 sm:basis-1/3 lg:basis-1/4 xl:basis-1/5"
					>
						<VideoCard video={video} />
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious className="left-2" />
			<CarouselNext className="right-2" />
		</Carousel>
	);
}
