"use client";

import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
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
	BarChart3,
	Calendar,
	Clock,
	FileText,
	Share2,
	ShoppingCart,
	Star,
	Tag,
	TrendingUp,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import CharacteristicEvaluation from "@/components/CharacteristicEvaluation";
import PriceHistoryChart from "@/components/charts/PriceHistoryChart";
import SalesHistoryChart from "@/components/charts/SalesHistoryChart";
import ThumbnailImage from "@/components/ThumbnailImage";
import { generateMockTimeSeriesData } from "@/utils/mock-chart-data";
import { generateMockCharacteristicData } from "@/utils/mock-evaluation-data";

interface WorkDetailProps {
	work: FrontendDLsiteWorkData;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex UI component with multiple tabs and conditional rendering
export default function WorkDetail({ work }: WorkDetailProps) {
	// モックデータを生成（作品IDに基づいて一意）
	const timeSeriesData = useMemo(
		() => generateMockTimeSeriesData(work.productId),
		[work.productId],
	);

	// モック特性評価データを生成（作品IDに基づいて一意）
	const characteristicData = useMemo(
		() => generateMockCharacteristicData(work.productId),
		[work.productId],
	);

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
	const originalPrice = work.price.original;
	const isOnSale = work.price.discount && work.price.discount > 0;

	// 日付フォーマット
	const formatDate = (dateString: string) => {
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString("ja-JP", {
				timeZone: "Asia/Tokyo",
				year: "numeric",
				month: "long",
				day: "numeric",
			});
		} catch {
			return dateString;
		}
	};

	// ランキング情報を取得（最新のランキング）
	const latestRank =
		work.rankingHistory && work.rankingHistory.length > 0
			? work.rankingHistory[0]?.rank
			: undefined;

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
				<ol className="flex items-center space-x-2 text-gray-600">
					<li>
						<Link href="/" className="hover:text-foreground/80">
							ホーム
						</Link>
					</li>
					<li>
						<span className="mx-2">/</span>
					</li>
					<li>
						<Link href="/works" className="hover:text-foreground/80">
							作品一覧
						</Link>
					</li>
					<li>
						<span className="mx-2">/</span>
					</li>
					<li className="text-gray-800 font-medium truncate">{work.title}</li>
				</ol>
			</nav>

			{/* ヘッダー: 基本情報とサムネイル */}
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
					{/* 作品サムネイル */}
					<div className="space-y-4">
						<div className="relative">
							<ThumbnailImage
								src={work.highResImageUrl || work.thumbnailUrl}
								alt={work.title}
								className="w-full h-80 object-cover rounded-lg"
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

						{/* タグ・ジャンル */}
						<div className="space-y-3">
							{/* 基本情報のジャンル */}
							{work.basicInfo?.genres && work.basicInfo.genres.length > 0 && (
								<div>
									<div className="text-sm font-medium text-gray-700 mb-2">ジャンル</div>
									<div className="flex flex-wrap gap-2">
										{work.basicInfo.genres.map((genre) => (
											<Badge
												key={genre}
												variant="outline"
												className="border-primary/20 text-primary bg-primary/5 flex items-center gap-1"
											>
												<Tag className="h-3 w-3" />
												{genre}
											</Badge>
										))}
									</div>
								</div>
							)}

							{/* 既存のタグ（基本情報のジャンルと重複しない場合） */}
							{work.tags && work.tags.length > 0 && (
								<div>
									<div className="text-sm font-medium text-gray-700 mb-2">タグ</div>
									<div className="flex flex-wrap gap-2">
										{work.tags
											.filter((tag) => !work.basicInfo?.genres?.includes(tag))
											.map((tag) => (
												<Badge
													key={tag}
													variant="outline"
													className="border text-foreground flex items-center gap-1"
												>
													<Tag className="h-3 w-3" />
													{tag}
												</Badge>
											))}
									</div>
								</div>
							)}

