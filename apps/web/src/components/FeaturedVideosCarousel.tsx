import type { FrontendVideoData } from "@suzumina.click/shared-types/src/video";
import { GenericCarousel } from "@suzumina.click/ui/components/custom/generic-carousel";
import VideoCard from "@/app/videos/components/VideoCard";

interface FeaturedVideosCarouselProps {
	videos: FrontendVideoData[];
}

export function FeaturedVideosCarousel({ videos }: FeaturedVideosCarouselProps) {
	return (
		<GenericCarousel
			items={videos}
			renderItem={(video) => <VideoCard video={video} />}
			emptyStateMessage="新着動画を読み込み中..."
			getItemKey={(video) => video.id}
		/>
	);
}
