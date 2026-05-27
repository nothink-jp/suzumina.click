import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
} from "@suzumina.click/ui/components/ui/navigation-menu";
import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import AuthButton from "../user/auth-button";
import MobileMenu from "./mobile-menu";

export default function SiteHeader() {
	return (
		<>
			{/* スキップリンク */}
			<a href="#main-content" className="skip-link">
				メインコンテンツにスキップ
			</a>

			<header className="bg-background/95 backdrop-blur-sm border-b sticky top-0 z-50 shadow-sm critical-nav">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4">
							<Link
								href="/"
								className="text-2xl font-bold text-foreground hover:text-foreground/80 transition-colors"
								aria-label="すずみなくりっく！ ホームページへ"
							>
								すずみなくりっく！
							</Link>
						</div>

						{/* デスクトップナビゲーション */}
						<NavigationMenu className="hidden md:flex">
							<NavigationMenuList>
								<NavigationMenuItem>
									<NavigationMenuLink asChild>
										<Link href="/videos">動画一覧</Link>
									</NavigationMenuLink>
								</NavigationMenuItem>
								<NavigationMenuItem>
									<NavigationMenuLink asChild>
										<Link href="/buttons">ボタン検索</Link>
									</NavigationMenuLink>
								</NavigationMenuItem>
								<NavigationMenuItem>
									<NavigationMenuLink asChild>
										<Link href="/works">作品一覧</Link>
									</NavigationMenuLink>
								</NavigationMenuItem>
							</NavigationMenuList>
						</NavigationMenu>

						{/* 認証関連: auth() 解決を待つ間は同サイズのプレースホルダーを表示し、
							ヘッダー全体の高さは固定する。Suspense 境界をここに限定することで、
							ヘッダーのレイアウト・ロゴ・ナビは即座に静的シェルとして配信される。 */}
						<div className="flex items-center space-x-4">
							<Suspense fallback={<SessionControlsFallback />}>
								<SessionAwareControls />
							</Suspense>
						</div>
					</div>
				</div>
			</header>
		</>
	);
}

async function SessionAwareControls() {
	const session = await auth();
	return (
		<>
			{/* 認証ボタン */}
			<div className="hidden md:flex">
				<AuthButton user={session?.user} />
			</div>

			{/* モバイルメニュー */}
			<MobileMenu user={session?.user} />
		</>
	);
}

/**
 * SessionAwareControls の fallback。
 * AuthButton (desktop, h-10/w-32 相当) と MobileMenu button (mobile, h-11/w-11) と
 * 同じ占有面積のプレースホルダー枠で、Suspense リゾルブ時の CLS を防ぐ。
 */
function SessionControlsFallback() {
	return (
		<>
			<div className="hidden md:flex h-10 w-32" aria-hidden />
			<div className="md:hidden h-11 w-11" aria-hidden />
		</>
	);
}
