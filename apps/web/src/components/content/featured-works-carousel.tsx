import type { WorkPlainObject } from "@suzumina.click/shared-types";
import { GenericCarousel } from "@suzumina.click/ui/components/custom/generic-carousel";
import WorkCard from "@/app/works/components/WorkCard";
import { UI_MESSAGES } from "@/constants/ui-messages";

interface FeaturedWorksCarouselProps {
	works: WorkPlainObject[];
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
			emptyStateMessage={UI_MESSAGES.LOADING.GENERAL}
			getItemKey={(work) => work.id}
		/>
	);
}
