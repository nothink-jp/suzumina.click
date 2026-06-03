import Link from "next/link";

const NAV_LINKS = [
	{ href: "/videos", label: "動画一覧" },
	{ href: "/buttons", label: "ボタン検索" },
	{ href: "/works", label: "作品一覧" },
] as const;

/**
 * デスクトップのグローバルナビゲーション。
 * ドロップダウンの無い静的リンクのため radix NavigationMenu は使わず素の nav にする。
 * radix NavigationMenu(Collection 機構)は本番ビルド(cacheComponents/PPR)で先頭 collection item の
 * anchor を prerender/hydration 時に脱落させる不具合があった（SPR-124）。
 * site-header から切り出して単体テストで実コードを描画できるようにしている（SPR-125）。
 */
export function DesktopNav() {
	return (
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
	);
}
