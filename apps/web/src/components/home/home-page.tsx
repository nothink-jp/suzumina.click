import type {
	AudioButtonPlainObject,
	FrontendVideoData,
	WorkPlainObject,
} from "@suzumina.click/shared-types";
import { LoadingSkeleton } from "@suzumina.click/ui/components/custom/loading-skeleton";
import { Button } from "@suzumina.click/ui/components/ui/button";
import Link from "next/link";
import { Suspense } from "react";
import {
	LazyFeaturedAudioButtonsCarousel,
	LazyHomeSearchForm,
} from "@/components/optimization/lazy-components";
import { VideosSection } from "@/components/sections/videos-section";
import { WorksSection } from "@/components/sections/works-section";

interface HomePageProps {
	initialAudioButtons: AudioButtonPlainObject[];
	initialVideos: FrontendVideoData[];
	initialWorks: WorkPlainObject[];
	initialAllAgesWorks: WorkPlainObject[];
}

export function HomePage({
	initialAudioButtons,
	initialVideos,
	initialWorks,
	initialAllAgesWorks,
}: HomePageProps) {
	return (
		<div>
			{/* メインビジュアル - LCP最適化済み + suzukaブランドカラー背景 */}
			<section className="py-12 sm:py-16 md:py-20 text-center bg-suzuka-50 critical-above-fold critical-hero">
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
						{/* 検索フォームをClient Componentに分離 - 遅延読み込み対応 */}
						<LazyHomeSearchForm />
					</div>
				</div>
			</section>

			{/* 新着音声ボタンセクション - 遅延読み込み最適化 */}
			<section
				className="py-8 sm:py-12 bg-background"
				style={{ contentVisibility: "auto", containIntrinsicSize: "320px" }}
			>
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between mb-6 sm:mb-8">
						<div>
							<h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
								🎵 新着音声ボタン
							</h2>
							<p className="text-sm sm:text-base text-muted-foreground">
								最新の音声ボタンをチェック！
							</p>
						</div>
						<Button asChild variant="outline">
							<Link href="/buttons" className="font-medium">
								すべて見る
							</Link>
						</Button>
					</div>
					<Suspense fallback={<LoadingSkeleton variant="carousel" height={280} />}>
						<LazyFeaturedAudioButtonsCarousel audioButtons={initialAudioButtons} />
					</Suspense>
				</div>
			</section>

			{/* 新着動画セクション */}
			<VideosSection videos={initialVideos} loading={false} error={null} />

			{/* 新着作品セクション */}
			<WorksSection
				works={initialWorks}
				allAgesWorks={initialAllAgesWorks}
				loading={false}
				error={null}
			/>

			{/* コミュニティセクション - 遅延読み込み最適化 */}
			<section
				className="py-8 sm:py-12 bg-suzuka-100"
				style={{ contentVisibility: "auto", containIntrinsicSize: "260px" }}
			>
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-6 sm:mb-8">
						<h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 sm:mb-4">
							コミュニティに参加しよう
						</h2>
						<p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
							音声ボタンを作成・共有して、ファンコミュニティを盛り上げよう！
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
							<Button asChild size="lg">
								<Link href="/buttons/create" className="font-medium">
									音声ボタンを作る
								</Link>
							</Button>
							<Button asChild size="lg" variant="outline">
								<Link href="/about" className="font-medium">
									サイトについて
								</Link>
							</Button>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
