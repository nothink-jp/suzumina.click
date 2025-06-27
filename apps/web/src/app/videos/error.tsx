"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent } from "@suzumina.click/ui/components/ui/card";
import { AlertCircle, Home, Play, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function VideosError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// エラーログを記録
		console.error("Videos page error:", error);
	}, [error]);

	return (
		<div className="container mx-auto px-4 py-16">
			<Card className="max-w-2xl mx-auto shadow-lg animate-in fade-in-0 zoom-in-95 duration-500">
				<CardContent className="p-8 text-center space-y-6">
					{/* エラーアイコン */}
					<div className="mx-auto w-16 h-16 bg-gradient-to-br from-suzuka-100 to-minase-100 rounded-full flex items-center justify-center">
						<AlertCircle className="w-8 h-8 text-suzuka-600" />
					</div>

					{/* エラーメッセージ */}
					<div className="space-y-2">
						<h1 className="text-2xl font-bold text-foreground">動画の読み込みに失敗しました</h1>
						<p className="text-muted-foreground">動画データの取得中にエラーが発生しました。</p>
						<p className="text-sm text-muted-foreground">
							ネットワーク接続をご確認の上、再度お試しください。
						</p>
					</div>

					{/* エラー詳細 */}
					{error.message && (
						<div className="p-4 bg-muted rounded-lg">
							<p className="text-sm text-muted-foreground">エラー詳細: {error.message}</p>
						</div>
					)}

					{/* アクションボタン */}
					<div className="space-y-3">
						<Button
							onClick={reset}
							className="w-full sm:w-auto bg-gradient-to-r from-suzuka-500 to-minase-500 hover:from-suzuka-600 hover:to-minase-600 text-white group"
						>
							<RefreshCw className="mr-2 h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
							再読み込み
						</Button>

						<div className="flex flex-col sm:flex-row gap-2 justify-center">
							<Button variant="outline" asChild>
								<Link href="/" className="flex items-center gap-2">
									<Home className="h-4 w-4" />
									ホームへ
								</Link>
							</Button>
							<Button variant="outline" asChild>
								<Link href="/videos" className="flex items-center gap-2">
									<Play className="h-4 w-4" />
									動画一覧トップ
								</Link>
							</Button>
						</div>
					</div>

					{/* 代替案内 */}
					<div className="pt-4 border-t">
						<p className="text-sm text-muted-foreground mb-2">他のコンテンツもご覧ください：</p>
						<div className="flex flex-wrap gap-2 justify-center">
							<Button variant="link" size="sm" asChild>
								<Link href="/buttons">音声ボタン</Link>
							</Button>
							<Button variant="link" size="sm" asChild>
								<Link href="/works">作品一覧</Link>
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
