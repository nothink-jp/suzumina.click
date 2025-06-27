import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
import WorkCard from "@/app/works/components/WorkCard";
import { GenericCarousel } from "./GenericCarousel";

interface FeaturedWorksCarouselProps {
	works: FrontendDLsiteWorkData[];
}

export function FeaturedWorksCarousel({ works }: FeaturedWorksCarouselProps) {
	return (
		<GenericCarousel
			items={works}
			renderItem={(work) => <WorkCard work={work} />}
			emptyStateMessage="新着作品を読み込み中..."
			getItemKey={(work) => work.id}
		/>
	);
}
