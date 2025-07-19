/**
 * 遅延読み込みコンポーネントのローディングフォールバック
 * CLS (Cumulative Layout Shift) を防ぐため、正確なサイズを指定
 */

interface LoadingSkeletonProps {
	className?: string;
	height?: number;
	variant?: "carousel" | "form" | "menu" | "card";
}

export function LoadingSkeleton({
	className = "",
	height = 200,
	variant = "carousel",
}: LoadingSkeletonProps) {
	switch (variant) {
		case "carousel":
			return (
				<div
					className={`animate-pulse w-full ${className}`}
					data-testid="loading-skeleton-carousel"
				>
					{/* GenericCarouselのCarousel構造を模倣 */}
					<div className="relative">
						{/* CarouselContentと同じマージン設定 */}
						<div className="flex -ml-2 md:-ml-4 overflow-hidden">
							{Array.from({ length: 4 }).map((_, i) => (
								<div
									key={i}
									className="pl-2 md:pl-4 min-w-0"
									style={{
										// GenericCarouselのCarouselItemと同じサイズ設定
										flexBasis: "clamp(240px, 45vw, 320px)",
										maxWidth: "320px",
									}}
								>
									{/* 実際のカード構造を模倣 */}
									<div className="bg-muted rounded-lg w-full" style={{ height: `${height}px` }} />
								</div>
							))}
						</div>
					</div>
				</div>
			);
		case "form":
			return (
				<div className={`animate-pulse ${className}`} data-testid="loading-skeleton-form">
					<div className="max-w-2xl mx-auto">
						<div className="h-12 bg-muted rounded-lg mb-4" />
						<div className="h-10 bg-muted rounded-lg" />
					</div>
				</div>
			);
		case "menu":
			return (
				<div className="animate-pulse" data-testid="loading-skeleton-menu">
					<div className="h-10 w-32 bg-muted rounded" />
				</div>
			);
		case "card":
			return (
				<div className={`animate-pulse ${className}`} data-testid="loading-skeleton-card">
					<div className="bg-muted rounded-lg p-4" style={{ height: `${height}px` }}>
						<div className="h-4 bg-muted-foreground/20 rounded mb-2" />
						<div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2" />
						<div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
					</div>
				</div>
			);
		default:
			return (
				<div
					className={`animate-pulse bg-muted rounded-lg ${className}`}
					style={{ height: `${height}px` }}
				/>
			);
	}
}
