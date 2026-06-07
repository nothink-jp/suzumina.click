import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent } from "@suzumina.click/ui/components/ui/card";
import { AlertTriangle, Home, RotateCw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: "エラー | すずみなくりっく！",
	description: "認証中にエラーが発生しました。",
};

interface AuthErrorPageProps {
	searchParams: Promise<{ error?: string }>;
}

interface ErrorInfo {
	title: string;
	description: string;
	showRetry: boolean;
	showDiscordInfo: boolean;
}

function getErrorMessage(error: string | undefined): ErrorInfo {
	switch (error) {
		case "Configuration":
			return {
				title: "設定エラー",
				description: "認証設定に問題があります。管理者にお問い合わせください。",
				showRetry: false,
				showDiscordInfo: false,
			};
		case "AccessDenied":
			return {
				title: "アクセス拒否",
				description:
					"このサイトは「すずみなふぁみりー」Discordサーバーのメンバー限定です。先にDiscordサーバーにご参加してからお試しください。",
				showRetry: true,
				showDiscordInfo: true,
			};
		case "AccountDisabled":
			return {
				title: "アカウントが無効です",
				description:
					"このアカウントは現在ご利用いただけません。心当たりがない場合はお問い合わせください。",
				showRetry: false,
				showDiscordInfo: false,
			};
		case "Verification":
			return {
				title: "認証エラー",
				description: "認証プロセスでエラーが発生しました。時間をおいてから再度お試しください。",
				showRetry: true,
				showDiscordInfo: false,
			};
		default:
			return {
				title: "ログインエラー",
				description: "ログイン中にエラーが発生しました。もう一度お試しください。",
				showRetry: true,
				showDiscordInfo: false,
			};
	}
}

async function ErrorContent({ searchParams }: AuthErrorPageProps) {
	const { error } = await searchParams;
	const errorInfo = getErrorMessage(error);

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-suzuka-50 to-minase-50 px-4">
			<Card className="max-w-md w-full shadow-xl animate-in fade-in-0 zoom-in-95 duration-500">
				<CardContent className="p-8 text-center space-y-6">
					<div className="mx-auto w-16 h-16 bg-gradient-to-br from-suzuka-100 to-minase-100 rounded-full flex items-center justify-center">
						<AlertTriangle className="w-8 h-8 text-suzuka-600" />
					</div>

					<div className="space-y-2">
						<h1 className="text-2xl font-bold text-foreground">{errorInfo.title}</h1>
						<p className="text-muted-foreground">{errorInfo.description}</p>
					</div>

					{errorInfo.showDiscordInfo && (
						<div className="p-4 bg-minase-50 border border-minase-200 rounded-lg text-left">
							<p className="text-sm font-medium text-foreground mb-1">
								すずみなふぁみりー Discord サーバーについて
							</p>
							<p className="text-sm text-muted-foreground">
								涼花みなせさんのファンコミュニティサーバーです。参加方法は涼花みなせさんの配信やSNSでご確認ください。
							</p>
						</div>
					)}

					<div className="space-y-3">
						{errorInfo.showRetry && (
							<Button asChild className="w-full group">
								<Link href="/auth/signin" className="flex items-center gap-2">
									<RotateCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
									再度ログインを試す
								</Link>
							</Button>
						)}

						<Button variant="outline" asChild className="w-full group">
							<Link href="/" className="flex items-center gap-2">
								<Home className="h-4 w-4 group-hover:scale-110 transition-transform" />
								ホームに戻る
							</Link>
						</Button>
					</div>

					<div className="space-y-2 pt-4 border-t">
						<p className="text-sm text-muted-foreground">解決しない場合は</p>
						<Button variant="link" size="sm" asChild>
							<Link href="/contact">お問い合わせページ</Link>
						</Button>
					</div>

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

export default function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-suzuka-50 to-minase-50">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-suzuka-600 mx-auto" />
						<p className="mt-4 text-muted-foreground">読み込み中...</p>
					</div>
				</div>
			}
		>
			<ErrorContent searchParams={searchParams} />
		</Suspense>
	);
}
