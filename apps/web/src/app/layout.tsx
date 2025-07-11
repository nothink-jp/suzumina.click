import type { Metadata } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import "@suzumina.click/ui/globals.css";
import { Toaster } from "@suzumina.click/ui/components/ui/sonner";
import { GoogleAnalyticsScript } from "@/components/analytics/GoogleAnalyticsScript";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { AgeVerificationWrapper } from "@/components/consent/AgeVerificationWrapper";
import { ConsentModeScript } from "@/components/consent/ConsentModeScript";
import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import { SessionProvider } from "@/components/SessionProvider";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { AgeVerificationProvider } from "@/contexts/AgeVerificationContext";

// フォント最適化: 必要な重みのみを読み込み、LCP改善
const mPlusRounded = M_PLUS_Rounded_1c({
	subsets: ["latin"],
	weight: ["400", "500", "700"], // 必要な重みのみ読み込み
	display: "swap", // FOUT回避
	preload: true, // LCP改善
	fallback: ["Hiragino Kaku Gothic ProN", "Hiragino Sans", "Meiryo", "sans-serif"], // 日本語フォールバック
	adjustFontFallback: true, // CLS改善
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
	alternates: {
		canonical: "/",
	},
	openGraph: {
		type: "website",
		locale: "ja_JP",
		url: "https://suzumina.click",
		title: "すずみなくりっく！ - 涼花みなせファンサイト",
		description:
			"涼花みなせさんの音声ボタンを楽しめる非公式ファンサイトです。YouTube動画から音声ボタンを作成・共有し、DLsite作品情報も閲覧できます。",
		siteName: "suzumina.click",
		images: [
			{
				url: "/opengraph-image.png",
				width: 1200,
				height: 630,
				alt: "suzumina.click - 涼花みなせファンサイト",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "すずみなくりっく！ - 涼花みなせファンサイト",
		description:
			"涼花みなせさんの音声ボタンを楽しめる非公式ファンサイトです。YouTube動画から音声ボタンを作成・共有し、DLsite作品情報も閲覧できます。",
		images: ["/twitter-image.png"],
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
				<ConsentModeScript />
				<GoogleAnalyticsScript />
			</head>
			<body
				className={`${mPlusRounded.className} min-h-screen flex flex-col antialiased gradient-bg`}
			>
				<AgeVerificationProvider>
					<AgeVerificationWrapper>
						<SessionProvider>
							<PerformanceMonitor />
							<PageViewTracker />
							<SiteHeader />
							<main id="main-content" className="flex-1">
								{children}
							</main>
							<SiteFooter />
							<Toaster />
							<CookieConsentBanner />
						</SessionProvider>
					</AgeVerificationWrapper>
				</AgeVerificationProvider>
			</body>
		</html>
	);
}
