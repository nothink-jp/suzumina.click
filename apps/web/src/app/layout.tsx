import type { Metadata } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import "@suzumina.click/ui/globals.css";
import { Toaster } from "@suzumina.click/ui/components/ui/sonner";
import { Suspense } from "react";
import { GoogleAnalyticsScript } from "@/components/analytics/google-analytics-script";
import {
	GoogleTagManager,
	GoogleTagManagerNoscript,
} from "@/components/analytics/google-tag-manager";
import { AgeVerificationOverlayDeferred } from "@/components/consent/age-verification-overlay-deferred";
import { ConsentModeScript } from "@/components/consent/consent-mode-script";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import { DeferredGlobalEffects } from "@/components/system/deferred-global-effects";
import { SessionProvider } from "@/components/user/session-provider";
import { AgeVerificationProvider } from "@/contexts/age-verification-context";

/**
 * ブランドフォント M PLUS Rounded 1c（丸ゴシック）。
 * next/font で self-host し、body に className として当てる（globals.css の既定 body フォントを上書き）。
 * - CJK は巨大なため preload せず display:swap（初回はシステム丸ゴシックで即描画→差し替え）
 * - weight は実使用に限定（400/500/700。600=semibold は最寄りで合成）
 * - fallback は globals.css と同じシステム丸ゴシック系（未ロード/欠字/swap 中もブランド感を維持）
 */
const mPlusRounded = M_PLUS_Rounded_1c({
	weight: ["400", "500", "700"],
	subsets: ["latin"],
	display: "swap",
	preload: false,
	adjustFontFallback: false,
	fallback: [
		"Hiragino Maru Gothic ProN",
		"Meiryo",
		"BIZ UDGothic",
		"Hiragino Kaku Gothic ProN",
		"YuGothic",
		"system-ui",
		"sans-serif",
	],
});

export const metadata: Metadata = {
	title: {
		default: "すずみなくりっく！ - 涼花みなせファンサイト",
		template: "%s | すずみなくりっく！",
	},
	description:
		"涼花みなせさんの音声ボタンを楽しめる非公式ファンサイトです。YouTube動画から音声ボタンを作成・共有し、DLsite作品情報も閲覧できます。あーたたちが集まる、あーたたちのためのファンサイトです。",
	keywords: [
		"涼花みなせ",
		"音声ボタン",
		"ファンサイト",
		"声優",
		"ASMR",
		"YouTube",
		"DLsite",
		"あーたたち",
		"タイムスタンプ再生",
	],
	authors: [{ name: "suzumina.click" }],
	creator: "suzumina.click",
	metadataBase: new URL("https://suzumina.click"),
	openGraph: {
		type: "website",
		locale: "ja_JP",
		url: "https://suzumina.click",
		title: "すずみなくりっく！ - 涼花みなせファンサイト",
		description:
			"涼花みなせさんの音声ボタンを楽しめる非公式ファンサイトです。YouTube動画から音声ボタンを作成・共有し、DLsite作品情報も閲覧できます。",
		siteName: "suzumina.click",
		// og:image は app/opengraph-image.tsx（file-convention）が自動出力する。
		// 旧・手書きの /opengraph-image.png / /twitter-image.png は実体が無く404だった（SPR-171）
	},
	twitter: {
		card: "summary_large_image",
		title: "すずみなくりっく！ - 涼花みなせファンサイト",
		description:
			"涼花みなせさんの音声ボタンを楽しめる非公式ファンサイトです。YouTube動画から音声ボタンを作成・共有し、DLsite作品情報も閲覧できます。",
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
	category: "entertainment",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ja" className="scroll-smooth">
			<head>
				{/* Dark Reader / ダークモード拡張機能対策 */}
				<meta name="darkreader-lock" />
				<meta name="color-scheme" content="light dark" />
				<meta name="supported-color-schemes" content="light dark" />

				{/* preconnect: TCP + TLS ハンドシェイクまで事前確立 */}
				<link rel="preconnect" href="https://i.ytimg.com" />
				<link rel="preconnect" href="https://img.dlsite.jp" />
				<link rel="preconnect" href="https://www.googletagmanager.com" />
				{/* dns-prefetch: preconnect 非対応ブラウザ向けフォールバック */}
				<link rel="dns-prefetch" href="//i.ytimg.com" />
				<link rel="dns-prefetch" href="//img.dlsite.jp" />

				<ConsentModeScript />
				<GoogleAnalyticsScript />
				<GoogleTagManager />
			</head>
			<body
				className={`${mPlusRounded.className} min-h-screen flex flex-col antialiased gradient-bg`}
			>
				<GoogleTagManagerNoscript />
				<AgeVerificationProvider>
					<SessionProvider>
						{/* SiteHeader 自体は静的シェル。auth() 解決は内部の Suspense 境界で局所化されている */}
						<SiteHeader />
						<main id="main-content" className="flex-1 min-h-screen">
							{/* Cache Components 下では、ページが動的データを参照する場合 Suspense 境界が必須。
								個別ページで PPR したい場合はページ側でさらに細分化できる。
								main に min-h-screen を持たせ、Suspense 解決前後で main 高さが viewport を
								下回らないようにする。これにより footer が常に viewport 外に位置し、
								下位セクションのストリーミングによる累積シフトが footer の CLS に
								波及しないようにしている (SPR-9 Desktop CLS 0.486 対策) */}
							<Suspense fallback={null}>{children}</Suspense>
						</main>
						<SiteFooter />
						<Toaster />
						{/* 非クリティカルな全ページ client 副作用/UI を hydration 後に遅延ロード (SPR-81 WS-A) */}
						<DeferredGlobalEffects />
					</SessionProvider>
					<AgeVerificationOverlayDeferred />
				</AgeVerificationProvider>
			</body>
		</html>
	);
}
