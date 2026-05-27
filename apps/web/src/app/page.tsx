import { LoadingSkeleton } from "@suzumina.click/ui/components/custom/loading-skeleton";
import { Suspense } from "react";
import { DynamicHomeSections } from "@/components/home/dynamic-home-sections";
import { HeroSection } from "@/components/home/hero-section";

// Cache Components モデル: HeroSection は静的シェルとして prerender され、
// データ取得を伴う DynamicHomeSections は Suspense 境界内でストリーミング配信。
export default function Home() {
	return (
		<div>
			<HeroSection />
			<Suspense fallback={<LoadingSkeleton variant="carousel" height={400} />}>
				<DynamicHomeSections />
			</Suspense>
		</div>
	);
}
