import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent } from "@suzumina.click/ui/components/ui/card";
import { Home, Search, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-suzuka-50 to-minase-50 px-4">
			<Card className="max-w-md w-full">
				<CardContent className="p-8 text-center space-y-6">
					{/* 404 デザイン */}
					<div className="space-y-2">
						<div className="text-8xl font-bold bg-gradient-to-r from-suzuka-500 to-minase-500 bg-clip-text text-transparent">
							404
						</div>
						<h1 className="text-2xl font-bold text-foreground">ページが見つかりません</h1>
						<p className="text-muted-foreground">
							お探しのページは存在しないか、移動された可能性があります。
						</p>
					</div>

					{/* ナビゲーションオプション */}
					<div className="space-y-3">
						<Button asChild className="w-full">
							<Link href="/" className="flex items-center gap-2">
								<Home className="h-4 w-4" />
								ホームに戻る
							</Link>
						</Button>

						<div className="grid grid-cols-2 gap-2">
							<Button variant="outline" size="sm" asChild>
								<Link href="/buttons" className="flex items-center gap-2">
									<Search className="h-4 w-4" />
									音声ボタン
								</Link>
							</Button>
							<Button variant="outline" size="sm" asChild>
								<Link href="/videos" className="flex items-center gap-2">
									<TrendingUp className="h-4 w-4" />
									動画一覧
								</Link>
							</Button>
						</div>

						<Button variant="ghost" size="sm" asChild>
							<Link href="/works">作品一覧</Link>
						</Button>
					</div>

					{/* 追加情報 */}
					<div className="pt-4 border-t text-xs text-muted-foreground">
						<p>suzumina.click - 非公式ファンサイト</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
