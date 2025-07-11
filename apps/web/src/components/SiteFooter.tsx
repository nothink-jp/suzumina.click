import Link from "next/link";
import { CookieSettingsLink } from "./consent/CookieSettingsLink";

export default function SiteFooter() {
	return (
		<footer className="bg-minase-800 text-minase-50 py-12 mt-auto">
			<div className="max-w-7xl mx-auto px-4">
				<div className="space-y-8">
					{/* サポート情報を横一列に */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
						<Link
							href="/about"
							className="text-minase-200 hover:text-minase-50 transition-colors text-sm py-2 rounded-md hover:bg-minase-700 focus:bg-minase-700 focus:outline-none focus:ring-2 focus:ring-minase-500"
						>
							このサイトについて
						</Link>
						<Link
							href="/contact"
							className="text-minase-200 hover:text-minase-50 transition-colors text-sm py-2 rounded-md hover:bg-minase-700 focus:bg-minase-700 focus:outline-none focus:ring-2 focus:ring-minase-500"
						>
							お問い合わせ
						</Link>
						<Link
							href="/terms"
							className="text-minase-200 hover:text-minase-50 transition-colors text-sm py-2 rounded-md hover:bg-minase-700 focus:bg-minase-700 focus:outline-none focus:ring-2 focus:ring-minase-500"
						>
							利用規約
						</Link>
						<Link
							href="/privacy"
							className="text-minase-200 hover:text-minase-50 transition-colors text-sm py-2 rounded-md hover:bg-minase-700 focus:bg-minase-700 focus:outline-none focus:ring-2 focus:ring-minase-500"
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
							<h4 className="font-bold text-lg mb-2 text-minase-50">suzumina.click</h4>
							<p className="text-minase-200 text-sm">
								ファンによる、ファンのためのコミュニティサイト
							</p>
							<p className="text-minase-300 text-xs mt-1 flex items-center justify-center gap-1">
								<span>🚀</span>
								現在プレビューリリース中 - すずみなふぁみりー限定
							</p>
						</div>
						<div className="border-t border-minase-600 pt-4 text-sm text-minase-200">
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
