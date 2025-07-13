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
	renderItem: (item: T, index: number) => ReactNode;
	emptyStateMessage: string;
	getItemKey: (item: T) => string;
	itemClassName?: string;
	cardMinWidth?: number; // カードの最小幅（px）
	cardMaxWidth?: number; // カードの最大幅（px）
}

export function GenericCarousel<T>({
	items,
	renderItem,
	emptyStateMessage,
	getItemKey,
	itemClassName,
	cardMinWidth = 280,
	cardMaxWidth = 320,
}: GenericCarouselProps<T>) {
	if (items.length === 0) {
		return (
			<div className="flex items-center justify-center min-h-[240px] sm:min-h-[280px] bg-muted rounded-lg mx-2 sm:mx-0">
				<p className="text-muted-foreground text-center px-4">{emptyStateMessage}</p>
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
				{items.map((item, index) => (
					<CarouselItem
						key={getItemKey(item)}
						className={`pl-2 md:pl-4 min-w-0 ${itemClassName || ""}`}
						style={{
							// カードの最小幅を指定し、画面幅に応じて柔軟に調整
							// 小さな画面: 最小240px、中間: 画面幅の40-50%、大きな画面: 最大値まで
							flexBasis: `clamp(240px, 45vw, ${cardMaxWidth}px)`,
							maxWidth: `${cardMaxWidth}px`,
						}}
					>
						{renderItem(item, index)}
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious className="left-1 sm:left-2 h-10 w-10 sm:h-12 sm:w-12" />
			<CarouselNext className="right-1 sm:right-2 h-10 w-10 sm:h-12 sm:w-12" />
		</Carousel>
	);
}
