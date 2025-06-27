import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Toaster } from "@suzumina.click/ui/components/ui/sonner";
import {
	BookOpen,
	Home,
	LayoutDashboard,
	LogOut,
	MessageSquare,
	Music,
	Play,
	Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
	const session = await auth();

	// 管理者以外は全て一般ページにリダイレクト（管理画面の存在を完全に隠蔽）
	if (!session?.user || session.user.role !== "admin") {
		// 未認証・非管理者問わず、存在しないページのように見せる
		redirect("/");
		return null; // このコードは実行されないが、TypeScript/テスト環境での安全性のため
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-suzuka-50/30 to-minase-50/30">
			<nav className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-suzuka-200/20 sticky top-0 z-50">
				<div className="max-w-7xl mx-auto px-4">
					<div className="flex h-16 items-center justify-between">
						{/* ロゴ・タイトル */}
						<div className="flex items-center space-x-4">
							<Link href="/admin" className="flex items-center space-x-3 group">
								<div className="w-8 h-8 bg-gradient-to-r from-suzuka-500 to-minase-500 rounded-lg flex items-center justify-center">
									<LayoutDashboard className="w-5 h-5 text-white" />
								</div>
								<div>
									<h1 className="text-xl font-bold bg-gradient-to-r from-suzuka-600 to-minase-600 bg-clip-text text-transparent">
										管理画面
									</h1>
									<p className="text-xs text-muted-foreground">suzumina.click</p>
								</div>
							</Link>
						</div>

						{/* ナビゲーション */}
						<div className="hidden md:flex items-center space-x-1">
							<Button variant="ghost" size="sm" asChild>
								<Link href="/admin" className="flex items-center gap-2">
									<LayoutDashboard className="h-4 w-4" />
									ダッシュボード
								</Link>
							</Button>
							<Button variant="ghost" size="sm" asChild>
								<Link href="/admin/users" className="flex items-center gap-2">
									<Users className="h-4 w-4" />
									ユーザー
								</Link>
							</Button>
							<Button variant="ghost" size="sm" asChild>
								<Link href="/admin/videos" className="flex items-center gap-2">
									<Play className="h-4 w-4" />
									動画
								</Link>
							</Button>
							<Button variant="ghost" size="sm" asChild>
								<Link href="/admin/works" className="flex items-center gap-2">
									<BookOpen className="h-4 w-4" />
									作品
								</Link>
							</Button>
							<Button variant="ghost" size="sm" asChild>
								<Link href="/admin/buttons" className="flex items-center gap-2">
									<Music className="h-4 w-4" />
									音声ボタン
								</Link>
							</Button>
							<Button variant="ghost" size="sm" asChild>
								<Link href="/admin/contacts" className="flex items-center gap-2">
									<MessageSquare className="h-4 w-4" />
									お問い合わせ
								</Link>
							</Button>
						</div>

						{/* ユーザー情報・アクション */}
						<div className="flex items-center space-x-3">
							<div className="hidden sm:flex items-center space-x-2">
								<Badge variant="outline" className="bg-gradient-to-r from-suzuka-50 to-minase-50">
									{session.user.username || session.user.discordId}
								</Badge>
								<Badge variant="secondary">管理者</Badge>
							</div>

							<Button variant="ghost" size="sm" asChild>
								<Link href="/" className="flex items-center gap-2">
									<Home className="h-4 w-4" />
									<span className="hidden sm:inline">サイトへ</span>
								</Link>
							</Button>

							<Button variant="ghost" size="sm" asChild>
								<Link
									href="/auth/signout"
									className="flex items-center gap-2 text-muted-foreground hover:text-destructive"
								>
									<LogOut className="h-4 w-4" />
									<span className="hidden sm:inline">ログアウト</span>
								</Link>
							</Button>
						</div>
					</div>

					{/* モバイルナビゲーション */}
					<div className="md:hidden border-t border-suzuka-200/20 py-2">
						<div className="flex items-center space-x-1 overflow-x-auto">
							<Button variant="ghost" size="sm" asChild>
								<Link href="/admin" className="flex items-center gap-1 whitespace-nowrap">
									<LayoutDashboard className="h-3 w-3" />
									ダッシュボード
								</Link>
							</Button>
							<Button variant="ghost" size="sm" asChild>
								<Link href="/admin/users" className="flex items-center gap-1 whitespace-nowrap">
									<Users className="h-3 w-3" />
									ユーザー
								</Link>
							</Button>
							<Button variant="ghost" size="sm" asChild>
								<Link href="/admin/videos" className="flex items-center gap-1 whitespace-nowrap">
									<Play className="h-3 w-3" />
									動画
								</Link>
							</Button>
							<Button variant="ghost" size="sm" asChild>
								<Link href="/admin/works" className="flex items-center gap-1 whitespace-nowrap">
									<BookOpen className="h-3 w-3" />
									作品
								</Link>
							</Button>
							<Button variant="ghost" size="sm" asChild>
								<Link href="/admin/buttons" className="flex items-center gap-1 whitespace-nowrap">
									<Music className="h-3 w-3" />
									音声ボタン
								</Link>
							</Button>
							<Button variant="ghost" size="sm" asChild>
								<Link href="/admin/contacts" className="flex items-center gap-1 whitespace-nowrap">
									<MessageSquare className="h-3 w-3" />
									お問い合わせ
								</Link>
							</Button>
						</div>
					</div>
				</div>
			</nav>

			<main className="min-h-[calc(100vh-4rem)]">{children}</main>
			<Toaster />
		</div>
	);
}
