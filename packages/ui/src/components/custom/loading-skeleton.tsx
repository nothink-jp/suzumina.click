/**
 * 遅延読み込みコンポーネントのローディングフォールバック
 * CLS (Cumulative Layout Shift) を防ぐため、正確なサイズを指定
 */

interface LoadingSkeletonProps {
	className?: string;
	height?: number;
	variant?: "carousel" | "form" | "menu" | "card" | "grid" | "list";
	count?: number;
}

export function LoadingSkeleton({
	className = "",
	height = 200,
	variant = "carousel",
	count = 6,
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
		case "grid":
			return (
				<div
					className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
					data-testid="loading-skeleton"
				>
					{Array.from({ length: count }).map((_, i) => (
						<div key={i} className="animate-pulse">
							<div className="bg-muted rounded-lg" style={{ height: `${height}px` }}>
								<div className="aspect-[16/9] bg-muted-foreground/20 rounded-t-lg" />
								<div className="p-4">
									<div className="h-5 bg-muted-foreground/20 rounded mb-2" />
									<div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-3" />
									<div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
								</div>
							</div>
						</div>
					))}
				</div>
			);
		case "list":
			return (
				<div className="space-y-4" data-testid="loading-skeleton">
					{Array.from({ length: count }).map((_, i) => (
						<div key={i} className="animate-pulse">
							<div className="bg-muted rounded-lg p-4" style={{ height: `${height}px` }}>
								<div className="flex gap-4">
									<div className="w-40 h-24 bg-muted-foreground/20 rounded" />
									<div className="flex-1">
										<div className="h-5 bg-muted-foreground/20 rounded mb-2" />
										<div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2" />
										<div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			);
		default:
			return (
				<div
					className={`animate-pulse bg-muted rounded-lg ${className}`}
					style={{ height: `${height}px` }}
					data-testid="loading-skeleton"
				/>
			);
	}
}
