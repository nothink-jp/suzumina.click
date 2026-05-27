import { LoadingSkeleton } from "@suzumina.click/ui/components/custom/loading-skeleton";
import { Suspense } from "react";
import {
	AudioButtonsSection,
	CommunitySection,
	VideosSectionAsync,
	WorksSectionAsync,
} from "@/components/home/dynamic-home-sections";
import { HeroSection } from "@/components/home/hero-section";

// Cache Components モデル: HeroSection と CommunitySection は静的シェル、
// 各データセクションはそれぞれ個別の <Suspense> 境界で並列ストリーミングされる。
// セクション単位のスケルトンが実コンテンツに近い高さを持つため、CLS を最小化できる。
export default function Home() {
	return (
		<div>
			<HeroSection />
			<Suspense fallback={<LoadingSkeleton variant="carousel" height={320} />}>
				<AudioButtonsSection />
			</Suspense>
			<Suspense fallback={<LoadingSkeleton variant="carousel" height={480} />}>
				<VideosSectionAsync />
			</Suspense>
			<Suspense fallback={<LoadingSkeleton variant="carousel" height={560} />}>
				<WorksSectionAsync />
			</Suspense>
			<CommunitySection />
		</div>
	);
}
