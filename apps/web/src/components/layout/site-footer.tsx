import { RabbitMark } from "@suzumina.click/ui/components/custom/brand-mark";
import Link from "next/link";
import { CookieSettingsLink } from "../consent/cookie-settings-link";

const FOOTER_LINKS = [
	{ href: "/about", label: "このサイトについて" },
	{ href: "/contact", label: "お問い合わせ" },
	{ href: "/terms", label: "利用規約" },
	{ href: "/privacy", label: "プライバシーポリシー" },
] as const;

/**
 * サイトフッター。Claude Design 案（Home Redesign）に合わせ、テーマ非依存の
 * 固定ブランド帯（minase-800 の暖色くすみ茶）として扱う（dark: 反転させない）。
 * サイト全体はまだダークモード切替 UI を持たないため、現時点では実害はない。
 */
export default function SiteFooter() {
	return (
		<footer className="bg-minase-800 text-minase-200 py-12 mt-auto">
			<div className="max-w-7xl mx-auto px-4">
				<div className="space-y-7">
					{/* サポート情報 + クッキー設定を横一列に */}
					<div className="flex flex-wrap justify-center gap-2">
						{FOOTER_LINKS.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								className="text-minase-200 hover:text-minase-50 transition-colors text-sm py-2 px-3.5 rounded-md hover:bg-minase-700 focus:bg-minase-700 focus:outline-none focus:ring-2 focus:ring-ring"
							>
								{link.label}
							</Link>
						))}
						<CookieSettingsLink />
					</div>

					{/* 下段：サイト名と説明文 */}
					<div className="text-center space-y-2">
						<div className="flex items-center justify-center gap-2">
							<RabbitMark size={20} className="text-minase-200" />
							<h2 className="font-extrabold text-lg text-minase-50">suzumina.click</h2>
						</div>
						<p className="text-minase-200 text-sm">
							ファンによる、ファンのためのコミュニティサイト
						</p>
						<p className="text-minase-300 text-xs">
							現在プレビューリリース中 - 閲覧・利用は誰でも、作成はすずみなふぁみりー限定
						</p>
					</div>
					<div className="border-t border-minase-700 pt-4 text-center text-sm text-minase-200">
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
		</footer>
	);
}
