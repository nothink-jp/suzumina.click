"use client";

import type { VideoPlainObject } from "@suzumina.click/shared-types";
import { LoadingSkeleton } from "@suzumina.click/ui/components/custom/loading-skeleton";
import { Button } from "@suzumina.click/ui/components/ui/button";
import Link from "next/link";
import { LazyFeaturedVideosCarousel } from "@/components/optimization/lazy-components";

interface VideosSectionProps {
	videos?: VideoPlainObject[];
	loading?: boolean;
	error?: string | null;
}

export function VideosSection({ videos = [], loading = true, error = null }: VideosSectionProps) {
	if (loading) {
		return (
			<section className="py-8 sm:py-12 bg-muted">
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
						<Button
							variant="outline"
							render={
								<Link href="/videos" className="font-medium">
									すべて見る
								</Link>
							}
						/>
					</div>
					<LoadingSkeleton variant="carousel" height={300} />
				</div>
			</section>
		);
	}

	if (error) {
		return (
			<section className="py-8 sm:py-12 bg-muted">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center py-12 text-muted-foreground">
						<div className="text-lg">動画の読み込みに失敗しました</div>
						<p className="text-sm mt-2">{error}</p>
					</div>
				</div>
			</section>
		);
	}

	return (
		<section className="py-8 sm:py-12 bg-muted">
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
					<Button
						variant="outline"
						render={
							<Link href="/videos" className="font-medium">
								すべて見る
							</Link>
						}
					/>
				</div>
				<LazyFeaturedVideosCarousel videos={videos} />
			</div>
		</section>
	);
}
