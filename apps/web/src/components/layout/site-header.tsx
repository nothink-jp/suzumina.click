import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
} from "@suzumina.click/ui/components/ui/navigation-menu";
import Link from "next/link";
import { auth } from "@/auth";
import AuthButton from "../user/auth-button";
import MobileMenu from "./mobile-menu";

export default async function SiteHeader() {
	const session = await auth();
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

						<div className="flex items-center space-x-4">
							{/* 認証ボタン */}
							<div className="hidden md:flex">
								<AuthButton user={session?.user} />
							</div>

							{/* モバイルメニュー */}
							<MobileMenu user={session?.user} />
						</div>
					</div>
				</div>
			</header>
		</>
	);
}
