"use client";

import type { UserSession } from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/button";
import { Sheet, SheetContent, SheetTrigger } from "@suzumina.click/ui/components/sheet";
import { Menu } from "lucide-react";
import Link from "next/link";
import AuthButton from "./AuthButton";

interface MobileMenuProps {
	user?: UserSession | null;
}

export default function MobileMenu({ user }: MobileMenuProps) {
	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="outline" size="icon" className="md:hidden" aria-label="メニューを開く">
					<Menu className="h-5 w-5" aria-hidden="true" />
				</Button>
			</SheetTrigger>
			<SheetContent
				side="right"
				className="w-[300px] sm:w-[400px]"
				aria-label="モバイルナビゲーション"
			>
				<nav className="flex flex-col space-y-4 mt-8" aria-label="モバイルメニュー">
					<Link
						href="/videos"
						className="text-lg font-medium text-foreground hover:text-foreground/80 p-2 rounded transition-colors"
					>
						動画一覧
					</Link>
					<Link
						href="/buttons"
						className="text-lg font-medium text-foreground hover:text-foreground/80 p-2 rounded transition-colors"
					>
						ボタン検索
					</Link>
					<Link
						href="/works"
						className="text-lg font-medium text-foreground hover:text-foreground/80 p-2 rounded transition-colors"
					>
						作品一覧
					</Link>

					{/* ログイン時のみ表示されるメニュー */}
					{user && (
						<Link
							href="/users/me"
							className="text-lg font-medium text-foreground hover:text-foreground/80 p-2 rounded transition-colors"
						>
							マイページ
						</Link>
					)}

					{/* 認証ボタン */}
					<div className="mt-4 pt-4 border-t border-border">
						<AuthButton user={user} />
					</div>
				</nav>
			</SheetContent>
		</Sheet>
	);
}
