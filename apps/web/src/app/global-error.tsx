"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent } from "@suzumina.click/ui/components/ui/card";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
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
			<body>
				<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 px-4">
					<Card className="max-w-md w-full">
						<CardContent className="p-8 text-center space-y-6">
							{/* エラーアイコン */}
							<div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
								<AlertTriangle className="w-8 h-8 text-red-600" />
							</div>

							{/* エラーメッセージ */}
							<div className="space-y-2">
								<h1 className="text-2xl font-bold text-gray-900">予期しないエラーが発生しました</h1>
								<p className="text-gray-600">
									申し訳ございません。システムで問題が発生しました。
									しばらく待ってから再度お試しください。
								</p>
							</div>

							{/* アクションボタン */}
							<div className="space-y-3">
								<Button
									onClick={reset}
									className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
								>
									<RefreshCw className="h-4 w-4" />
									再試行
								</Button>

								<Button variant="outline" className="w-full" asChild>
									<a href="/" className="flex items-center gap-2">
										<Home className="h-4 w-4" />
										ホームに戻る
									</a>
								</Button>
							</div>

							{/* デバッグ情報（開発環境のみ） */}
							{process.env.NODE_ENV === "development" && (
								<div className="mt-6 p-4 bg-gray-100 rounded-lg text-left">
									<h3 className="font-semibold text-sm text-gray-900 mb-2">
										デバッグ情報 (開発環境のみ)
									</h3>
									<p className="text-xs text-gray-600 break-words">{error.message}</p>
									{error.digest && (
										<p className="text-xs text-gray-500 mt-1">Error ID: {error.digest}</p>
									)}
								</div>
							)}

							{/* サイト情報 */}
							<div className="pt-4 border-t text-xs text-gray-500">
								<p>suzumina.click - 個人運営サイト</p>
								<p>問題が継続する場合は、お問い合わせページからご連絡ください</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</body>
		</html>
	);
}
