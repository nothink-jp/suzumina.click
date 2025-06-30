import type { ReactNode } from "react";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "../ui/carousel";

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
			<div className="flex items-center justify-center min-h-[240px] sm:min-h-[280px] bg-muted rounded-lg mx-2 sm:mx-0">
				<p className="text-muted-foreground text-center px-4">{emptyStateMessage}</p>
			</div>
		);
	}

	return (
		<Carousel className="w-full">
			<CarouselContent className="-ml-1 sm:-ml-2 md:-ml-4">
				{items.map((item) => (
					<CarouselItem
						key={getItemKey(item)}
						className={`pl-1 sm:pl-2 md:pl-4 basis-full xs:basis-1/2 sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5 ${itemClassName || ""}`}
					>
						{renderItem(item)}
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious className="left-1 sm:left-2 h-10 w-10 sm:h-12 sm:w-12" />
			<CarouselNext className="right-1 sm:right-2 h-10 w-10 sm:h-12 sm:w-12" />
		</Carousel>
	);
}
