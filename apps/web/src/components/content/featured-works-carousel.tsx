import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
import { GenericCarousel } from "@suzumina.click/ui/components/custom/generic-carousel";
import WorkCard from "@/app/works/components/WorkCard";

interface FeaturedWorksCarouselProps {
	works: FrontendDLsiteWorkData[];
}

export function FeaturedWorksCarousel({ works }: FeaturedWorksCarouselProps) {
	return (
		<GenericCarousel
			items={works}
			renderItem={(work, index) => (
				<WorkCard
					work={work}
					priority={index < 3} // 最初の3つの画像のみプリロード
				/>
			)}
			emptyStateMessage="新着作品を読み込み中..."
			getItemKey={(work) => work.id}
		/>
	);
}
