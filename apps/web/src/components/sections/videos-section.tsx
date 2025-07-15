"use client";

import type { FrontendVideoData } from "@suzumina.click/shared-types";
import { LoadingSkeleton } from "@suzumina.click/ui/components/custom/loading-skeleton";
import { Button } from "@suzumina.click/ui/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getLatestVideos } from "@/app/actions";
import { FeaturedVideosCarousel } from "@/components/content/featured-videos-carousel";

export function VideosSection() {
	const [videos, setVideos] = useState<FrontendVideoData[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadVideos = async () => {
			try {
				const data = await getLatestVideos(10);
				setVideos(data);
			} catch (error) {
				console.error("Failed to load videos:", error);
			} finally {
				setLoading(false);
			}
		};

		loadVideos();
	}, []);

	if (loading) {
		return <LoadingSkeleton variant="carousel" height={300} />;
	}

	return (
		<section
			className="py-8 sm:py-12 bg-suzuka-100"
			style={{ contentVisibility: "auto", containIntrinsicSize: "340px" }}
		>
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between mb-6 sm:mb-8">
					<div>
						<h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
							📹 新着動画
						</h2>
						<p className="text-sm sm:text-base text-muted-foreground">
							涼花みなせさんの最新動画をチェック！
						</p>
					</div>
					<Button asChild variant="outline">
						<Link href="/videos" className="font-medium">
							すべて見る
						</Link>
					</Button>
				</div>
				<FeaturedVideosCarousel videos={videos} />
			</div>
		</section>
	);
}
