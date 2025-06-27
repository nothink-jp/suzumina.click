"use client";

import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent } from "@suzumina.click/ui/components/ui/card";
import { AlertTriangle, Home, RefreshCw, Send } from "lucide-react";
import { useEffect } from "react";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {}, []);

	return (
		<html lang="ja">
			<head>
				<title>エラーが発生しました | suzumina.click</title>
			</head>
			<body>
				<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-suzuka-50 via-red-50 to-minase-50 px-4">
					<Card className="max-w-md w-full shadow-xl animate-in fade-in-0 zoom-in-95 duration-500">
						<CardContent className="p-8 text-center space-y-6">
							{/* エラーアイコン */}
							<div className="relative">
								<div className="mx-auto w-16 h-16 bg-gradient-to-br from-suzuka-100 to-minase-100 rounded-full flex items-center justify-center animate-pulse">
									<AlertTriangle className="w-8 h-8 text-suzuka-600" />
								</div>
								<div className="absolute inset-0 mx-auto w-16 h-16 bg-gradient-to-br from-suzuka-100 to-minase-100 rounded-full blur-xl opacity-50" />
							</div>

							{/* エラーメッセージ */}
							<div className="space-y-2">
								<h1 className="text-2xl font-bold text-foreground">
									予期しないエラーが発生しました
								</h1>
								<p className="text-muted-foreground">
									申し訳ございません。システムで問題が発生しました。
								</p>
								<p className="text-sm text-muted-foreground">
									しばらく待ってから再度お試しください。
								</p>
							</div>

							{/* アクションボタン */}
							<div className="space-y-3">
								<Button
									onClick={reset}
									className="w-full bg-gradient-to-r from-suzuka-500 to-minase-500 hover:from-suzuka-600 hover:to-minase-600 text-white flex items-center gap-2 group"
								>
									<RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
									再試行する
								</Button>

								<Button variant="outline" className="w-full group" asChild>
									<a href="/" className="flex items-center gap-2">
										<Home className="h-4 w-4 group-hover:scale-110 transition-transform" />
										ホームに戻る
									</a>
								</Button>

								<Button variant="ghost" size="sm" className="w-full" asChild>
									<a href="/contact" className="flex items-center gap-2 text-xs">
										<Send className="h-3 w-3" />
										エラーを報告する
									</a>
								</Button>
							</div>

							{/* エラー詳細（開発環境のみ） */}
							{process.env.NODE_ENV === "development" && error && (
								<details className="mt-6 text-left">
									<summary className="cursor-pointer text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
										デバッグ情報 (開発環境のみ)
									</summary>
									<div className="mt-2 p-4 bg-muted rounded-lg space-y-2">
										<div>
											<p className="text-xs font-semibold text-muted-foreground">
												エラーメッセージ:
											</p>
											<p className="text-xs text-foreground break-words font-mono mt-1">
												{error.message || "メッセージなし"}
											</p>
										</div>
										{error.digest && (
											<div>
												<p className="text-xs font-semibold text-muted-foreground">エラーID:</p>
												<p className="text-xs text-foreground font-mono mt-1">{error.digest}</p>
											</div>
										)}
										{error.stack && (
											<div>
												<p className="text-xs font-semibold text-muted-foreground">
													スタックトレース:
												</p>
												<pre className="text-xs text-foreground overflow-x-auto mt-1 max-h-32 overflow-y-scroll">
													{error.stack}
												</pre>
											</div>
										)}
									</div>
								</details>
							)}

							{/* サイト情報 */}
							<div className="pt-4 border-t space-y-2">
								<div className="flex items-center justify-center gap-2">
									<Badge variant="outline" className="text-xs">
										涼花みなせ
									</Badge>
									<Badge variant="outline" className="text-xs">
										個人運営サイト
									</Badge>
								</div>
								<p className="text-xs text-muted-foreground">
									問題が継続する場合は、お問い合わせページからご連絡ください
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</body>
		</html>
	);
}
