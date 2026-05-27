import { LoadingSkeleton } from "@suzumina.click/ui/components/custom/loading-skeleton";
import { Button } from "@suzumina.click/ui/components/ui/button";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getLatestAudioButtons, getLatestVideos, getLatestWorks } from "@/app/actions";
import { LazyFeaturedAudioButtonsCarousel } from "@/components/optimization/lazy-components";
import { VideosSection } from "@/components/sections/videos-section";
import { WorksSection } from "@/components/sections/works-section";

/**
 * Firestore データ取得を伴うホームページの動的セクション群。
 * PPR の `<Suspense>` 境界内でストリーミング配信される。
 */
export async function DynamicHomeSections() {
	// Cache Components 下で「Firestore からの uncached fetch」を実行する前に
	// リクエストスコープに入る必要がある。これでこのコンポーネントが完全に動的扱いになる。
	await connection();

	const [audioButtons, videos, works, allAgesWorks] = await Promise.all([
		getLatestAudioButtons(10),
		getLatestVideos(10),
		getLatestWorks(10, false),
		getLatestWorks(10, true),
	]);

	return (
		<>
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
						<LazyFeaturedAudioButtonsCarousel audioButtons={audioButtons} />
					</Suspense>
				</div>
			</section>

			{/* 新着動画セクション */}
			<VideosSection videos={videos} loading={false} error={null} />

			{/* 新着作品セクション */}
			<WorksSection works={works} allAgesWorks={allAgesWorks} loading={false} error={null} />

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
		</>
	);
}
