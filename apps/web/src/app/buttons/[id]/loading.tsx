import { Card, CardContent, CardHeader } from "@suzumina.click/ui/components/ui/card";
import { Skeleton } from "@suzumina.click/ui/components/ui/skeleton";

/**
 * 詳細ページの遷移フォールバック。
 * 作成成功直後に `/buttons/[id]` へ遷移する際、新規ドキュメントの read-after-write で
 * RSC 取得に時間がかかる。loading が無いと遷移元（作成フォーム）が表示されたままになり、
 * 「作成画面に戻った」ように見えるため、即座にスケルトンへ差し替える。
 */
export default function AudioButtonDetailLoading() {
	return (
		<div className="min-h-screen">
			<div className="container mx-auto px-4 pt-6 pb-4 max-w-7xl">
				<Skeleton className="h-5 w-64" />
			</div>

			<div className="container mx-auto px-4 pb-8 max-w-7xl">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
					<div className="lg:col-span-2 space-y-4">
						<Card>
							<CardHeader>
								<Skeleton className="h-7 w-3/4" />
							</CardHeader>
							<CardContent className="space-y-4">
								<Skeleton className="h-24 w-full rounded-lg" />
								<div className="space-y-2">
									<Skeleton className="h-4 w-full" />
									<Skeleton className="h-4 w-5/6" />
								</div>
								<div className="flex gap-2">
									<Skeleton className="h-6 w-16 rounded-full" />
									<Skeleton className="h-6 w-20 rounded-full" />
								</div>
							</CardContent>
						</Card>
					</div>

					<div className="space-y-4">
						<Card>
							<CardContent className="p-4 space-y-3">
								<Skeleton className="aspect-video w-full rounded-lg" />
								<Skeleton className="h-4 w-4/5" />
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-4 flex items-center gap-3">
								<Skeleton className="h-10 w-10 rounded-full" />
								<Skeleton className="h-4 w-32" />
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
