"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { BookOpen, Home, LogOut, MessageSquare, Music, Play, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export function AdminNavigation() {
	const pathname = usePathname();

	const navigationItems = [
		{
			href: "/",
			label: "ダッシュボード",
			icon: Home,
		},
		{
			href: "/users",
			label: "ユーザー管理",
			icon: Users,
		},
		{
			href: "/buttons",
			label: "音声ボタン管理",
			icon: Music,
		},
		{
			href: "/videos",
			label: "動画管理",
			icon: Play,
		},
		{
			href: "/works",
			label: "作品管理",
			icon: BookOpen,
		},
		{
			href: "/contacts",
			label: "お問い合わせ管理",
			icon: MessageSquare,
		},
	];

	const handleSignOut = async () => {
		await signOut({ callbackUrl: "/login" });
	};

	return (
		<nav className="bg-card border-b border-border px-4 py-3">
			<div className="flex items-center justify-between">
				{/* ロゴ・タイトル */}
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 bg-gradient-to-br from-suzuka-500 to-minase-500 rounded-lg flex items-center justify-center">
						<span className="text-white font-bold text-sm">S</span>
					</div>
					<div>
						<h1 className="text-lg font-bold">suzumina.click</h1>
						<p className="text-xs text-muted-foreground">管理システム</p>
					</div>
				</div>

				{/* ナビゲーションメニュー */}
				<div className="hidden md:flex items-center gap-2">
					{navigationItems.map((item) => {
						const Icon = item.icon;
						const isActive = pathname === item.href;

						return (
							<Button
								key={item.href}
								variant={isActive ? "default" : "ghost"}
								size="sm"
								asChild
								className="gap-2"
							>
								<Link href={item.href}>
									<Icon className="h-4 w-4" />
									{item.label}
								</Link>
							</Button>
						);
					})}
				</div>

				{/* ログアウトボタン */}
				<Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
					<LogOut className="h-4 w-4" />
					ログアウト
				</Button>
			</div>

			{/* モバイル用ナビゲーション - タッチ最適化 */}
			<div className="md:hidden mt-3 flex flex-wrap gap-3">
				{navigationItems.map((item) => {
					const Icon = item.icon;
					const isActive = pathname === item.href;

					return (
						<Button
							key={item.href}
							variant={isActive ? "default" : "ghost"}
							size="default"
							asChild
							className="gap-2 text-sm min-h-[44px] px-4"
						>
							<Link href={item.href}>
								<Icon className="h-4 w-4" />
								{item.label}
							</Link>
						</Button>
					);
				})}
			</div>
		</nav>
	);
}
