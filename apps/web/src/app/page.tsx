import { Suspense } from "react";
import {
	AudioButtonsSection,
	AudioButtonsSectionSkeleton,
	CommunitySection,
	VideosSectionAsync,
	WorksSectionAsync,
} from "@/components/home/dynamic-home-sections";
import { HeroSection } from "@/components/home/hero-section";
import { VideosSection } from "@/components/sections/videos-section";
import { WorksSection } from "@/components/sections/works-section";

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
export default function Home() {
	return (
		<div>
			<HeroSection />
			<Suspense fallback={<AudioButtonsSectionSkeleton />}>
				<AudioButtonsSection />
			</Suspense>
			<Suspense fallback={<VideosSection loading />}>
				<VideosSectionAsync />
			</Suspense>
			<Suspense fallback={<WorksSection loading />}>
				<WorksSectionAsync />
			</Suspense>
			<CommunitySection />
		</div>
	);
}
