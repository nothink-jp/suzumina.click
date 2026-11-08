import type { Metadata } from "next";
import { Suspense } from "react";
import {
	AudioButtonsSection,
	AudioButtonsSectionSkeleton,
	CommunitySection,
	VideosSectionAsync,
	WorksSectionAsync,
} from "@/components/home/dynamic-home-sections";
import { HeroSection } from "@/components/home/hero-section";
import { TrackedSection } from "@/components/home/tracked-section";
import { VideosSection } from "@/components/sections/videos-section";
import { WorksSection } from "@/components/sections/works-section";
import { HOME_SECTION } from "@/lib/analytics/home-section";

// トップページの自己参照 canonical。
// ルートレイアウトに canonical を置くと全ページが "/" を継承してしまう（Next.js は
// pathname を自動付与しない）ため、ここでトップページ専用に明示する。詳細ページは
// 各 generateMetadata で自身の URL を canonical に設定する。
export const metadata: Metadata = {
	alternates: {
		canonical: "/",
	},
};

// Cache Components モデル: HeroSection と CommunitySection は静的シェル、
// 各データセクションはそれぞれ個別の <Suspense> 境界で並列ストリーミングされる。
//
// Suspense fallback は対応するセクションと同じ <section> / container / ヘッダー構造を持つ
// 構造的 skeleton を使用する。これにより Suspense リゾルブ前後でセクション高さが変わらず、
// 後続要素 (次セクション・footer) の押し下げによる CLS を回避できる。
//
// VideosSection / WorksSection は `loading={true}` で自身の skeleton 状態を持つため、
// そのまま fallback として再利用する。AudioButtonsSection は専用の
// AudioButtonsSectionSkeleton を持つ。
//
// TrackedSection はセクション到達（section_view）とセクション内リンクのクリック（section_click）を送る
// 計測用の素の div。Suspense の外側に置き、skeleton 表示中もセクションの位置を観測できるようにしている。
export default function Home() {
	return (
		<div>
			<TrackedSection section={HOME_SECTION.hero}>
				<HeroSection />
			</TrackedSection>
			<TrackedSection section={HOME_SECTION.audioButtons}>
				<Suspense fallback={<AudioButtonsSectionSkeleton />}>
					<AudioButtonsSection />
				</Suspense>
			</TrackedSection>
			<TrackedSection section={HOME_SECTION.videos}>
				<Suspense fallback={<VideosSection loading />}>
					<VideosSectionAsync />
				</Suspense>
			</TrackedSection>
			<TrackedSection section={HOME_SECTION.works}>
				<Suspense fallback={<WorksSection loading />}>
					<WorksSectionAsync />
				</Suspense>
			</TrackedSection>
			<TrackedSection section={HOME_SECTION.community}>
				<CommunitySection />
			</TrackedSection>
		</div>
	);
}
