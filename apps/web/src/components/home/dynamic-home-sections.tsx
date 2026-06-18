import { LoadingSkeleton } from "@suzumina.click/ui/components/custom/loading-skeleton";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import { connection } from "next/server";
import { getLatestAudioButtons, getLatestVideos, getLatestWorks } from "@/app/actions";
import { AudioButtonsCarouselDeferred } from "@/components/home/audio-buttons-carousel-deferred";
import { VideosSection } from "@/components/sections/videos-section";
import { WorksSection } from "@/components/sections/works-section";

/**
 * 各セクションは個別の `<Suspense>` 境界配下で並列にストリーミングされる。
 * `await connection()` は Firestore SDK 内部の同期的なランダム値参照を
 * Cache Components の build-time prerender が検出してしまうのを回避するため、
 * 「このコンポーネントはリクエスト時に動的レンダリングする」ことを明示する。
 *
 * Firestore 取得は unstable_cache で 60s revalidate し、Suspense 解決時間を
 * 短縮することで Chrome の LCP element render delay を抑制する (SPR-71 Workstream B)。
 * Cache TTL は next.config.mjs の `/` の Cache-Control: public, s-maxage=60 と整合。
 */

const HOME_REVALIDATE_SECONDS = 60;

const getCachedLatestAudioButtons = unstable_cache(
	async () => getLatestAudioButtons(10),
	["home-latest-audio-buttons"],
	{ revalidate: HOME_REVALIDATE_SECONDS, tags: ["home-audio-buttons"] },
);

const getCachedLatestVideos = unstable_cache(
	async () => getLatestVideos(10),
	["home-latest-videos"],
	{ revalidate: HOME_REVALIDATE_SECONDS, tags: ["home-videos"] },
);

const getCachedLatestWorks = unstable_cache(
	async (excludeR18: boolean) => getLatestWorks(10, excludeR18),
	["home-latest-works"],
	{ revalidate: HOME_REVALIDATE_SECONDS, tags: ["home-works"] },
);

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
		<section className="py-8 sm:py-12 bg-background">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<AudioButtonsSectionHeader />
				<LoadingSkeleton variant="carousel" height={280} />
			</div>
		</section>
	);
}

export async function AudioButtonsSection() {
	await connection();
	const audioButtons = await getCachedLatestAudioButtons();

	return (
		<section className="py-8 sm:py-12 bg-background">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<AudioButtonsSectionHeader />
				<AudioButtonsCarouselDeferred audioButtons={audioButtons} />
			</div>
		</section>
	);
}

export async function VideosSectionAsync() {
	await connection();
	const videos = await getCachedLatestVideos();
	return <VideosSection videos={videos} loading={false} error={null} />;
}

export async function WorksSectionAsync() {
	await connection();
	const [works, allAgesWorks] = await Promise.all([
		getCachedLatestWorks(false),
		getCachedLatestWorks(true),
	]);
	return <WorksSection works={works} allAgesWorks={allAgesWorks} loading={false} error={null} />;
}

/** コミュニティ CTA は完全静的。データ取得なし。 */
export function CommunitySection() {
	return (
		<section className="py-8 sm:py-12 bg-muted">
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
