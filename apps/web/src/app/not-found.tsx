import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent } from "@suzumina.click/ui/components/ui/card";
import { BookOpen, Home, Music, Play, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "404 - ページが見つかりません | suzumina.click",
	description: "お探しのページは見つかりませんでした。涼花みなせファンコミュニティサイト",
};

export default function NotFound() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-suzuka-50 to-minase-50 px-4">
			<Card className="max-w-md w-full shadow-xl animate-in fade-in-0 zoom-in-95 duration-500">
				<CardContent className="p-8 text-center space-y-6">
					{/* 404 デザイン */}
					<div className="space-y-4">
						<div className="relative">
							<div className="text-8xl font-bold bg-gradient-to-r from-suzuka-500 to-minase-500 bg-clip-text text-transparent animate-pulse">
								404
							</div>
							<div className="absolute inset-0 text-8xl font-bold bg-gradient-to-r from-suzuka-500 to-minase-500 bg-clip-text text-transparent blur-2xl opacity-50">
								404
							</div>
						</div>
						<h1 className="text-2xl font-bold text-foreground">ページが見つかりません</h1>
						<p className="text-muted-foreground">
							お探しのページは存在しないか、移動された可能性があります。
						</p>
					</div>

					{/* 人気のページ */}
					<div className="space-y-3">
						<h2 className="text-sm font-semibold text-muted-foreground">人気のページへ</h2>

						<Button asChild className="w-full group">
							<Link href="/" className="flex items-center gap-2">
								<Home className="h-4 w-4 group-hover:scale-110 transition-transform" />
								ホームに戻る
							</Link>
						</Button>

						<div className="grid grid-cols-3 gap-2">
							<Button variant="outline" size="sm" asChild className="group">
								<Link href="/buttons" className="flex flex-col items-center gap-1 py-3">
									<Music className="h-4 w-4 group-hover:scale-110 transition-transform" />
									<span className="text-xs">音声ボタン</span>
								</Link>
							</Button>
							<Button variant="outline" size="sm" asChild className="group">
								<Link href="/videos" className="flex flex-col items-center gap-1 py-3">
									<Play className="h-4 w-4 group-hover:scale-110 transition-transform" />
									<span className="text-xs">動画一覧</span>
								</Link>
							</Button>
							<Button variant="outline" size="sm" asChild className="group">
								<Link href="/works" className="flex flex-col items-center gap-1 py-3">
									<BookOpen className="h-4 w-4 group-hover:scale-110 transition-transform" />
									<span className="text-xs">作品一覧</span>
								</Link>
							</Button>
						</div>
					</div>

					{/* 追加のヘルプ */}
					<div className="space-y-2 pt-4 border-t">
						<p className="text-sm text-muted-foreground">お探しのものが見つからない場合は</p>
						<Button variant="link" size="sm" asChild>
							<Link href="/contact">
								<Search className="h-3 w-3 mr-1" />
								お問い合わせページ
							</Link>
						</Button>
					</div>

					{/* 追加情報 */}
					<div className="pt-4 border-t">
						<div className="flex items-center justify-center gap-2">
							<Badge variant="outline" className="text-xs">
								涼花みなせ
							</Badge>
							<Badge variant="outline" className="text-xs">
								非公式ファンサイト
							</Badge>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
