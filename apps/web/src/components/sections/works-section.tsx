"use client";

import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types";
import { LoadingSkeleton } from "@suzumina.click/ui/components/custom/loading-skeleton";
import { Button } from "@suzumina.click/ui/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getLatestWorks } from "@/app/actions";
import { FeaturedWorksCarousel } from "@/components/content/featured-works-carousel";
import { useAgeVerification } from "@/contexts/age-verification-context";

export function WorksSection() {
	const [works, setWorks] = useState<FrontendDLsiteWorkData[]>([]);
	const [allAgesWorks, setAllAgesWorks] = useState<FrontendDLsiteWorkData[]>([]);
	const [loading, setLoading] = useState(true);
	const { showR18Content } = useAgeVerification();

	useEffect(() => {
		const loadWorks = async () => {
			try {
				const [regularWorks, ageRestrictedWorks] = await Promise.all([
					getLatestWorks(10, false), // 通常版（R18含む）
					getLatestWorks(10, true), // 全年齢版（R18除外）
				]);
				setWorks(regularWorks);
				setAllAgesWorks(ageRestrictedWorks);
			} catch (error) {
				console.error("Failed to load works:", error);
			} finally {
				setLoading(false);
			}
		};

		loadWorks();
	}, []);

	if (loading) {
		return <LoadingSkeleton variant="carousel" height={350} />;
	}

	const worksToShow = showR18Content ? works : allAgesWorks;

	return (
		<section
			className="py-8 sm:py-12 bg-background"
			style={{ contentVisibility: "auto", containIntrinsicSize: "380px" }}
		>
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between mb-6 sm:mb-8">
					<div>
						<h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
							🎭 新着作品
							{!showR18Content && (
								<span className="ml-2 text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
									全年齢対象
								</span>
							)}
						</h2>
						<p className="text-sm sm:text-base text-muted-foreground">
							{showR18Content
								? "涼花みなせさんの最新作品をチェック！"
								: "年齢制限のない作品をお楽しみください"}
						</p>
					</div>
					<Button asChild variant="outline">
						<Link href="/works" className="font-medium">
							すべて見る
						</Link>
					</Button>
				</div>
				<FeaturedWorksCarousel works={worksToShow} />
			</div>
		</section>
	);
}
