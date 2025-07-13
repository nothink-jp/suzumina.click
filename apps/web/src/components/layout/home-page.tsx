"use client";

// Video型を別途import
import type {
	FrontendAudioButtonData,
	FrontendDLsiteWorkData,
	FrontendVideoData,
} from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Suspense } from "react";
import {
	LazyFeaturedAudioButtonsCarousel,
	LazyFeaturedVideosCarousel,
	LazyFeaturedWorksCarousel,
	LazySearchForm,
} from "@/components/optimization/lazy-components";
import { LoadingSkeleton } from "@/components/optimization/loading-fallback";
import { useAgeVerification } from "@/contexts/age-verification-context";

interface HomePageProps {
	initialWorks: FrontendDLsiteWorkData[];
	initialVideos: FrontendVideoData[];
	initialAudioButtons: FrontendAudioButtonData[];
	allAgesWorks: FrontendDLsiteWorkData[];
}

export function HomePage({
	initialWorks,
	initialVideos,
	initialAudioButtons,
	allAgesWorks,
}: HomePageProps) {
	const { data: session } = useSession();
	const { showR18Content } = useAgeVerification();

	// 年齢確認状態に基づいて適切な作品データを選択
	const worksToShow = showR18Content ? initialWorks : allAgesWorks;

	return (
		<div>
			{/* メインビジュアル - LCP最適化済み + suzukaブランドカラー背景 */}
			<section className="py-12 sm:py-16 md:py-20 text-center bg-suzuka-50">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="max-w-4xl mx-auto">
						{/* LCP要素として最適化 - 明示的サイズとフォント最適化 */}
						<h1
							className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6"
							style={{
								// LCP改善: 明示的なサイズとレイアウト
								minHeight: "2.5rem",
								contentVisibility: "visible",
							}}
						>
							すずみなくりっく！
						</h1>
						<p
							className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 px-4 sm:px-0"
							style={{
								// CLS防止: 明示的な高さ
								minHeight: "3rem",
							}}
						>
							涼花みなせさんのYouTube動画から、好きな場面を再生できるボタンを作ろう！
							<br />
							あーたたちが集まる、あーたたちのためのファンサイトです
						</p>
						{/* 検索フォームをClient Componentに分離 - 遅延読み込み対応 */}
						<Suspense fallback={<LoadingSkeleton variant="form" />}>
							<LazySearchForm />
						</Suspense>

						{/* プレビューリリース案内バナー */}
						<div className="mt-6 sm:mt-8 mx-auto max-w-3xl">
							<div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 sm:p-6">
								<div className="flex items-start gap-3">
									<div className="flex-shrink-0 mt-1">
										<span className="text-2xl">🚀</span>
									</div>
									<div className="flex-1 space-y-3">
										<div>
											<h3 className="text-sm sm:text-base font-semibold text-blue-900 mb-2">
												🎉 プレビューリリース中！
											</h3>
											<p className="text-sm text-blue-800 leading-relaxed">
												現在、すずみなくりっく！はプレビューリリース段階です。
												<br />
												<strong className="font-semibold">音声ボタンの閲覧・利用は誰でも</strong>
												できますが、音声ボタンの作成は
												<strong className="font-semibold">すずみなふぁみりー</strong>
												のDiscordメンバーの皆さまに限定させていただいております。
											</p>
										</div>
										<div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
											<a
												href="https://ci-en.dlsite.com/creator/9805"
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
											>
												<span>💝</span>
												すずみなふぁみりーに参加する
											</a>
											<p className="text-xs text-blue-700">
												※ 涼花みなせさんのci-en支援者向けDiscordサーバーです
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* 新着音声ボタンセクション */}
			<section className="py-8 sm:py-12 bg-background">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between mb-6 sm:mb-8">
						<div>
							<h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
								🎵 新着音声ボタン
							</h2>
							<p className="text-sm sm:text-base text-muted-foreground">
								最新の音声ボタンをチェック！
							</p>
						</div>
						<Button asChild variant="outline">
							<Link href="/buttons" className="font-medium">
								すべて見る
							</Link>
						</Button>
					</div>
					<Suspense fallback={<LoadingSkeleton variant="carousel" height={280} />}>
						<LazyFeaturedAudioButtonsCarousel audioButtons={initialAudioButtons} />
					</Suspense>
				</div>
			</section>

			{/* 新着動画セクション */}
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
						<Button asChild variant="outline">
							<Link href="/videos" className="font-medium">
								すべて見る
							</Link>
						</Button>
					</div>
					<Suspense fallback={<LoadingSkeleton variant="carousel" height={300} />}>
						<LazyFeaturedVideosCarousel videos={initialVideos} />
					</Suspense>
				</div>
			</section>

			{/* 新着作品セクション - R18フィルタリング対応 */}
			<section className="py-8 sm:py-12 bg-background">
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
					<Suspense fallback={<LoadingSkeleton variant="carousel" height={350} />}>
						<LazyFeaturedWorksCarousel works={worksToShow} />
					</Suspense>
				</div>
			</section>

			{/* コミュニティセクション */}
			<section className="py-8 sm:py-12 bg-suzuka-100">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-6 sm:mb-8">
						<h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 sm:mb-4">
							コミュニティに参加しよう
						</h2>
						<p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
							音声ボタンを作成・共有して、ファンコミュニティを盛り上げよう！
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
							{session?.user ? (
								<Button asChild size="lg">
									<Link href="/buttons/create" className="font-medium">
										音声ボタンを作る
									</Link>
								</Button>
							) : (
								<Button asChild size="lg" variant="outline">
									<Link href="/auth/signin" className="font-medium">
										ログインして音声ボタンを作る
									</Link>
								</Button>
							)}
							<Button asChild size="lg" variant="outline">
								<Link href="/about" className="font-medium">
									サイトについて
								</Link>
							</Button>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
