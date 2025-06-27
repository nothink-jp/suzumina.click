import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@suzumina.click/ui/components/ui/carousel";
import type { ReactNode } from "react";

interface GenericCarouselProps<T> {
	items: T[];
	renderItem: (item: T) => ReactNode;
	emptyStateMessage: string;
	getItemKey: (item: T) => string;
	itemClassName?: string;
}

export function GenericCarousel<T>({
	items,
	renderItem,
	emptyStateMessage,
	getItemKey,
	itemClassName,
}: GenericCarouselProps<T>) {
	if (items.length === 0) {
		return (
			<div className="flex items-center justify-center min-h-[280px] bg-muted rounded-lg">
				<p className="text-muted-foreground">{emptyStateMessage}</p>
			</div>
		);
	}

	return (
		<Carousel className="w-full">
			<CarouselContent className="-ml-2 md:-ml-4">
				{items.map((item) => (
					<CarouselItem
						key={getItemKey(item)}
						className={`pl-2 md:pl-4 basis-full xs:basis-1/2 sm:basis-1/3 lg:basis-1/4 xl:basis-1/5 ${itemClassName || ""}`}
					>
						{renderItem(item)}
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious className="left-2" />
			<CarouselNext className="right-2" />
		</Carousel>
	);
}
