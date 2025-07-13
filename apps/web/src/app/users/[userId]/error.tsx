"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { AlertTriangle, Home, RefreshCw, User } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { error as logError } from "@/lib/logger";

export default function UserProfileError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// ログエラー（開発環境のみ）
		if (process.env.NODE_ENV === "development") {
			logError("User profile error:", error);
		}
	}, [error]);

	return (
		<div className="min-h-screen bg-gradient-to-br from-suzuka-50/30 to-minase-50/30 flex items-center justify-center">
			<div className="container mx-auto px-4 py-8 max-w-2xl">
				<Card className="border-destructive/50">
					<CardHeader className="text-center">
						<div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
							<AlertTriangle className="w-8 h-8 text-destructive" />
						</div>
						<CardTitle className="text-xl text-destructive">
							プロフィールの読み込みに失敗しました
						</CardTitle>
					</CardHeader>
					<CardContent className="text-center space-y-6">
						<div className="space-y-2">
							<p className="text-muted-foreground">
								ユーザープロフィールの取得中にエラーが発生しました。
							</p>
							<p className="text-sm text-muted-foreground">
								ネットワーク接続を確認するか、しばらく時間をおいて再度お試しください。
							</p>
						</div>

						{/* 開発環境でのエラー詳細 */}
						{process.env.NODE_ENV === "development" && (
							<div className="bg-muted p-4 rounded-md text-left">
								<p className="text-sm font-mono text-destructive">{error.message}</p>
								{error.digest && (
									<p className="text-xs text-muted-foreground mt-2">Error ID: {error.digest}</p>
								)}
							</div>
						)}

						{/* アクションボタン */}
						<div className="flex flex-col sm:flex-row gap-3 justify-center">
							<Button onClick={reset} className="flex items-center gap-2">
								<RefreshCw className="w-4 h-4" />
								再試行
							</Button>
							<Button variant="outline" asChild>
								<Link href="/" className="flex items-center gap-2">
									<Home className="w-4 h-4" />
									ホームに戻る
								</Link>
							</Button>
							<Button variant="outline" asChild>
								<Link href="/users/me" className="flex items-center gap-2">
									<User className="w-4 h-4" />
									マイプロフィール
								</Link>
							</Button>
						</div>

						{/* ヘルプリンク */}
						<div className="pt-4 border-t">
							<p className="text-sm text-muted-foreground">
								問題が解決しない場合は{" "}
								<Link href="/contact" className="text-suzuka-600 hover:text-suzuka-700 underline">
									お問い合わせ
								</Link>{" "}
								からご連絡ください。
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
