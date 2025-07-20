"use client";

import {
	checkAgeRating,
	getAgeRatingDisplayName,
	getWorkAvailableLanguages,
	getWorkCategoryDisplayText,
	getWorkLanguageDisplayName,
	getWorkPrimaryLanguage,
} from "@suzumina.click/shared-types";
import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
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
import { generateMockCharacteristicData } from "@/utils/mock-evaluation-data";
import SampleImageGallery from "./SampleImageGallery";

interface WorkDetailProps {
	work: FrontendDLsiteWorkData;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex UI component with multiple tabs and conditional rendering
export default function WorkDetail({ work }: WorkDetailProps) {
	// モック特性評価データを生成（作品IDに基づいて一意）
	const characteristicData = useMemo(
		() => generateMockCharacteristicData(work.productId),
		[work.productId],
	);

	// 年齢制限の判定
	const ageRatingCheck = useMemo(() => {
		return checkAgeRating(work.ageRating);
	}, [work.ageRating]);

	const renderStars = (rating: number) => {
		return (
			<div className="flex items-center">
				{[1, 2, 3, 4, 5].map((star) => (
					<Star
						key={star}
						className={`h-5 w-5 ${star <= rating ? "text-foreground fill-current" : "text-gray-300"}`}
					/>
				))}
			</div>
		);
	};

	// 価格表示の計算
	const currentPrice = work.price.current;
	// 元の価格を取得、もしくは割引率から計算
	const originalPrice =
		work.price.original ||
		(work.price.discount && work.price.discount > 0
			? Math.round(currentPrice / (1 - work.price.discount / 100))
			: undefined);
	const isOnSale = work.price.discount && work.price.discount > 0;

	// ランキング情報は現在利用できません
	const latestRank = undefined;

	const handleShare = () => {
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
	};

	return (
		<div className="max-w-6xl mx-auto">
			{/* パンくずリスト */}
			<nav className="mb-6 text-sm">
				<ol className="flex items-center space-x-2 text-gray-600 min-w-0">
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
					<li className="text-gray-800 font-medium truncate min-w-0 max-w-[200px] sm:max-w-[300px] md:max-w-[400px] lg:max-w-[500px]">
						{work.title}
					</li>
				</ol>
			</nav>

			{/* ヘッダー: 基本情報とサムネイル */}
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
					{/* 作品サムネイル */}
					<div className="space-y-4">
						<div className="relative aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
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
							<h1 className="text-3xl font-bold text-gray-900 mb-2">{work.title}</h1>
							<p className="text-lg text-gray-700">サークル: {work.circle}</p>
						</div>

						{/* 価格 */}
						<div className="space-y-2">
							{isOnSale && originalPrice ? (
								<div className="flex items-center gap-3">
									<span className="text-3xl font-bold text-destructive">
										¥{currentPrice.toLocaleString()}
									</span>
									<span className="text-xl text-gray-600 line-through">
										¥{originalPrice.toLocaleString()}
									</span>
									<Badge className="bg-destructive/10 text-destructive text-lg px-3 py-1">
										{work.price.discount}% OFF
									</Badge>
								</div>
							) : (
								<span className="text-3xl font-bold text-gray-900">
									¥{currentPrice.toLocaleString()}
								</span>
							)}
						</div>

						{/* 評価 */}
						{work.rating && (
							<div className="flex items-center gap-3">
								{renderStars(work.rating.stars)}
								<span className="text-xl font-semibold text-gray-900">
									{work.rating.stars.toFixed(1)}
								</span>
								<span className="text-base text-gray-600">({work.rating.count}件の評価)</span>
							</div>
						)}

						{/* 年齢レーティング表示 */}
						{work.ageRating && (
							<div className="space-y-2">
								<div className="text-sm font-medium text-gray-700">年齢指定</div>
								<div className="flex items-center gap-2">
									<Shield className="h-4 w-4 text-muted-foreground" />
									{ageRatingCheck.isR18 ? (
										<Badge
											variant="destructive"
											className="bg-red-600 text-white font-bold text-base px-4 py-2"
										>
											{getAgeRatingDisplayName(work.ageRating)}
										</Badge>
									) : ageRatingCheck.isAllAges ? (
										<Badge
											variant="outline"
											className="border-green-500 text-green-700 bg-green-50 font-medium text-base px-4 py-2"
										>
											{getAgeRatingDisplayName(work.ageRating)}
										</Badge>
									) : (
										<Badge
											variant="secondary"
											className="text-gray-700 bg-gray-100 font-medium text-base px-4 py-2"
										>
											{getAgeRatingDisplayName(work.ageRating)}
										</Badge>
									)}
								</div>
								{ageRatingCheck.isR18 && (
									<p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
										この作品は18歳以上の方を対象とした内容を含みます。
									</p>
								)}
							</div>
						)}

						{/* 言語情報表示（シンプル版） */}
						<div className="space-y-2">
							<div className="text-sm font-medium text-gray-700">対応言語</div>
							<div className="flex items-center gap-2">
								<Globe className="h-4 w-4 text-muted-foreground" />
								<Badge
									variant="default"
									className="bg-blue-600 text-white font-medium text-base px-3 py-1"
								>
									{getWorkLanguageDisplayName(getWorkPrimaryLanguage(work))}
								</Badge>
								{(() => {
									const availableLanguages = getWorkAvailableLanguages(work);
									const additionalCount = availableLanguages.length - 1;

									if (additionalCount > 0) {
										return <span className="text-sm text-gray-600">+{additionalCount}言語</span>;
									}
									return null;
								})()}
							</div>
						</div>

						{/* タグ・ジャンル（Individual Info API準拠・段階的活用） */}
						<div className="space-y-3">
							{/* ジャンル（Individual Info API準拠・段階的活用） */}
							{(() => {
								// Individual Info API準拠のジャンル情報を優先使用
								const apiGenres = work.apiGenres || [];
								const apiCustomGenres = work.apiCustomGenres || [];
								const legacyGenres = work.genres || [];

								// API準拠ジャンル情報がある場合はそれを使用、なければレガシー情報
								const displayGenres =
									apiGenres.length > 0 || apiCustomGenres.length > 0
										? [...apiGenres, ...apiCustomGenres]
										: legacyGenres;

								if (displayGenres.length === 0) return null;

								return (
									<div>
										<div className="text-sm font-medium text-gray-700 mb-2">ジャンル</div>
										<div className="flex flex-wrap gap-2">
											{/* 標準ジャンル */}
											{apiGenres.map((genre, index) => (
												<Badge
													key={`api-${typeof genre === "string" ? genre : genre.name || index}`}
													variant="outline"
													className="border-primary/20 text-primary bg-primary/5 flex items-center gap-1"
												>
													<Tag className="h-3 w-3" />
													{typeof genre === "string" ? genre : genre.name}
												</Badge>
											))}
											{/* カスタムジャンル */}
											{apiCustomGenres.map((genre, index) => (
												<Badge
													key={`custom-${typeof genre === "string" ? genre : genre.name || index}`}
													variant="outline"
													className="border-secondary/30 text-secondary-foreground bg-secondary/10 flex items-center gap-1"
												>
													<Tag className="h-3 w-3" />
													{typeof genre === "string" ? genre : genre.name}
												</Badge>
											))}
											{/* レガシージャンル（API情報がない場合のみ表示） */}
											{apiGenres.length === 0 &&
												apiCustomGenres.length === 0 &&
												legacyGenres.map((genre) => (
													<Badge
														key={`legacy-${genre}`}
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
									onClick={handleShare}
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
													<div className="text-sm text-gray-700">作品ID</div>
													<div className="font-semibold text-gray-900 font-mono">
														{work.productId}
													</div>
												</div>
											</div>
											<div className="flex items-center gap-3">
												<Tag className="h-5 w-5 text-muted-foreground" />
												<div>
													<div className="text-sm text-gray-700">カテゴリ</div>
													<div className="font-semibold text-gray-900">
														{getWorkCategoryDisplayText(work)}
													</div>
												</div>
											</div>
											{work.releaseDate && (
												<div className="flex items-center gap-3">
													<Calendar className="h-5 w-5 text-muted-foreground" />
													<div>
														<div className="text-sm text-gray-700">販売日</div>
														<div className="font-semibold text-gray-900">{work.releaseDate}</div>
													</div>
												</div>
											)}
											{work.seriesName && (
												<div className="flex items-center gap-3">
													<FileText className="h-5 w-5 text-muted-foreground" />
													<div>
														<div className="text-sm text-gray-700">シリーズ名</div>
														<div className="font-semibold text-gray-900">{work.seriesName}</div>
													</div>
												</div>
											)}
											{work.ageRating && (
												<div className="flex items-center gap-3">
													<Shield className="h-5 w-5 text-muted-foreground" />
													<div>
														<div className="text-sm text-gray-700">年齢指定</div>
														<div className="flex items-center gap-2">
															{ageRatingCheck.isR18 ? (
																<Badge
																	variant="destructive"
																	className="bg-red-600 text-white font-bold text-sm px-3 py-1"
																>
																	{getAgeRatingDisplayName(work.ageRating)}
																</Badge>
															) : ageRatingCheck.isAllAges ? (
																<Badge
																	variant="outline"
																	className="border-green-500 text-green-700 bg-green-50 font-medium text-sm px-3 py-1"
																>
																	{getAgeRatingDisplayName(work.ageRating)}
																</Badge>
															) : (
																<Badge
																	variant="secondary"
																	className="text-gray-700 bg-gray-100 font-medium text-sm px-3 py-1"
																>
																	{getAgeRatingDisplayName(work.ageRating)}
																</Badge>
															)}
														</div>
													</div>
												</div>
											)}

											{/* 詳細言語・翻訳情報 */}
											<div className="flex items-start gap-3">
												<Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
												<div className="space-y-3 flex-1">
													<div className="text-sm text-gray-700">言語・翻訳情報</div>

													{/* 対応言語一覧 */}
													<div className="space-y-2">
														<div className="text-xs text-gray-600">対応言語</div>
														<div className="flex flex-wrap gap-1">
															{(() => {
																const primaryLanguage = getWorkPrimaryLanguage(work);
																const availableLanguages = getWorkAvailableLanguages(work);

																return availableLanguages.map((lang) => (
																	<Badge
																		key={lang}
																		variant={lang === primaryLanguage ? "default" : "secondary"}
																		className={
																			lang === primaryLanguage
																				? "bg-blue-600 text-white text-xs px-2 py-1"
																				: "text-gray-700 bg-gray-100 text-xs px-2 py-1"
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
															translationInfo.isChild || translationInfo.originalWorkno;
														const isOriginalWithTranslations =
															translationInfo.isParent ||
															(translationInfo.childWorknos &&
																translationInfo.childWorknos.length > 0);

														if (!isTranslation && !isOriginalWithTranslations) return null;

														return (
															<div className="space-y-2">
																{/* 翻訳作品の場合 */}
																{isTranslation && translationInfo.originalWorkno && (
																	<div className="space-y-1">
																		<div className="text-xs text-gray-600">翻訳情報</div>
																		<div className="flex items-center gap-2 text-sm">
																			<div className="w-2 h-2 bg-amber-500 rounded-full" />
																			<span className="text-gray-700">この作品は翻訳版です</span>
																		</div>
																		<div className="text-xs text-gray-600 ml-4">
																			原作:
																			<Link
																				href={`/works/${translationInfo.originalWorkno}`}
																				className="text-blue-600 hover:text-blue-800 underline ml-1"
																			>
																				{translationInfo.originalWorkno}
																			</Link>
																		</div>
																	</div>
																)}

																{/* 翻訳版がある原作の場合 */}
																{isOriginalWithTranslations &&
																	translationInfo.childWorknos &&
																	translationInfo.childWorknos.length > 0 && (
																		<div className="space-y-1">
																			<div className="text-xs text-gray-600">翻訳版</div>
																			<div className="flex items-center gap-2 text-sm">
																				<div className="w-2 h-2 bg-green-500 rounded-full" />
																				<span className="text-gray-700">
																					{translationInfo.childWorknos.length}件の翻訳版があります
																				</span>
																			</div>
																			<div className="flex flex-wrap gap-1 ml-4">
																				{translationInfo.childWorknos.map((childWorkno: string) => (
																					<Link
																						key={childWorkno}
																						href={`/works/${childWorkno}`}
																						className="text-xs text-blue-600 hover:text-blue-800 underline"
																					>
																						{childWorkno}
																					</Link>
																				))}
																			</div>
																		</div>
																	)}

																{/* 言語版一覧（Individual Info API）*/}
																{work.languageDownloads && work.languageDownloads.length > 1 && (
																	<div className="space-y-1">
																		<div className="text-xs text-gray-600">他言語版</div>
																		<div className="space-y-1 ml-4">
																			{work.languageDownloads.map((download) => (
																				<div
																					key={download.workno}
																					className="flex items-center gap-2 text-xs"
																				>
																					<span className="text-gray-700">{download.lang}</span>
																					<span className="text-gray-500">
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
										<div className="space-y-4">
											{/* 声優（Individual Info API優先） */}
											{(() => {
												const apiVoiceActors = work.creaters?.voice_by || [];
												const legacyVoiceActors = work.voiceActors || [];

												const displayVoiceActors =
													apiVoiceActors.length > 0
														? apiVoiceActors
														: legacyVoiceActors.map((name) => ({ name, id: undefined }));

												if (displayVoiceActors.length === 0) return null;

												return (
													<div>
														<div className="text-sm text-gray-700 mb-2">声優</div>
														<div className="flex flex-wrap gap-2">
															{displayVoiceActors.map((actor, index) => (
																<Badge
																	key={actor.id || actor.name || index}
																	variant="secondary"
																	className="text-xs"
																	title={actor.id ? `ID: ${actor.id}` : undefined}
																>
																	{actor.name}
																</Badge>
															))}
														</div>
													</div>
												);
											})()}

											{/* シナリオ（Individual Info API優先） */}
											{(() => {
												const apiScenarioWriters = work.creaters?.scenario_by || [];
												const legacyScenarioWriters = work.scenario || [];

												const displayScenarioWriters =
													apiScenarioWriters.length > 0
														? apiScenarioWriters
														: legacyScenarioWriters.map((name) => ({ name, id: undefined }));

												if (displayScenarioWriters.length === 0) return null;

												return (
													<div>
														<div className="text-sm text-gray-700 mb-2">シナリオ</div>
														<div className="flex flex-wrap gap-2">
															{displayScenarioWriters.map((writer, index) => (
																<Badge
																	key={writer.id || writer.name || index}
																	variant="secondary"
																	className="text-xs"
																	title={writer.id ? `ID: ${writer.id}` : undefined}
																>
																	{writer.name}
																</Badge>
															))}
														</div>
													</div>
												);
											})()}

											{/* イラスト（Individual Info API優先） */}
											{(() => {
												const apiIllustrators = work.creaters?.illust_by || [];
												const legacyIllustrators = work.illustration || [];

												const displayIllustrators =
													apiIllustrators.length > 0
														? apiIllustrators
														: legacyIllustrators.map((name) => ({ name, id: undefined }));

												if (displayIllustrators.length === 0) return null;

												return (
													<div>
														<div className="text-sm text-gray-700 mb-2">イラスト</div>
														<div className="flex flex-wrap gap-2">
															{displayIllustrators.map((illustrator, index) => (
																<Badge
																	key={illustrator.id || illustrator.name || index}
																	variant="secondary"
																	className="text-xs"
																	title={illustrator.id ? `ID: ${illustrator.id}` : undefined}
																>
																	{illustrator.name}
																</Badge>
															))}
														</div>
													</div>
												);
											})()}

											{/* 音楽（Individual Info API優先） */}
											{(() => {
												const apiMusicians = work.creaters?.music_by || [];
												const legacyMusicians = work.music || [];

												const displayMusicians =
													apiMusicians.length > 0
														? apiMusicians
														: legacyMusicians.map((name) => ({ name, id: undefined }));

												if (displayMusicians.length === 0) return null;

												return (
													<div>
														<div className="text-sm text-gray-700 mb-2">音楽</div>
														<div className="flex flex-wrap gap-2">
															{displayMusicians.map((musician, index) => (
																<Badge
																	key={musician.id || musician.name || index}
																	variant="secondary"
																	className="text-xs"
																	title={musician.id ? `ID: ${musician.id}` : undefined}
																>
																	{musician.name}
																</Badge>
															))}
														</div>
													</div>
												);
											})()}

											{/* その他制作者（Individual Info API専用） */}
											{work.creaters?.others_by && work.creaters.others_by.length > 0 && (
												<div>
													<div className="text-sm text-gray-700 mb-2">その他</div>
													<div className="flex flex-wrap gap-2">
														{work.creaters.others_by.map((creator, index) => (
															<Badge
																key={creator.id || creator.name || index}
																variant="secondary"
																className="text-xs"
																title={creator.id ? `ID: ${creator.id}` : undefined}
															>
																{creator.name}
															</Badge>
														))}
													</div>
												</div>
											)}

											{/* 制作者（Individual Info API専用） */}
											{work.creaters?.created_by && work.creaters.created_by.length > 0 && (
												<div>
													<div className="text-sm text-gray-700 mb-2">制作者</div>
													<div className="flex flex-wrap gap-2">
														{work.creaters.created_by.map((creator, index) => (
															<Badge
																key={creator.id || creator.name || index}
																variant="secondary"
																className="text-xs"
																title={creator.id ? `ID: ${creator.id}` : undefined}
															>
																{creator.name}
															</Badge>
														))}
													</div>
												</div>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						{/* サンプル画像タブ */}
						<TabsContent value="samples" className="space-y-6">
							<SampleImageGallery sampleImages={work.sampleImages} workTitle={work.title} />
						</TabsContent>

						{/* 特性評価タブ */}
						<TabsContent value="characteristics" className="relative">
							<div className="space-y-4">
								<div className="text-center mb-6">
									<h3 className="text-xl font-semibold text-gray-900 mb-2">
										ユーザー特性評価 (4分類18軸)
									</h3>
									<p className="text-gray-600">
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
							<div className="space-y-4">
								<div className="text-center mb-6">
									<h3 className="text-xl font-semibold text-gray-900 mb-2">価格推移チャート</h3>
									<p className="text-gray-600">
										DLsite Individual Info APIによる日次価格履歴データ
									</p>
								</div>
								<PriceHistory workId={work.productId} />
							</div>
						</TabsContent>
					</Tabs>
				</div>

				{/* 右側: サイドバー */}
				<div className="space-y-6">
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
									<p className="font-semibold text-gray-900">{work.circle}</p>
								</div>
							</div>
							<Button
								variant="outline"
								className="w-full border text-foreground hover:bg-accent"
								disabled
							>
								他の作品を見る（準備中）
							</Button>
						</CardContent>
					</Card>

					{/* クリエイター情報 */}
					{((work.voiceActors && work.voiceActors.length > 0) ||
						(work.scenario && work.scenario.length > 0) ||
						(work.illustration && work.illustration.length > 0) ||
						(work.music && work.music.length > 0)) && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Users className="h-5 w-5" />
									クリエイター情報
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{/* 声優（Individual Info API優先） */}
									{(() => {
										const apiVoiceActors = work.creaters?.voice_by || [];
										const legacyVoiceActors = work.voiceActors || [];

										const displayVoiceActors =
											apiVoiceActors.length > 0
												? apiVoiceActors
												: legacyVoiceActors.map((name) => ({ name, id: undefined }));

										if (displayVoiceActors.length === 0) return null;

										return (
											<div>
												<h5 className="text-sm font-medium text-gray-700 mb-2">声優（CV）</h5>
												<div className="space-y-2">
													{displayVoiceActors.map((actor, index) => (
														<div
															key={actor.id || actor.name || index}
															className="flex items-center gap-3"
														>
															<div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
																<span className="text-foreground font-bold text-xs">
																	{actor.name.charAt(0)}
																</span>
															</div>
															<span
																className="text-gray-900 text-sm"
																title={actor.id ? `ID: ${actor.id}` : undefined}
															>
																{actor.name}
															</span>
														</div>
													))}
												</div>
											</div>
										);
									})()}

									{/* シナリオ（Individual Info API優先） */}
									{(() => {
										const apiScenarioWriters = work.creaters?.scenario_by || [];
										const legacyScenarioWriters = work.scenario || [];

										const displayScenarioWriters =
											apiScenarioWriters.length > 0
												? apiScenarioWriters
												: legacyScenarioWriters.map((name) => ({ name, id: undefined }));

										if (displayScenarioWriters.length === 0) return null;

										return (
											<div>
												<h5 className="text-sm font-medium text-gray-700 mb-2">シナリオ</h5>
												<div className="space-y-2">
													{displayScenarioWriters.map((writer, index) => (
														<div
															key={writer.id || writer.name || index}
															className="flex items-center gap-3"
														>
															<div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
																<span className="text-foreground font-bold text-xs">
																	{writer.name.charAt(0)}
																</span>
															</div>
															<span
																className="text-gray-900 text-sm"
																title={writer.id ? `ID: ${writer.id}` : undefined}
															>
																{writer.name}
															</span>
														</div>
													))}
												</div>
											</div>
										);
									})()}

									{/* イラスト（Individual Info API優先） */}
									{(() => {
										const apiIllustrators = work.creaters?.illust_by || [];
										const legacyIllustrators = work.illustration || [];

										const displayIllustrators =
											apiIllustrators.length > 0
												? apiIllustrators
												: legacyIllustrators.map((name) => ({ name, id: undefined }));

										if (displayIllustrators.length === 0) return null;

										return (
											<div>
												<h5 className="text-sm font-medium text-gray-700 mb-2">イラスト</h5>
												<div className="space-y-2">
													{displayIllustrators.map((illustrator, index) => (
														<div
															key={illustrator.id || illustrator.name || index}
															className="flex items-center gap-3"
														>
															<div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
																<span className="text-foreground font-bold text-xs">
																	{illustrator.name.charAt(0)}
																</span>
															</div>
															<span
																className="text-gray-900 text-sm"
																title={illustrator.id ? `ID: ${illustrator.id}` : undefined}
															>
																{illustrator.name}
															</span>
														</div>
													))}
												</div>
											</div>
										);
									})()}

									{/* 音楽（Individual Info API優先） */}
									{(() => {
										const apiMusicians = work.creaters?.music_by || [];
										const legacyMusicians = work.music || [];

										const displayMusicians =
											apiMusicians.length > 0
												? apiMusicians
												: legacyMusicians.map((name) => ({ name, id: undefined }));

										if (displayMusicians.length === 0) return null;

										return (
											<div>
												<h5 className="text-sm font-medium text-gray-700 mb-2">音楽</h5>
												<div className="space-y-2">
													{displayMusicians.map((musician, index) => (
														<div
															key={musician.id || musician.name || index}
															className="flex items-center gap-3"
														>
															<div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
																<span className="text-foreground font-bold text-xs">
																	{musician.name.charAt(0)}
																</span>
															</div>
															<span
																className="text-gray-900 text-sm"
																title={musician.id ? `ID: ${musician.id}` : undefined}
															>
																{musician.name}
															</span>
														</div>
													))}
												</div>
											</div>
										);
									})()}

									{/* その他制作者（Individual Info API専用） */}
									{work.creaters?.others_by && work.creaters.others_by.length > 0 && (
										<div>
											<h5 className="text-sm font-medium text-gray-700 mb-2">その他</h5>
											<div className="space-y-2">
												{work.creaters.others_by.map((creator, index) => (
													<div
														key={creator.id || creator.name || index}
														className="flex items-center gap-3"
													>
														<div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
															<span className="text-foreground font-bold text-xs">
																{creator.name.charAt(0)}
															</span>
														</div>
														<span
															className="text-gray-900 text-sm"
															title={creator.id ? `ID: ${creator.id}` : undefined}
														>
															{creator.name}
														</span>
													</div>
												))}
											</div>
										</div>
									)}

									{/* 制作者（Individual Info API専用） */}
									{work.creaters?.created_by && work.creaters.created_by.length > 0 && (
										<div>
											<h5 className="text-sm font-medium text-gray-700 mb-2">制作者</h5>
											<div className="space-y-2">
												{work.creaters.created_by.map((creator, index) => (
													<div
														key={creator.id || creator.name || index}
														className="flex items-center gap-3"
													>
														<div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
															<span className="text-foreground font-bold text-xs">
																{creator.name.charAt(0)}
															</span>
														</div>
														<span
															className="text-gray-900 text-sm"
															title={creator.id ? `ID: ${creator.id}` : undefined}
														>
															{creator.name}
														</span>
													</div>
												))}
											</div>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</div>
	);
}
