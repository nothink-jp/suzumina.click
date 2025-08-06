import { Card } from "@suzumina.click/ui/components/ui/card";
import { Skeleton } from "@suzumina.click/ui/components/ui/skeleton";

export default function ButtonsLoading() {
	return (
		<div className="container mx-auto px-4 py-8">
			{/* ページヘッダーのスケルトン */}
			<div className="mb-8 text-center space-y-4">
				<Skeleton className="h-10 w-64 mx-auto" />
				<Skeleton className="h-5 w-96 max-w-full mx-auto" />
			</div>

			{/* 検索・フィルターセクションのスケルトン */}
			<div className="mb-6 space-y-4">
				<Skeleton className="h-10 w-full max-w-2xl mx-auto" />
				<div className="flex flex-wrap gap-2 justify-center">
					{Array.from({ length: 5 }, (_, i) => `category-${i}`).map((key) => (
						<Skeleton key={key} className="h-8 w-20 rounded-full" />
					))}
				</div>
			</div>

			{/* 音声ボタングリッドのスケルトン */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
				{Array.from({ length: 12 }, (_, i) => `button-skeleton-${i}`).map((key) => (
					<Card key={key} className="p-4 animate-pulse">
						<div className="space-y-3">
							{/* ボタンエリア */}
							<div className="relative">
								<Skeleton className="h-20 w-full rounded-lg bg-gradient-to-br from-suzuka-100 to-minase-100" />
								<div className="absolute inset-0 flex items-center justify-center">
									<Skeleton className="h-10 w-10 rounded-full" />
								</div>
							</div>

							{/* タイトル・説明 */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-3 w-4/5" />
							</div>

							{/* メタ情報 */}
							<div className="flex items-center justify-between">
								<Skeleton className="h-3 w-16" />
								<Skeleton className="h-3 w-20" />
							</div>

							{/* タグ */}
							<div className="flex gap-1">
								<Skeleton className="h-5 w-12 rounded-full" />
								<Skeleton className="h-5 w-16 rounded-full" />
							</div>
						</div>
					</Card>
				))}
			</div>

			{/* ページネーションのスケルトン */}
			<div className="mt-8 flex justify-center items-center gap-2">
				<Skeleton className="h-10 w-10" />
				<Skeleton className="h-10 w-10 bg-suzuka-100" />
				<Skeleton className="h-10 w-10" />
				<Skeleton className="h-10 w-10" />
			</div>
		</div>
	);
}