							{/* 詳細タグ（ジャンルやタグと重複しない場合） */}
							{work.basicInfo?.detailTags && work.basicInfo.detailTags.length > 0 && (
								<div>
									<div className="text-sm font-medium text-gray-700 mb-2">詳細タグ</div>
									<div className="flex flex-wrap gap-2">
										{work.basicInfo.detailTags
											.filter(
												(detailTag) =>
													!work.basicInfo?.genres?.includes(detailTag) &&
													!work.tags?.includes(detailTag),
											)
											.map((detailTag) => (
												<Badge
													key={detailTag}
													variant="outline"
													className="border-secondary/20 text-secondary bg-secondary/5 flex items-center gap-1"
												>
													<Tag className="h-3 w-3" />
													{detailTag}
												</Badge>
											))}
									</div>
								</div>
							)}
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
						<TabsList className="grid w-full grid-cols-5">
							<TabsTrigger value="overview" className="flex items-center gap-2">
								<FileText className="h-4 w-4" />
								<span className="hidden sm:inline">概要</span>
							</TabsTrigger>
							<TabsTrigger value="characteristics" className="flex items-center gap-2">
								<Star className="h-4 w-4" />
								<span className="hidden sm:inline">特性評価</span>
							</TabsTrigger>
							<TabsTrigger value="price-history" className="flex items-center gap-2">
								<TrendingUp className="h-4 w-4" />
								<span className="hidden sm:inline">価格推移</span>
							</TabsTrigger>
							<TabsTrigger value="sales-history" className="flex items-center gap-2">
								<BarChart3 className="h-4 w-4" />
								<span className="hidden sm:inline">販売推移</span>
							</TabsTrigger>
							<TabsTrigger value="specifications" className="flex items-center gap-2">
								<Clock className="h-4 w-4" />
								<span className="hidden sm:inline">仕様</span>
							</TabsTrigger>
						</TabsList>

						{/* 概要タブ */}
						<TabsContent value="overview" className="space-y-6">
							{/* 作品説明 */}
							{work.description && (
								<Card>
									<CardHeader>
										<CardTitle>作品説明</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="bg-gray-50 rounded-lg p-4">
											<p className="text-gray-700 whitespace-pre-line leading-relaxed">
												{work.description}
											</p>
										</div>
									</CardContent>
								</Card>
							)}

