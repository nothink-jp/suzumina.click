import { Card, CardContent, CardHeader } from "@suzumina.click/ui/components/ui/card";
import { Skeleton } from "@suzumina.click/ui/components/ui/skeleton";

export default function UserProfileLoading() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-suzuka-50/30 to-minase-50/30">
			<div className="container mx-auto px-4 py-8 max-w-6xl">
				{/* プロフィールヘッダー スケルトン */}
				<Card className="mb-8 overflow-hidden">
					<div className="bg-gradient-to-r from-suzuka-500/10 to-minase-500/10 p-6">
						<div className="flex flex-col md:flex-row items-start md:items-center gap-6">
							{/* アバター スケルトン */}
							<Skeleton className="w-30 h-30 rounded-full" />

							{/* ユーザー情報 スケルトン */}
							<div className="flex-1 space-y-4">
								<div className="space-y-2">
									<Skeleton className="h-8 w-48" />
									<Skeleton className="h-4 w-32" />
								</div>
								<div className="flex gap-4">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-6 w-20" />
								</div>
							</div>
						</div>
					</div>

					{/* 統計サマリー スケルトン */}
					<CardContent className="p-6">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							{/* biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loading */}
							{Array.from({ length: 4 }).map((_, i) => (
								<div key={`stat-skeleton-${i}-of-4`} className="text-center space-y-2">
									<Skeleton className="h-8 w-16 mx-auto" />
									<Skeleton className="h-4 w-20 mx-auto" />
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* タブナビゲーション スケルトン */}
				<div className="flex gap-2 mb-6">
					<Skeleton className="h-10 w-32" />
					<Skeleton className="h-10 w-24" />
				</div>

				{/* コンテンツエリア スケルトン */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{/* biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loading */}
					{Array.from({ length: 6 }).map((_, i) => (
						<Card key={`content-skeleton-${i}-of-6`}>
							<CardHeader>
								<Skeleton className="h-6 w-3/4" />
								<Skeleton className="h-4 w-1/2" />
							</CardHeader>
							<CardContent className="space-y-3">
								<Skeleton className="h-10 w-full" />
								<div className="flex justify-between">
									<Skeleton className="h-4 w-16" />
									<Skeleton className="h-4 w-12" />
								</div>
								<Skeleton className="h-4 w-full" />
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</div>
	);
}
