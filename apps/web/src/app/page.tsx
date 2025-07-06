import { Button } from "@suzumina.click/ui/components/ui/button";
import Link from "next/link";
import { FeaturedAudioButtonsCarousel } from "@/components/FeaturedAudioButtonsCarousel";
import { FeaturedVideosCarousel } from "@/components/FeaturedVideosCarousel";
import { FeaturedWorksCarousel } from "@/components/FeaturedWorksCarousel";
import SearchForm from "@/components/SearchForm";
import { getLatestAudioButtons, getLatestVideos, getLatestWorks } from "./actions";

// Force dynamic rendering to ensure Server Actions are called on each request
export const dynamic = "force-dynamic";

// Server Component として実装し、LCPを改善
export default async function Home() {
	// 新着作品、動画、音声ボタンを並行取得
	const [latestWorks, latestVideos, latestAudioButtons] = await Promise.all([
		getLatestWorks(10),
		getLatestVideos(10),
		getLatestAudioButtons(10),
	]);
	return (
		<div>
			{/* メインビジュアル - LCP最適化済み + suzukaブランドカラー背景 */}
			<section className="py-12 sm:py-16 md:py-20 text-center bg-suzuka-50">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="max-w-4xl mx-auto">
						{/* LCP要素として最適化 - 明示的サイズとフォント最適化 */}
						<h1
							className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6"
							style={{
								// LCP改善: 明示的なサイズとレイアウト
								minHeight: "2.5rem",
								contentVisibility: "visible",
							}}
						>
							すずみなくりっく！
						</h1>
						<p
							className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 px-4 sm:px-0"
							style={{
								// CLS防止: 明示的な高さ
								minHeight: "3rem",
							}}
						>
							涼花みなせさんのYouTube動画から、好きな場面を再生できるボタンを作ろう！
							<br />
							あーたたちが集まる、あーたたちのためのファンサイトです
						</p>
						{/* 検索フォームをClient Componentに分離 */}
						<SearchForm />
					</div>
				</div>
			</section>

			{/* 新着音声ボタン */}
			<section className="py-8 sm:py-10 md:py-12 bg-suzuka-100">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
						<h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
							🎵 新着音声ボタン
						</h3>
						<Button variant="outline" asChild className="min-h-[44px] w-full sm:w-auto">
							<Link href="/buttons">すべて見る</Link>
						</Button>
					</div>

					<FeaturedAudioButtonsCarousel audioButtons={latestAudioButtons} />
				</div>
			</section>

			{/* 新着動画一覧 */}
			<section className="py-8 sm:py-10 md:py-12 bg-background">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
						<h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
							📺 新着動画
						</h3>
						<Button variant="outline" asChild className="min-h-[44px] w-full sm:w-auto">
							<Link href="/videos">すべて見る</Link>
						</Button>
					</div>

					<FeaturedVideosCarousel videos={latestVideos} />
				</div>
			</section>

			{/* 新着作品一覧 */}
			<section className="py-8 sm:py-10 md:py-12 bg-suzuka-100">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
						<h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
							🎧 新着作品
						</h3>
						<Button variant="outline" asChild className="min-h-[44px] w-full sm:w-auto">
							<Link href="/works">すべて見る</Link>
						</Button>
					</div>

					<FeaturedWorksCarousel works={latestWorks} />
				</div>
			</section>
		</div>
	);
}