							{/* 基本作品情報（詳細パーサーから取得） */}
							{work.basicInfo && (
								<Card>
									<CardHeader>
										<CardTitle>詳細作品情報</CardTitle>
										<CardDescription>work_outlineテーブルから抽出された詳細情報</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
											{/* 発売・形式情報 */}
											<div className="space-y-4">
												{work.basicInfo.releaseDate && (
													<div className="flex items-center gap-3">
														<Calendar className="h-5 w-5 text-muted-foreground" />
														<div>
															<div className="text-sm text-gray-700">販売日</div>
															<div className="font-semibold text-gray-900">
																{work.basicInfo.releaseDate}
															</div>
														</div>
													</div>
												)}
												{work.basicInfo.seriesName && (
													<div className="flex items-center gap-3">
														<FileText className="h-5 w-5 text-muted-foreground" />
														<div>
															<div className="text-sm text-gray-700">シリーズ名</div>
															<div className="font-semibold text-gray-900">
																{work.basicInfo.seriesName}
															</div>
														</div>
													</div>
												)}
												{work.basicInfo.workFormat && (
													<div className="flex items-center gap-3">
														<FileText className="h-5 w-5 text-muted-foreground" />
														<div>
															<div className="text-sm text-gray-700">作品形式</div>
															<div className="font-semibold text-gray-900">
																{work.basicInfo.workFormat}
															</div>
														</div>
													</div>
												)}
												{work.basicInfo.fileFormat && (
													<div className="flex items-center gap-3">
														<FileText className="h-5 w-5 text-muted-foreground" />
														<div>
															<div className="text-sm text-gray-700">ファイル形式</div>
															<div className="font-semibold text-gray-900">
																{work.basicInfo.fileFormat}
															</div>
														</div>
													</div>
												)}
												{work.basicInfo.fileSize && (
													<div className="flex items-center gap-3">
														<Clock className="h-5 w-5 text-muted-foreground" />
														<div>
															<div className="text-sm text-gray-700">ファイル容量</div>
															<div className="font-semibold text-gray-900">
																{work.basicInfo.fileSize}
															</div>
														</div>
													</div>
												)}
											</div>

											{/* クリエイター情報 */}
											<div className="space-y-4">
												{work.basicInfo.author && work.basicInfo.author.length > 0 && (
													<div>
														<div className="text-sm text-gray-700 mb-2">作者</div>
														<div className="flex flex-wrap gap-2">
															{work.basicInfo.author.map((author) => (
																<Badge key={author} variant="secondary" className="text-xs">
																	{author}
																</Badge>
															))}
														</div>
													</div>
												)}
												{work.basicInfo.voiceActors && work.basicInfo.voiceActors.length > 0 && (
													<div>
														<div className="text-sm text-gray-700 mb-2">声優</div>
														<div className="flex flex-wrap gap-2">
															{work.basicInfo.voiceActors.map((actor) => (
																<Badge key={actor} variant="secondary" className="text-xs">
																	{actor}
																</Badge>
															))}
														</div>
													</div>
												)}
												{work.basicInfo.scenario && work.basicInfo.scenario.length > 0 && (
													<div>
														<div className="text-sm text-gray-700 mb-2">シナリオ</div>
														<div className="flex flex-wrap gap-2">
															{work.basicInfo.scenario.map((scenario) => (
																<Badge key={scenario} variant="secondary" className="text-xs">
																	{scenario}
																</Badge>
															))}
														</div>
													</div>
												)}
												{work.basicInfo.illustration && work.basicInfo.illustration.length > 0 && (
													<div>
														<div className="text-sm text-gray-700 mb-2">イラスト</div>
														<div className="flex flex-wrap gap-2">
															{work.basicInfo.illustration.map((artist) => (
																<Badge key={artist} variant="secondary" className="text-xs">
																	{artist}
																</Badge>
															))}
														</div>
													</div>
												)}
												{work.basicInfo.music && work.basicInfo.music.length > 0 && (
													<div>
														<div className="text-sm text-gray-700 mb-2">音楽</div>
														<div className="flex flex-wrap gap-2">
															{work.basicInfo.music.map((musician) => (
																<Badge key={musician} variant="secondary" className="text-xs">
																	{musician}
																</Badge>
															))}
														</div>
													</div>
												)}
											</div>
										</div>
									</CardContent>
								</Card>
							)}

