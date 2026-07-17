"use client";

import type { UserSession } from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@suzumina.click/ui/components/ui/sheet";
import { Menu } from "lucide-react";
import Link from "next/link";
import AuthButton from "../user/auth-button";

interface MobileMenuProps {
	user?: UserSession | null;
}

export default function MobileMenu({ user }: MobileMenuProps) {
	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button
					variant="outline"
					size="icon"
					className="md:hidden min-h-[44px] min-w-[44px]"
					aria-label="メニューを開く"
				>
					<Menu className="h-5 w-5" aria-hidden="true" />
				</Button>
			</SheetTrigger>
			<SheetContent
				side="right"
				className="w-[280px] sm:w-[320px] md:w-[400px]"
				aria-label="モバイルナビゲーション"
			>
				<nav className="flex flex-col space-y-2 mt-6" aria-label="モバイルメニュー">
					<Link
						href="/videos"
						className="text-lg font-medium text-foreground hover:text-foreground/80 hover:bg-accent min-h-[48px] px-4 py-3 rounded-lg transition-colors flex items-center"
					>
						📺 動画一覧
					</Link>
					<Link
						href="/buttons"
						className="text-lg font-medium text-foreground hover:text-foreground/80 hover:bg-accent min-h-[48px] px-4 py-3 rounded-lg transition-colors flex items-center"
					>
						🎵 ボタン検索
					</Link>
					<Link
						href="/works"
						className="text-lg font-medium text-foreground hover:text-foreground/80 hover:bg-accent min-h-[48px] px-4 py-3 rounded-lg transition-colors flex items-center"
					>
						🎧 作品一覧
					</Link>

					{/* ログイン時のみ表示されるメニュー */}
					{user && (
						<>
							<div className="border-t border-border my-2" />
							<Link
								href="/favorites"
								className="text-lg font-medium text-foreground hover:text-foreground/80 hover:bg-accent min-h-[48px] px-4 py-3 rounded-lg transition-colors flex items-center"
							>
								❤️ お気に入り
							</Link>
							<Link
								href="/users/me"
								className="text-lg font-medium text-foreground hover:text-foreground/80 hover:bg-accent min-h-[48px] px-4 py-3 rounded-lg transition-colors flex items-center"
							>
								👤 マイページ
							</Link>
							{/* 配信終了後も下書きの仕上げに戻れるよう常設する（動画カード側の導線は live/upcoming 時のみ） */}
							<Link
								href="/live"
								className="text-lg font-medium text-foreground hover:text-foreground/80 hover:bg-accent min-h-[48px] px-4 py-3 rounded-lg transition-colors flex items-center"
							>
								🔖 配信中マーキング
							</Link>
							<Link
								href="/settings"
								className="text-lg font-medium text-foreground hover:text-foreground/80 hover:bg-accent min-h-[48px] px-4 py-3 rounded-lg transition-colors flex items-center"
							>
								⚙️ 設定
							</Link>
						</>
					)}

					{/* 認証ボタン */}
					<div className="mt-6 pt-4 border-t border-border">
						<AuthButton user={user} />
					</div>
				</nav>
			</SheetContent>
		</Sheet>
	);
}
