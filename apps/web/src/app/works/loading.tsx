import { Card } from "@suzumina.click/ui/components/ui/card";
import { Skeleton } from "@suzumina.click/ui/components/ui/skeleton";

export default function WorksLoading() {
	return (
		<div className="container mx-auto px-4 py-8">
			{/* ページヘッダーのスケルトン */}
			<div className="mb-8 text-center space-y-4">
				<Skeleton className="h-10 w-48 mx-auto" />
				<Skeleton className="h-5 w-96 max-w-full mx-auto" />
			</div>

			{/* ソート・フィルターセクションのスケルトン */}
			<div className="flex flex-col sm:flex-row gap-4 mb-6">
				<Skeleton className="h-10 w-full sm:w-48" />
				<Skeleton className="h-10 w-full sm:w-32" />
			</div>

			{/* 作品グリッドのスケルトン */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{Array.from({ length: 9 }, (_, i) => `work-skeleton-${i}`).map((key) => (
					<Card key={key} className="overflow-hidden animate-pulse">
						{/* サムネイルエリア */}
						<div className="relative aspect-[3/4] bg-gradient-to-br from-suzuka-100 to-minase-100">
							<Skeleton className="absolute inset-0" />
							{/* 価格バッジ */}
							<div className="absolute top-2 right-2">
								<Skeleton className="h-6 w-20 rounded-full" />
							</div>
						</div>

						{/* コンテンツエリア */}
						<div className="p-4 space-y-3">
							{/* タイトル */}
							<Skeleton className="h-5 w-full" />
							<Skeleton className="h-4 w-3/4" />

							{/* 評価・価格 */}
							<div className="flex items-center justify-between">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-6 w-20" />
							</div>

							{/* タグ */}
							<div className="flex gap-2">
								<Skeleton className="h-5 w-16 rounded-full" />
								<Skeleton className="h-5 w-20 rounded-full" />
							</div>
						</div>
					</Card>
				))}
			</div>

			{/* ページネーションのスケルトン */}
			<div className="mt-8 flex justify-center items-center gap-4">
				<Skeleton className="h-10 w-24" />
				<div className="flex gap-2">
					<Skeleton className="h-10 w-10" />
					<Skeleton className="h-10 w-10" />
					<Skeleton className="h-10 w-10" />
				</div>
				<Skeleton className="h-10 w-24" />
			</div>
		</div>
	);
}