							{/* 基本統計 */}
							<Card>
								<CardHeader>
									<CardTitle>基本情報</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="grid grid-cols-2 gap-4">
										{work.salesCount && (
											<div className="flex items-center gap-2">
												<TrendingUp className="h-5 w-5 text-muted-foreground" />
												<div>
													<div className="text-sm text-gray-700">販売数</div>
													<div className="font-semibold text-gray-900">
														{work.salesCount.toLocaleString()}
													</div>
												</div>
											</div>
										)}
										{(work.registDate || work.basicInfo?.releaseDate) && (
											<div className="flex items-center gap-2">
												<Calendar className="h-5 w-5 text-muted-foreground" />
												<div>
													<div className="text-sm text-gray-700">発売日</div>
													<div className="font-semibold text-gray-900">
														{work.basicInfo?.releaseDate ||
															(work.registDate && formatDate(work.registDate))}
													</div>
												</div>
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						{/* 特性評価タブ */}
						<TabsContent value="characteristics">
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
									characteristics={work.aggregatedCharacteristics || characteristicData}
									showOverallStats={true}
								/>
							</div>
						</TabsContent>

						{/* 価格推移タブ */}
						<TabsContent value="price-history">
							<Card>
								<CardHeader>
									<CardTitle>価格推移</CardTitle>
									<CardDescription>時系列での価格変動・セール履歴</CardDescription>
								</CardHeader>
								<CardContent>
									<PriceHistoryChart data={timeSeriesData.priceHistory} />

									{/* 価格統計情報 */}
									<div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
										<div className="text-center">
											<div className="text-sm text-gray-600">現在価格</div>
											<div className="text-lg font-semibold text-gray-900">
												¥{currentPrice.toLocaleString()}
											</div>
										</div>
										{originalPrice && originalPrice !== currentPrice && (
											<div className="text-center">
												<div className="text-sm text-gray-600">定価</div>
												<div className="text-lg font-semibold text-gray-900">
													¥{originalPrice.toLocaleString()}
												</div>
											</div>
										)}
										{work.price.discount && work.price.discount > 0 && (
											<div className="text-center">
												<div className="text-sm text-gray-600">割引率</div>
												<div className="text-lg font-semibold text-destructive">
													{work.price.discount}% OFF
												</div>
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						{/* 販売推移タブ */}
						<TabsContent value="sales-history">
							<Card>
								<CardHeader>
									<CardTitle>販売推移</CardTitle>
									<CardDescription>時系列での販売数・ランキング推移</CardDescription>
								</CardHeader>
								<CardContent>
									<SalesHistoryChart
										salesData={timeSeriesData.salesHistory}
										rankingData={timeSeriesData.rankingHistory}
										type="combined"
									/>

									{/* 販売統計情報 */}
									<div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
										<div className="text-center">
											<div className="text-sm text-gray-600">総販売数</div>
											<div className="text-lg font-semibold text-gray-900">
												{work.salesCount ? work.salesCount.toLocaleString() : "不明"}本
											</div>
										</div>
										{latestRank && (
											<div className="text-center">
												<div className="text-sm text-gray-600">最新ランキング</div>
												<div className="text-lg font-semibold text-primary">#{latestRank}位</div>
											</div>
										)}
										{timeSeriesData.salesHistory.length > 0 && (
											<div className="text-center">
												<div className="text-sm text-gray-600">最新期間販売数</div>
												<div className="text-lg font-semibold text-gray-900">
													+
													{timeSeriesData.salesHistory[timeSeriesData.salesHistory.length - 1]
														?.periodSales || 0}
													本
												</div>
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						{/* 仕様タブ */}
						<TabsContent value="specifications">
							<Card>
								<CardHeader>
									<CardTitle>技術仕様・ファイル情報</CardTitle>
									<CardDescription>ファイル情報・技術仕様・特典内容</CardDescription>
								</CardHeader>
								<CardContent className="space-y-6">
									{/* 基本技術仕様 */}
									<div className="space-y-4">
										<h4 className="font-medium text-gray-900">基本仕様</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
											<div className="flex justify-between">
												<span className="text-gray-700">作品ID:</span>
												<span className="text-gray-900 font-mono">{work.productId}</span>
											</div>
											<div className="flex justify-between">
												<span className="text-gray-700">カテゴリ:</span>
												<span className="text-gray-900">{work.category}</span>
											</div>
											{work.ageRating && (
												<div className="flex justify-between">
													<span className="text-gray-700">年齢制限:</span>
													<span className="text-gray-900">{work.ageRating}</span>
												</div>
											)}
										</div>
									</div>

									{/* ファイル情報 */}
									{work.fileInfo && (
										<div className="space-y-4">
											<h4 className="font-medium text-gray-900">ファイル情報</h4>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
												{work.fileInfo.totalSizeText && (
													<div className="flex justify-between">
														<span className="text-gray-700">総容量:</span>
														<span className="text-gray-900 font-mono">
															{work.fileInfo.totalSizeText}
														</span>
													</div>
												)}
												{work.fileInfo.totalDurationText && (
													<div className="flex justify-between">
														<span className="text-gray-700">総再生時間:</span>
														<span className="text-gray-900">{work.fileInfo.totalDurationText}</span>
													</div>
												)}
												{work.fileInfo.formats && work.fileInfo.formats.length > 0 && (
													<div className="md:col-span-2">
														<div className="mb-2">
															<span className="text-gray-700">ファイル形式:</span>
														</div>
														<div className="flex flex-wrap gap-2">
															{work.fileInfo.formats.map((format) => (
																<span
																	key={format}
																	className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono"
																>
																	{format}
																</span>
															))}
														</div>
													</div>
												)}
												{work.fileInfo.additionalFiles &&
													work.fileInfo.additionalFiles.length > 0 && (
														<div className="md:col-span-2">
															<div className="mb-2">
																<span className="text-gray-700">付属ファイル:</span>
															</div>
															<div className="space-y-1">
																{work.fileInfo.additionalFiles.map((file) => (
																	<div key={file} className="text-gray-900 text-xs">
																		• {file}
																	</div>
																))}
															</div>
														</div>
													)}
											</div>
										</div>
									)}

									{/* 特典・おまけ情報 */}
									{work.bonusContent && work.bonusContent.length > 0 && (
										<div className="space-y-4">
											<h4 className="font-medium text-gray-900">特典・おまけ</h4>
											<div className="space-y-3">
												{work.bonusContent.map((bonus, index) => (
													<div
														key={`${bonus.title}-${index}`}
														className="bg-gray-50 rounded-lg p-4"
													>
														<div className="flex items-start gap-3">
															<div className="flex-shrink-0">
																<div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
																	<span className="text-primary font-bold text-sm">特</span>
																</div>
															</div>
															<div className="flex-1">
																<div className="flex items-center gap-2 mb-1">
																	<h5 className="font-medium text-gray-900">{bonus.title}</h5>
																	{bonus.type && (
																		<span className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
																			{bonus.type}
																		</span>
																	)}
																</div>
																{bonus.description && (
																	<p className="text-sm text-gray-700 whitespace-pre-line">
																		{bonus.description}
																	</p>
																)}
															</div>
														</div>
													</div>
												))}
											</div>
										</div>
									)}
								</CardContent>
							</Card>
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
					{((work.detailedCreators &&
						((work.detailedCreators.voiceActors?.length ?? 0) > 0 ||
							(work.detailedCreators.scenario?.length ?? 0) > 0 ||
							(work.detailedCreators.illustration?.length ?? 0) > 0 ||
							(work.detailedCreators.music?.length ?? 0) > 0 ||
							(work.detailedCreators.design?.length ?? 0) > 0 ||
							Object.keys(work.detailedCreators.other ?? {}).length > 0)) ||
						(work.author && work.author.length > 0) ||
						(work.basicInfo &&
							((work.basicInfo.author?.length ?? 0) > 0 ||
								(work.basicInfo.voiceActors?.length ?? 0) > 0 ||
								(work.basicInfo.scenario?.length ?? 0) > 0 ||
								(work.basicInfo.illustration?.length ?? 0) > 0 ||
								(work.basicInfo.music?.length ?? 0) > 0))) && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Users className="h-5 w-5" />
									クリエイター情報
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{/* 作者 */}
									{work.basicInfo?.author && work.basicInfo.author.length > 0 && (
										<div>
											<h5 className="text-sm font-medium text-gray-700 mb-2">作者</h5>
											<div className="space-y-2">
												{work.basicInfo.author.map((author) => (
													<div key={author} className="flex items-center gap-3">
														<div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
															<span className="text-foreground font-bold text-xs">
																{author.charAt(0)}
															</span>
														</div>
														<span className="text-gray-900 text-sm">{author}</span>
													</div>
												))}
											</div>
										</div>
									)}

									{/* 声優 */}
									{((work.detailedCreators?.voiceActors?.length ?? 0) > 0 ||
										(work.basicInfo?.voiceActors?.length ?? 0) > 0 ||
										(work.author?.length ?? 0) > 0) && (
										<div>
											<h5 className="text-sm font-medium text-gray-700 mb-2">声優（CV）</h5>
											<div className="space-y-2">
												{/* basicInfo.voiceActorsを優先、次にdetailedCreators、最後にauthor */}
												{(
													work.basicInfo?.voiceActors ||
													work.detailedCreators?.voiceActors ||
													work.author ||
													[]
												).map((actor) => (
													<div key={actor} className="flex items-center gap-3">
														<div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
															<span className="text-foreground font-bold text-xs">
																{actor.charAt(0)}
															</span>
														</div>
														<span className="text-gray-900 text-sm">{actor}</span>
													</div>
												))}
											</div>
										</div>
									)}

									{/* シナリオ */}
									{((work.basicInfo?.scenario?.length ?? 0) > 0 ||
										(work.detailedCreators?.scenario?.length ?? 0) > 0) && (
										<div>
											<h5 className="text-sm font-medium text-gray-700 mb-2">シナリオ</h5>
											<div className="space-y-2">
												{(work.basicInfo?.scenario || work.detailedCreators?.scenario || []).map(
													(creator) => (
														<div key={creator} className="flex items-center gap-3">
															<div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
																<span className="text-foreground font-bold text-xs">
																	{creator.charAt(0)}
																</span>
															</div>
															<span className="text-gray-900 text-sm">{creator}</span>
														</div>
													),
												)}
											</div>
										</div>
									)}

									{/* イラスト */}
									{((work.basicInfo?.illustration?.length ?? 0) > 0 ||
										(work.detailedCreators?.illustration?.length ?? 0) > 0) && (
										<div>
											<h5 className="text-sm font-medium text-gray-700 mb-2">イラスト</h5>
											<div className="space-y-2">
												{(
													work.basicInfo?.illustration ||
													work.detailedCreators?.illustration ||
													[]
												).map((creator) => (
													<div key={creator} className="flex items-center gap-3">
														<div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
															<span className="text-foreground font-bold text-xs">
																{creator.charAt(0)}
															</span>
														</div>
														<span className="text-gray-900 text-sm">{creator}</span>
													</div>
												))}
											</div>
										</div>
									)}

									{/* 音楽 */}
									{((work.basicInfo?.music?.length ?? 0) > 0 ||
										(work.detailedCreators?.music?.length ?? 0) > 0) && (
										<div>
											<h5 className="text-sm font-medium text-gray-700 mb-2">音楽</h5>
											<div className="space-y-2">
												{(work.basicInfo?.music || work.detailedCreators?.music || []).map(
													(creator) => (
														<div key={creator} className="flex items-center gap-3">
															<div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
																<span className="text-foreground font-bold text-xs">
																	{creator.charAt(0)}
																</span>
															</div>
															<span className="text-gray-900 text-sm">{creator}</span>
														</div>
													),
												)}
											</div>
										</div>
									)}

									{/* デザイン */}
									{(work.detailedCreators?.design?.length ?? 0) > 0 && (
										<div>
											<h5 className="text-sm font-medium text-gray-700 mb-2">デザイン</h5>
											<div className="space-y-2">
												{work.detailedCreators?.design?.map((creator) => (
													<div key={creator} className="flex items-center gap-3">
														<div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
															<span className="text-foreground font-bold text-xs">
																{creator.charAt(0)}
															</span>
														</div>
														<span className="text-gray-900 text-sm">{creator}</span>
													</div>
												))}
											</div>
										</div>
									)}

									{/* その他のクリエイター */}
									{work.detailedCreators && Object.keys(work.detailedCreators.other).length > 0 && (
										<div>
											{Object.entries(work.detailedCreators.other).map(([role, creators]) => (
												<div key={role} className="mb-3">
													<h5 className="text-sm font-medium text-gray-700 mb-2">{role}</h5>
													<div className="space-y-2">
														{creators.map((creator) => (
															<div key={creator} className="flex items-center gap-3">
																<div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
																	<span className="text-foreground font-bold text-xs">
																		{creator.charAt(0)}
																	</span>
																</div>
																<span className="text-gray-900 text-sm">{creator}</span>
															</div>
														))}
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					)}

					{/* クイック仕様 */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileText className="h-5 w-5" />
								クイック仕様
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-3 text-sm">
								<div className="flex justify-between items-center py-2 border-b border-gray-100">
									<span className="text-gray-700">作品ID</span>
									<span className="text-gray-900 font-mono text-xs">{work.productId}</span>
								</div>
								<div className="flex justify-between items-center py-2 border-b border-gray-100">
									<span className="text-gray-700">カテゴリ</span>
									<span className="text-gray-900">{work.category}</span>
								</div>
								{work.ageRating && (
									<div className="flex justify-between items-center py-2">
										<span className="text-gray-700">年齢制限</span>
										<Badge variant="secondary">{work.ageRating}</Badge>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
