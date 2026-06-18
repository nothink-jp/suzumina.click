import Link from "next/link";
import { CookieSettingsLink } from "../consent/cookie-settings-link";

export default function SiteFooter() {
	return (
		<footer className="bg-muted text-muted-foreground py-12 mt-auto border-t border-border">
			<div className="max-w-7xl mx-auto px-4">
				<div className="space-y-8">
					{/* サポート情報を横一列に */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
						<Link
							href="/about"
							className="text-muted-foreground hover:text-foreground transition-colors text-sm py-2 rounded-md hover:bg-accent focus:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
						>
							このサイトについて
						</Link>
						<Link
							href="/contact"
							className="text-muted-foreground hover:text-foreground transition-colors text-sm py-2 rounded-md hover:bg-accent focus:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
						>
							お問い合わせ
						</Link>
						<Link
							href="/terms"
							className="text-muted-foreground hover:text-foreground transition-colors text-sm py-2 rounded-md hover:bg-accent focus:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
						>
							利用規約
						</Link>
						<Link
							href="/privacy"
							className="text-muted-foreground hover:text-foreground transition-colors text-sm py-2 rounded-md hover:bg-accent focus:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
						>
							プライバシーポリシー
						</Link>
					</div>

					{/* クッキー設定リンク */}
					<div className="text-center">
						<CookieSettingsLink />
					</div>

					{/* 下段：サイト名と説明文 */}
					<div className="text-center space-y-4">
						<div>
							<h2 className="font-bold text-lg mb-2 text-foreground">suzumina.click</h2>
							<p className="text-muted-foreground text-sm">
								ファンによる、ファンのためのコミュニティサイト
							</p>
							<p className="text-muted-foreground text-xs mt-1 flex items-center justify-center gap-1">
								<span>🚀</span>
								現在プレビューリリース中 - 閲覧・利用は誰でも、作成はすずみなふぁみりー限定
							</p>
						</div>
						<div className="border-t border-border pt-4 text-sm text-muted-foreground">
							<p>
								&copy; 2025{" "}
								<Link href={"https://www.nothink.jp"} target="_blank">
									nothink.jp
								</Link>
								. このサイトは非公式のファンサイトです。
							</p>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}
