"use client";

import type { WorkPlainObject } from "@suzumina.click/shared-types";
import { LoadingSkeleton } from "@suzumina.click/ui/components/custom/loading-skeleton";
import { Button } from "@suzumina.click/ui/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LazyFeaturedWorksCarousel } from "@/components/optimization/lazy-components";
import { useAgeVerification } from "@/contexts/age-verification-context";

interface WorksSectionProps {
	works?: WorkPlainObject[];
	allAgesWorks?: WorkPlainObject[];
	loading?: boolean;
	error?: string | null;
}

export function WorksSection({
	works = [],
	allAgesWorks = [],
	loading = true,
	error = null,
}: WorksSectionProps) {
	const { showR18Content } = useAgeVerification();

	// 年齢確認状態はクライアントの localStorage から決まる。SSR（およびストリーミングされた
	// 動的セクションのサーバ HTML）は常に未確認＝全年齢ビューを描画するため、マウント完了まで
	// 同じ値に揃えてハイドレーション不一致を防ぐ（確定後に再描画される）。
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);
	const effectiveShowR18 = mounted && showR18Content;

	if (loading) {
		return (
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
						<Button asChild variant="outline">
							<Link href="/works" className="font-medium">
								すべて見る
							</Link>
						</Button>
					</div>
					<LoadingSkeleton variant="carousel" height={350} />
				</div>
			</section>
		);
	}

	if (error) {
		return (
			<section className="py-8 sm:py-12 bg-background">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center py-12 text-muted-foreground">
						<div className="text-lg">作品の読み込みに失敗しました</div>
						<p className="text-sm mt-2">{error}</p>
					</div>
				</div>
			</section>
		);
	}

	const worksToShow = effectiveShowR18 ? works : allAgesWorks;

	return (
		<section className="py-8 sm:py-12 bg-background">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between mb-6 sm:mb-8">
					<div>
						<h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
							🎭 新着作品
							{!effectiveShowR18 && (
								<span className="ml-2 text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
									全年齢対象
								</span>
							)}
						</h2>
						<p className="text-sm sm:text-base text-muted-foreground">
							{effectiveShowR18
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
				<LazyFeaturedWorksCarousel works={worksToShow} />
			</div>
		</section>
	);
}
