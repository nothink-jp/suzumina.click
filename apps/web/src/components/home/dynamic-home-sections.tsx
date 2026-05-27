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
 * 各セクションは個別の `<Suspense>` 境界配下で並列にストリーミングされる。
 * `await connection()` は Firestore SDK 内部の同期的なランダム値参照を
 * Cache Components の build-time prerender が検出してしまうのを回避するため、
 * 「このコンポーネントはリクエスト時に動的レンダリングする」ことを明示する。
 */

/**
 * セクション共通の header DOM。
 * AudioButtonsSection / AudioButtonsSectionSkeleton で共有することで DOM ドリフトを防ぐ。
 */
function AudioButtonsSectionHeader() {
	return (
		<div className="flex items-center justify-between mb-6 sm:mb-8">
			<div>
				<h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
					🎵 新着音声ボタン
				</h2>
				<p className="text-sm sm:text-base text-muted-foreground">最新の音声ボタンをチェック！</p>
			</div>
			<Button asChild variant="outline">
				<Link href="/buttons" className="font-medium">
					すべて見る
				</Link>
			</Button>
		</div>
	);
}

/**
 * AudioButtonsSection の構造的 skeleton。
 * 実セクション本体と同じ `<section>` / container / ヘッダーをレンダリングし、
 * carousel 部分のみ LoadingSkeleton で代替する。Suspense リゾルブ時に
 * section 全体の高さが変わらないため CLS が発生しない。
 */
export function AudioButtonsSectionSkeleton() {
	return (
		<section
			className="py-8 sm:py-12 bg-background"
			style={{ contentVisibility: "auto", containIntrinsicSize: "320px" }}
		>
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<AudioButtonsSectionHeader />
				<LoadingSkeleton variant="carousel" height={280} />
			</div>
		</section>
	);
}

export async function AudioButtonsSection() {
	await connection();
	const audioButtons = await getLatestAudioButtons(10);

	return (
		<section
			className="py-8 sm:py-12 bg-background"
			style={{ contentVisibility: "auto", containIntrinsicSize: "320px" }}
		>
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<AudioButtonsSectionHeader />
				<Suspense fallback={<LoadingSkeleton variant="carousel" height={280} />}>
					<LazyFeaturedAudioButtonsCarousel audioButtons={audioButtons} />
				</Suspense>
			</div>
		</section>
	);
}

export async function VideosSectionAsync() {
	await connection();
	const videos = await getLatestVideos(10);
	return <VideosSection videos={videos} loading={false} error={null} />;
}

export async function WorksSectionAsync() {
	await connection();
	const [works, allAgesWorks] = await Promise.all([
		getLatestWorks(10, false),
		getLatestWorks(10, true),
	]);
	return <WorksSection works={works} allAgesWorks={allAgesWorks} loading={false} error={null} />;
}

/** コミュニティ CTA は完全静的。データ取得なし。 */
export function CommunitySection() {
	return (
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
	);
}
