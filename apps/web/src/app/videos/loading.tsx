import { Card } from "@suzumina.click/ui/components/ui/card";
import { Skeleton } from "@suzumina.click/ui/components/ui/skeleton";

export default function VideosLoading() {
	return (
		<div className="container mx-auto px-4 py-8">
			{/* ページヘッダーのスケルトン */}
			<div className="mb-8 text-center space-y-4">
				<Skeleton className="h-10 w-48 mx-auto" />
				<Skeleton className="h-5 w-96 max-w-full mx-auto" />
			</div>

			{/* フィルターセクションのスケルトン */}
			<div className="flex flex-col sm:flex-row gap-4 mb-6">
				<Skeleton className="h-10 w-full sm:w-48" />
				<Skeleton className="h-10 w-full sm:w-32" />
			</div>

			{/* 動画グリッドのスケルトン */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{Array.from({ length: 6 }).map((_, index) => (
					<Card key={index} className="overflow-hidden animate-pulse">
						{/* サムネイルエリア */}
						<div className="relative aspect-video bg-gradient-to-br from-suzuka-100 to-minase-100">
							<Skeleton className="absolute inset-0" />
							<div className="absolute bottom-2 right-2">
								<Skeleton className="h-5 w-12" />
							</div>
						</div>

						{/* コンテンツエリア */}
						<div className="p-4 space-y-3">
							<Skeleton className="h-5 w-full" />
							<Skeleton className="h-4 w-4/5" />
							<div className="flex items-center justify-between">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-6 w-16" />
							</div>
						</div>
					</Card>
				))}
			</div>

			{/* ページネーションのスケルトン */}
			<div className="mt-8 flex justify-center gap-2">
				<Skeleton className="h-10 w-10" />
				<Skeleton className="h-10 w-10" />
				<Skeleton className="h-10 w-10" />
			</div>
		</div>
	);
}
