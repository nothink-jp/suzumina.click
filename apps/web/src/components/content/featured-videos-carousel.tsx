import type { FrontendVideoData } from "@suzumina.click/shared-types";
import { GenericCarousel } from "@suzumina.click/ui/components/custom/generic-carousel";
import VideoCard from "@/app/videos/components/VideoCard";
import { UI_MESSAGES } from "@/constants/ui-messages";

interface FeaturedVideosCarouselProps {
	videos: FrontendVideoData[];
}

export function FeaturedVideosCarousel({ videos }: FeaturedVideosCarouselProps) {
	return (
		<GenericCarousel
			items={videos}
			renderItem={(video, index) => <VideoCard video={video} priority={index < 3} />}
			emptyStateMessage={UI_MESSAGES.LOADING.GENERAL}
			getItemKey={(video) => video.id || video.videoId}
		/>
	);
}
