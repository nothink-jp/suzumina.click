"use client";

import type { UserSession } from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@suzumina.click/ui/components/ui/sheet";
import { Menu } from "lucide-react";
import Link from "next/link";
import { useDraftCount } from "@/hooks/use-draft-count";
import AuthButton from "../user/auth-button";

interface MobileMenuProps {
	user?: UserSession | null;
}

export default function MobileMenu({ user }: MobileMenuProps) {
	// 未仕上げの下書き件数 = 再訪の理由（導線再設計 段2）。未ログインは取得しない
	const draftCount = useDraftCount(!!user);
	return (
		<Sheet>
			<SheetTrigger
				render={
					<Button
						variant="outline"
						size="icon"
						className="md:hidden min-h-[44px] min-w-[44px]"
						aria-label="メニューを開く"
					>
						<Menu className="h-5 w-5" aria-hidden="true" />
					</Button>
				}
			/>
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
							{/* ナビが指すのは作業台（/watch）ではなく未完の荷物がある棚（/drafts）。件数バッジが再訪の理由になる */}
							<Link
								href="/drafts"
								className="text-lg font-medium text-foreground hover:text-foreground/80 hover:bg-accent min-h-[48px] px-4 py-3 rounded-lg transition-colors flex items-center"
							>
								🔖 マーク
								{draftCount != null && draftCount > 0 && (
									<span className="ml-2 rounded-full bg-heart text-heart-foreground text-xs px-2 py-0.5 min-w-[1.5rem] text-center">
										{draftCount}
									</span>
								)}
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
