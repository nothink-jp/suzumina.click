import type { Metadata } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import "@suzumina.click/ui/globals.css";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

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
	title: "すずみなくりっく！ - 涼花みなせファンサイト",
	description: "涼花みなせさんの音声作品やボタンを楽しめるファンコミュニティサイトです。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ja" className="scroll-smooth">
			<body
				className={`${mPlusRounded.className} min-h-screen flex flex-col antialiased gradient-bg`}
			>
				<PerformanceMonitor />
				<SiteHeader />
				{/* biome-ignore lint/nursery/useUniqueElementIds: Static landmark ID for accessibility */}
				<main id="main-content" className="flex-1">
					{children}
				</main>
				<SiteFooter />
			</body>
		</html>
	);
}
