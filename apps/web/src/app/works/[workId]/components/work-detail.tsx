"use client";

import type { WorkPlainObject } from "@suzumina.click/shared-types";
import {
	type FrontendWorkEvaluation,
	getWorkCategoryDisplayText,
	getWorkLanguageDisplayName,
} from "@suzumina.click/shared-types";
import NotImplementedOverlay from "@suzumina.click/ui/components/custom/not-implemented-overlay";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@suzumina.click/ui/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@suzumina.click/ui/components/ui/tabs";
import {
	Calendar,
	FileText,
	Globe,
	Image,
	Share2,
	Shield,
	ShoppingCart,
	Star,
	Tag,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import CharacteristicEvaluation from "@/components/content/characteristic-evaluation";
import { PriceHistory } from "@/components/price-history/price-history";
import ThumbnailImage from "@/components/ui/thumbnail-image";
import { formatJSTDateTime } from "@/utils/date-format";
import { generateMockCharacteristicData } from "@/utils/mock-evaluation-data";
import { calculatePriceInfo } from "../../utils/price-info";
import { AgeRatingBadge } from "./age-rating-badge";
import SampleImageGallery from "./sample-image-gallery";
import { CreatorBadges, CreatorList } from "./work-creators";
import WorkDescription from "./work-description";
import { WorkEvaluation } from "./work-evaluation";

interface WorkDetailProps {
	work: WorkPlainObject;
	initialEvaluation?: FrontendWorkEvaluation | null;
}

// スターレーティングコンポーネント
function StarRating({ rating }: { rating: number }) {
	// Convert 0-50 scale to 0-5 scale for display
	const displayRating = Math.round(rating / 10);
	return (
		<div className="flex items-center">
			{[1, 2, 3, 4, 5].map((star) => (
				<Star
					key={star}
					className={`h-5 w-5 ${star <= displayRating ? "text-foreground fill-current" : "text-muted-foreground"}`}
				/>
			))}
		</div>
	);
}

// シェア処理
function handleShare(work: WorkPlainObject) {
	if (navigator.share) {
		navigator.share({
			title: work.title,
			text: work.description,
			url: window.location.href,
		});
	} else {
		// フォールバック: URLをクリップボードにコピー
		navigator.clipboard.writeText(window.location.href);
		alert("URLをクリップボードにコピーしました");
	}
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex UI component with multiple tabs and conditional rendering
export default function WorkDetail({ work, initialEvaluation = null }: WorkDetailProps) {
	// モック特性評価データを生成（作品IDに基づいて一意）
	const characteristicData = useMemo(
		() => generateMockCharacteristicData(work.productId),
		[work.productId],
	);

	// 価格情報の計算
	const { currentPrice, originalPrice, isOnSale, discountRate } = useMemo(
		() => calculatePriceInfo(work.price),
		[work],
	);

	// ランキング情報は現在利用できません
	const latestRank = undefined;

	return (
		<div className="max-w-6xl mx-auto">
			{/* パンくずリスト */}
			<nav className="mb-6 text-sm">
				<ol className="flex items-center space-x-2 text-muted-foreground min-w-0">
					<li className="shrink-0">
						<Link href="/" className="hover:text-foreground/80">
							ホーム
						</Link>
					</li>
					<li className="shrink-0">
						<span className="mx-2">/</span>
					</li>
					<li className="shrink-0">
						<Link href="/works" className="hover:text-foreground/80">
							作品一覧
						</Link>
					</li>
					<li className="shrink-0">
						<span className="mx-2">/</span>
					</li>
					<li className="text-foreground font-medium truncate min-w-0 max-w-[200px] sm:max-w-[300px] md:max-w-[400px] lg:max-w-[500px]">
						{work.title}
					</li>
				</ol>
			</nav>

			{/* ヘッダー: 基本情報とサムネイル */}
			<div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden mb-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
					{/* 作品サムネイル */}
					<div className="space-y-4">
						<div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
							<ThumbnailImage
								src={work.highResImageUrl || work.thumbnailUrl}
								fallbackSrc={work.thumbnailUrl}
								alt={work.title}
								className="w-full h-full object-contain"
							/>
							{isOnSale && (
								<div className="absolute top-2 left-2">
									<Badge className="bg-destructive text-white">セール中</Badge>
								</div>
							)}
							{latestRank && (
								<div className="absolute top-2 right-2">
									<Badge className="bg-primary text-white">#{latestRank}位</Badge>
								</div>
							)}
						</div>
					</div>

					{/* 基本情報 */}
					<div className="space-y-4">
						<div>
							<h1 className="text-3xl font-bold text-foreground mb-2">{work.title}</h1>
							<p className="text-lg text-foreground">
								サークル:{" "}
								{work.circleId ? (
									<Link href={`/circles/${work.circleId}`} className="text-primary hover:underline">
										{work.circle}
									</Link>
								) : (
									<>
										{work.circle}
										{process.env.NODE_ENV === "development" && (
											<span className="text-xs text-destructive ml-2">
												[DEBUG: circleId={JSON.stringify(work.circleId)}]
											</span>
										)}
									</>
								)}
							</p>
						</div>

						{/* 価格 */}
						<div className="space-y-2">
							{isOnSale && originalPrice ? (
								<div className="flex items-center gap-3">
									<span className="text-3xl font-bold text-destructive">
										¥{currentPrice.toLocaleString("ja-JP")}
									</span>
									<span className="text-xl text-muted-foreground line-through">
										¥{originalPrice.toLocaleString("ja-JP")}
									</span>
									<Badge className="bg-destructive/10 text-destructive text-lg px-3 py-1">
										{discountRate}% OFF
									</Badge>
								</div>
							) : (
								<span className="text-3xl font-bold text-foreground">
									¥{currentPrice.toLocaleString("ja-JP")}
								</span>
							)}
						</div>

						{/* 評価 */}
						{work.rating && (
							<div className="flex items-center gap-3">
								<StarRating rating={work.rating.stars} />
								<span className="text-xl font-semibold text-foreground">
									{(work.rating.stars / 10).toFixed(1)}
								</span>
								<span className="text-base text-muted-foreground">
									({work.rating.count}件の評価)
								</span>
							</div>
						)}

						{/* 年齢レーティング表示 */}
						{work.ageRating && (
							<div className="space-y-2">
								<div className="text-sm font-medium text-foreground">年齢指定</div>
								<div className="flex items-center gap-2">
									<Shield className="h-4 w-4 text-muted-foreground" />
									<AgeRatingBadge ageRating={work.ageRating} size="base" />
								</div>
							</div>
						)}

						{/* 言語情報表示（シンプル版） */}
						<div className="space-y-2">
							<div className="text-sm font-medium text-foreground">対応言語</div>
							<div className="flex items-center gap-2">
								<Globe className="h-4 w-4 text-muted-foreground" />
								<Badge
									variant="default"
									className="bg-info text-info-foreground font-medium text-base px-3 py-1"
								>
									{getWorkLanguageDisplayName(work._computed.primaryLanguage)}
								</Badge>
								{(() => {
									const availableLanguages = work._computed.availableLanguages;
									const primaryLanguage = work._computed.primaryLanguage;
									// 主要言語以外の言語をカウント
									const additionalLanguages = availableLanguages.filter(
										(lang) => lang !== primaryLanguage,
									);
									const additionalCount = additionalLanguages.length;

									if (additionalCount > 0) {
										return (
											<span className="text-sm text-muted-foreground">+{additionalCount}言語</span>
										);
									}
									return null;
								})()}
							</div>
						</div>

						{/* タグ・ジャンル（Individual Info API準拠・段階的活用） */}
						<div className="space-y-3">
							{/* ジャンル */}
							{(() => {
								const genres = work.genres || [];

								if (genres.length === 0) return null;

								return (
									<div>
										<div className="text-sm font-medium text-foreground mb-2">ジャンル</div>
										<div className="flex flex-wrap gap-2">
											{genres.map((genre) => (
												<Badge
													key={`genre-${genre}`}
													variant="outline"
													className="border-primary/20 text-primary bg-primary/5 flex items-center gap-1"
												>
													<Tag className="h-3 w-3" />
													{genre}
												</Badge>
											))}
										</div>
									</div>
								);
							})()}
						</div>

						{/* アクションボタン */}
						<div className="space-y-3">
							<div className="flex gap-3">
								<Button
									variant="outline"
									className="flex-1 border text-foreground hover:bg-accent"
									onClick={() => handleShare(work)}
								>
									<Share2 className="h-4 w-4 mr-2" />
									共有
								</Button>
								<Button
									className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
									asChild
								>
									<a href={work.workUrl} target="_blank" rel="noopener noreferrer">
										<ShoppingCart className="h-4 w-4 mr-2" />
										DLsiteで購入
									</a>
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* メインコンテンツエリア: タブ構造 */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* 左側: タブコンテンツ */}
				<div className="lg:col-span-2">
					<Tabs defaultValue="overview" className="w-full">
						<TabsList className="grid w-full grid-cols-4">
							<TabsTrigger value="overview" className="flex items-center gap-2">
								<FileText className="h-4 w-4" />
								<span className="hidden sm:inline">詳細情報</span>
							</TabsTrigger>
							<TabsTrigger value="samples" className="flex items-center gap-2">
								<Image className="h-4 w-4" />
								<span className="hidden sm:inline">サンプル画像</span>
							</TabsTrigger>
							<TabsTrigger value="characteristics" className="flex items-center gap-2">
								<Star className="h-4 w-4" />
								<span className="hidden sm:inline">特性評価</span>
							</TabsTrigger>
							<TabsTrigger value="price-history" className="flex items-center gap-2">
								<Tag className="h-4 w-4" />
								<span className="hidden sm:inline">価格推移</span>
							</TabsTrigger>
						</TabsList>

						{/* 詳細情報タブ（基本情報・制作陣） */}
						<TabsContent value="overview" className="space-y-6">
							{/* 作品説明 */}
							<WorkDescription description={work.description} title={work.title} />

							{/* 作品基本情報 */}
							<Card>
								<CardHeader>
									<CardTitle>作品基本情報</CardTitle>
									<CardDescription>作品の基本情報・販売情報・制作陣</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										{/* 基本情報 */}
										<div className="space-y-4">
											<div className="flex items-center gap-3">
												<FileText className="h-5 w-5 text-muted-foreground" />
												<div>
													<div className="text-sm text-foreground">作品ID</div>
													<div className="font-semibold text-foreground font-mono">
														{work.productId}
													</div>
												</div>
											</div>
											<div className="flex items-center gap-3">
												<Tag className="h-5 w-5 text-muted-foreground" />
												<div>
													<div className="text-sm text-foreground">カテゴリ</div>
													<div className="font-semibold text-foreground">
														{getWorkCategoryDisplayText(work)}
													</div>
												</div>
											</div>
											{work.releaseDate && (
												<div className="flex items-center gap-3">
													<Calendar className="h-5 w-5 text-muted-foreground" />
													<div>
														<div className="text-sm text-foreground">販売日</div>
														<div className="font-semibold text-foreground">
															{formatJSTDateTime(work.releaseDate)}
														</div>
													</div>
												</div>
											)}
											{work.series?.name && (
												<div className="flex items-center gap-3">
													<FileText className="h-5 w-5 text-muted-foreground" />
													<div>
														<div className="text-sm text-foreground">シリーズ名</div>
														<div className="font-semibold text-foreground">{work.series.name}</div>
													</div>
												</div>
											)}
											{work.ageRating && (
												<div className="flex items-center gap-3">
													<Shield className="h-5 w-5 text-muted-foreground" />
													<div>
														<div className="text-sm text-foreground">年齢指定</div>
														<div className="flex items-center gap-2">
															<AgeRatingBadge ageRating={work.ageRating} size="sm" />
														</div>
													</div>
												</div>
											)}

											{/* 詳細言語・翻訳情報 */}
											<div className="flex items-start gap-3">
												<Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
												<div className="space-y-3 flex-1">
													<div className="text-sm text-foreground">言語・翻訳情報</div>

													{/* 対応言語一覧 */}
													<div className="space-y-2">
														<div className="text-xs text-muted-foreground">対応言語</div>
														<div className="flex flex-wrap gap-1">
															{(() => {
																const primaryLanguage = work._computed?.primaryLanguage || "ja";
																const availableLanguages = work._computed?.availableLanguages || [];

																return availableLanguages.map((lang) => (
																	<Badge
																		key={lang}
																		variant={lang === primaryLanguage ? "default" : "secondary"}
																		className={
																			lang === primaryLanguage
																				? "bg-info text-info-foreground text-xs px-2 py-1"
																				: "text-foreground bg-muted text-xs px-2 py-1"
																		}
																		title={lang === primaryLanguage ? "主要言語" : undefined}
																	>
																		{getWorkLanguageDisplayName(lang)}
																	</Badge>
																));
															})()}
														</div>
													</div>

													{/* 翻訳関係情報 */}
													{(() => {
														const translationInfo = work.translationInfo;
														if (!translationInfo) return null;

														const isTranslation =
															!translationInfo.isOriginal && translationInfo.originalWorkno;
														const isOriginalWithTranslations = translationInfo.isOriginal;

														if (!isTranslation && !isOriginalWithTranslations) return null;

														return (
															<div className="space-y-2">
																{/* 翻訳作品の場合 */}
																{isTranslation && translationInfo.originalWorkno && (
																	<div className="space-y-1">
																		<div className="text-xs text-muted-foreground">翻訳情報</div>
																		<div className="flex items-center gap-2 text-sm">
																			<div className="w-2 h-2 bg-warning rounded-full" />
																			<span className="text-foreground">この作品は翻訳版です</span>
																		</div>
																		<div className="text-xs text-muted-foreground ml-4">
																			原作:
																			<Link
																				href={`/works/${translationInfo.originalWorkno}`}
																				className="text-info hover:text-info/90 underline ml-1"
																			>
																				{translationInfo.originalWorkno}
																			</Link>
																		</div>
																	</div>
																)}

																{/* 翻訳版がある原作の場合 */}
																{isOriginalWithTranslations && (
																	<div className="space-y-1">
																		<div className="text-xs text-muted-foreground">原作</div>
																		<div className="flex items-center gap-2 text-sm">
																			<div className="w-2 h-2 bg-success rounded-full" />
																			<span className="text-foreground">翻訳版が利用可能です</span>
																		</div>
																	</div>
																)}

																{/* 言語版一覧（Individual Info API）*/}
																{work.languageDownloads && work.languageDownloads.length > 1 && (
																	<div className="space-y-1">
																		<div className="text-xs text-muted-foreground">他言語版</div>
																		<div className="space-y-1 ml-4">
																			{work.languageDownloads.map((download) => (
																				<div
																					key={download.workno}
																					className="flex items-center gap-2 text-xs"
																				>
																					<span className="text-foreground">{download.lang}</span>
																					<span className="text-muted-foreground">
																						({download.label || "言語不明"})
																					</span>
																				</div>
																			))}
																		</div>
																	</div>
																)}
															</div>
														);
													})()}
												</div>
											</div>
										</div>

										{/* 制作陣情報（Individual Info API準拠・段階的活用） */}
										<CreatorBadges creators={work.creators} />
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						{/* サンプル画像タブ */}
						<TabsContent value="samples" className="space-y-6">
							<SampleImageGallery
								sampleImages={work.sampleImages.map((img) => ({
									thumb: img.thumbnailUrl,
									width: img.width,
									height: img.height,
								}))}
								workTitle={work.title}
							/>
						</TabsContent>

						{/* 特性評価タブ */}
						<TabsContent value="characteristics" className="relative">
							<div className="space-y-4">
								<div className="text-center mb-6">
									<h3 className="text-xl font-semibold text-foreground mb-2">
										ユーザー特性評価 (4分類18軸)
									</h3>
									<p className="text-muted-foreground">
										ユーザーによる声質・性格・行動・魅力の多角的評価システム
									</p>
								</div>
								<CharacteristicEvaluation
									characteristics={characteristicData}
									showOverallStats={true}
								/>
							</div>
							<NotImplementedOverlay
								title="特性評価機能は準備中です"
								description="現在、ユーザー特性評価システムを開発中です。表示されているデータはモックデータです。"
							/>
						</TabsContent>

						{/* 価格推移タブ */}
						<TabsContent value="price-history" className="space-y-6">
							<PriceHistory workId={work.productId} />
						</TabsContent>
					</Tabs>
				</div>

				{/* 右側: サイドバー */}
				<div className="space-y-6">
					{/* 評価システム */}
					<WorkEvaluation
						workId={work.productId}
						workTitle={work.title}
						initialEvaluation={initialEvaluation}
					/>

					{/* サークル情報 */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Users className="h-5 w-5" />
								サークル情報
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex items-center gap-3 mb-4">
								<div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
									<span className="text-foreground font-bold text-lg">{work.circle.charAt(0)}</span>
								</div>
								<div className="flex-1">
									<p className="font-semibold text-foreground">{work.circle}</p>
								</div>
							</div>
							{work.circleId ? (
								<Button
									variant="outline"
									className="w-full border text-foreground hover:bg-accent"
									asChild
								>
									<Link href={`/circles/${work.circleId}`}>他の作品を見る</Link>
								</Button>
							) : (
								<Button
									variant="outline"
									className="w-full border text-foreground hover:bg-accent"
									disabled
								>
									他の作品を見る（準備中）
									{process.env.NODE_ENV === "development" && (
										<span className="text-xs text-destructive ml-2">[DEBUG: No circleId]</span>
									)}
								</Button>
							)}
						</CardContent>
					</Card>

					{/* クリエイター情報 */}
					{work.creators &&
						(work.creators.voiceActors.length > 0 ||
							work.creators.scenario.length > 0 ||
							work.creators.illustration.length > 0 ||
							work.creators.music.length > 0) && (
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Users className="h-5 w-5" />
										クリエイター情報
									</CardTitle>
								</CardHeader>
								<CardContent>
									<CreatorList creators={work.creators} />
								</CardContent>
							</Card>
						)}
				</div>
			</div>
		</div>
	);
}
