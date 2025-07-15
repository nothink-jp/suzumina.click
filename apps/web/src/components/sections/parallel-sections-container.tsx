"use client";

import { LoadingSkeleton } from "@suzumina.click/ui/components/custom/loading-skeleton";
import { Suspense } from "react";
import { useParallelSectionData } from "@/hooks/use-parallel-section-data";
import { VideosSection } from "./videos-section";
import { WorksSection } from "./works-section";

/**
 * 動画と作品セクションを並列読み込みするコンテナコンポーネント
 * 真の並列実行でパフォーマンスを最適化
 */
export function ParallelSectionsContainer() {
	const { videos, works, allAgesWorks, loadingVideos, loadingWorks, errorVideos, errorWorks } =
		useParallelSectionData();

	return (
		<>
			{/* 新着動画セクション - 独立して読み込み完了次第表示 */}
			<Suspense
				fallback={
					<section className="py-8 sm:py-12 bg-suzuka-100">
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
							</div>
							<LoadingSkeleton variant="carousel" height={300} />
						</div>
					</section>
				}
			>
				<VideosSection videos={videos} loading={loadingVideos} error={errorVideos} />
			</Suspense>

			{/* 新着作品セクション - 独立して読み込み完了次第表示 */}
			<Suspense
				fallback={
					<section className="py-8 sm:py-12 bg-background">
						<div className="container mx-auto px-4 sm:px-6 lg:px-8">
							<div className="flex items-center justify-between mb-6 sm:mb-8">
								<div>
									<h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
										🎭 新着作品
									</h2>
									<p className="text-sm sm:text-base text-muted-foreground">
										涼花みなせさんの最新作品をチェック！
									</p>
								</div>
							</div>
							<LoadingSkeleton variant="carousel" height={350} />
						</div>
					</section>
				}
			>
				<WorksSection
					works={works}
					allAgesWorks={allAgesWorks}
					loading={loadingWorks}
					error={errorWorks}
				/>
			</Suspense>
		</>
	);
}
