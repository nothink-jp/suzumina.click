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
				<div className={`animate-pulse ${className}`}>
					<div className="flex gap-4 overflow-hidden">
						{Array.from({ length: 4 }).map((_, i) => (
							<div
								key={i}
								className="flex-shrink-0 w-64 bg-gray-200 rounded-lg"
								style={{ height: `${height}px` }}
							/>
						))}
					</div>
				</div>
			);
		case "form":
			return (
				<div className={`animate-pulse ${className}`}>
					<div className="max-w-2xl mx-auto">
						<div className="h-12 bg-gray-200 rounded-lg mb-4" />
						<div className="h-10 bg-gray-200 rounded-lg" />
					</div>
				</div>
			);
		case "menu":
			return (
				<div className="animate-pulse">
					<div className="h-10 w-32 bg-gray-200 rounded" />
				</div>
			);
		case "card":
			return (
				<div className={`animate-pulse ${className}`}>
					<div className="bg-gray-200 rounded-lg p-4" style={{ height: `${height}px` }}>
						<div className="h-4 bg-gray-300 rounded mb-2" />
						<div className="h-4 bg-gray-300 rounded w-3/4 mb-2" />
						<div className="h-3 bg-gray-300 rounded w-1/2" />
					</div>
				</div>
			);
		default:
			return (
				<div
					className={`animate-pulse bg-gray-200 rounded-lg ${className}`}
					style={{ height: `${height}px` }}
				/>
			);
	}
}
