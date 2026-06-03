import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import AuthButton from "../user/auth-button";
import MobileMenu from "./mobile-menu";

const NAV_LINKS = [
	{ href: "/videos", label: "動画一覧" },
	{ href: "/buttons", label: "ボタン検索" },
	{ href: "/works", label: "作品一覧" },
] as const;

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

						{/* デスクトップナビゲーション。
							ドロップダウンの無い静的リンクのため radix NavigationMenu は使わず素の nav にする。
							radix NavigationMenu(Collection 機構)は本番ビルド(cacheComponents/PPR)で
							先頭 collection item の anchor を prerender/hydration 時に脱落させる不具合があった（SPR-124 系）。 */}
						<nav className="hidden md:flex" aria-label="メインナビゲーション">
							<ul className="flex list-none items-center gap-1">
								{NAV_LINKS.map((item) => (
									<li key={item.href}>
										<Link
											href={item.href}
											className="inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
										>
											{item.label}
										</Link>
									</li>
								))}
							</ul>
						</nav>

						{/* 認証関連: wrapper の min-h で UserMenu (desktop ~52px) と
							MobileMenu (mobile 44px) と同じ高さを常に確保する。これにより
							Suspense リゾルブ前後でヘッダー全体の高さは変動せず CLS=0 を保てる。
							fallback は枠確保不要なので null で十分。 */}
						<div className="flex items-center space-x-4 min-h-[44px] md:min-h-[52px]">
							<Suspense fallback={null}>
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
