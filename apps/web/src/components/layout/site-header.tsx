import Link from "next/link";
import { DesktopNav } from "./desktop-nav";
import { SessionAwareControls } from "./session-aware-controls";

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

						<DesktopNav />

						{/* 認証関連: wrapper の min-h で UserMenu (desktop ~52px) と
							MobileMenu (mobile 44px) と同じ高さを常に確保する。これにより
							client island のセッション解決前後でヘッダー全体の高さは変動せず CLS=0 を保てる。
							SessionAwareControls は session を client 自己取得し SSR に焼かない（CDN 漏洩防止）。 */}
						<div className="flex items-center space-x-4 min-h-[44px] md:min-h-[52px]">
							<SessionAwareControls />
						</div>
					</div>
				</div>
			</header>
		</>
	);
}
