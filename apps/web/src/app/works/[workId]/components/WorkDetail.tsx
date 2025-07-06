"use client";

import {
	checkAgeRating,
	getAgeRatingDisplayName,
	getWorkCategoryDisplayName,
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
	BarChart3,
	Calendar,
	Clock,
	FileText,
	Share2,
	Shield,
	ShoppingCart,
	Star,
	Tag,
	TrendingUp,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import CharacteristicEvaluation from "@/components/CharacteristicEvaluation";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import SalesHistoryChart from "@/components/SalesHistoryChart";
import ThumbnailImage from "@/components/ThumbnailImage";
import { generateMockCharacteristicData } from "@/utils/mock-evaluation-data";

interface WorkDetailProps {
	work: FrontendDLsiteWorkData;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex UI component with multiple tabs and conditional rendering
export default function WorkDetail({ work }: WorkDetailProps) {
	// 注意: 時系列データは新しいPriceHistoryChartコンポーネントが直接APIから取得

	// モック特性評価データを生成（作品IDに基づいて一意）
	const characteristicData = useMemo(
		() => generateMockCharacteristicData(work.productId),
		[work.productId],
	);

	// 年齢制限の判定
	const ageRatingCheck = useMemo(() => checkAgeRating(work.ageRating), [work.ageRating]);

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

	// 日付フォーマット
	const _formatDate = (dateString: string) => {
		try {
			// 日本語形式の日付（例: "2024年04月27日"）をパース
			const japaneseMatch = dateString.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
			if (japaneseMatch) {
				const [, year, month, day] = japaneseMatch;
				const date = new Date(Number(year), Number(month) - 1, Number(day));
				return date.toLocaleDateString("ja-JP", {
					timeZone: "Asia/Tokyo",
					year: "numeric",
					month: "long",
					day: "numeric",
				});
			}

			// ISO形式やその他の形式を試す
			const date = new Date(dateString);
			if (!Number.isNaN(date.getTime())) {
				return date.toLocaleDateString("ja-JP", {
					timeZone: "Asia/Tokyo",
					year: "numeric",
					month: "long",
					day: "numeric",
				});
			}

			// パースできない場合は元の文字列を返す
			return dateString;
		} catch {
			return dateString;
		}
	};

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

						{/* タグ・ジャンル（統合済み） */}
						<div className="space-y-3">
							{/* 統合されたタグ */}
							{work.tags && work.tags.length > 0 && (
								<div>
									<div className="text-sm font-medium text-gray-700 mb-2">タグ・ジャンル</div>
									<div className="flex flex-wrap gap-2">
										{work.tags.map((tag) => (
											<Badge
												key={tag}
												variant="outline"
												className="border-primary/20 text-primary bg-primary/5 flex items-center gap-1"
											>
												<Tag className="h-3 w-3" />
												{tag}
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
						<TabsList className="grid w-full grid-cols-4">
							<TabsTrigger value="overview" className="flex items-center gap-2">
								<FileText className="h-4 w-4" />
								<span className="hidden sm:inline">詳細情報</span>
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
						</TabsList>

						{/* 詳細情報タブ（概要＋仕様統合） */}
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
														{getWorkCategoryDisplayName(work.category)}
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
											{work.salesCount && (
												<div className="flex items-center gap-3">
													<TrendingUp className="h-5 w-5 text-muted-foreground" />
													<div>
														<div className="text-sm text-gray-700">販売数</div>
														<div className="font-semibold text-gray-900">
															{work.salesCount.toLocaleString()}本
														</div>
													</div>
												</div>
											)}
										</div>

										{/* 制作陣情報（統合済み） */}
										<div className="space-y-4">
											{work.voiceActors && work.voiceActors.length > 0 && (
												<div>
													<div className="text-sm text-gray-700 mb-2">声優</div>
													<div className="flex flex-wrap gap-2">
														{work.voiceActors.map((actor) => (
															<Badge key={actor} variant="secondary" className="text-xs">
																{actor}
															</Badge>
														))}
													</div>
												</div>
											)}
											{work.scenario && work.scenario.length > 0 && (
												<div>
													<div className="text-sm text-gray-700 mb-2">シナリオ</div>
													<div className="flex flex-wrap gap-2">
														{work.scenario.map((scenario) => (
															<Badge key={scenario} variant="secondary" className="text-xs">
																{scenario}
															</Badge>
														))}
													</div>
												</div>
											)}
											{work.illustration && work.illustration.length > 0 && (
												<div>
													<div className="text-sm text-gray-700 mb-2">イラスト</div>
													<div className="flex flex-wrap gap-2">
														{work.illustration.map((artist) => (
															<Badge key={artist} variant="secondary" className="text-xs">
																{artist}
															</Badge>
														))}
													</div>
												</div>
											)}
											{work.music && work.music.length > 0 && (
												<div>
													<div className="text-sm text-gray-700 mb-2">音楽</div>
													<div className="flex flex-wrap gap-2">
														{work.music.map((musician) => (
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

							{/* ファイル・技術仕様 */}
							<Card>
								<CardHeader>
									<CardTitle>ファイル・技術仕様</CardTitle>
									<CardDescription>ファイル形式・容量・技術的な詳細情報</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										{/* ファイル基本情報 */}
										<div className="space-y-4">
											{(work.workFormat ||
												(work.fileInfo?.formats && work.fileInfo.formats.length > 0) ||
												work.fileFormat) && (
												<div>
													<div className="text-sm text-gray-700 mb-2">ファイル形式</div>
													<div className="flex flex-wrap gap-2">
														{work.fileInfo?.formats?.map((format) => (
															<Badge key={format} variant="secondary" className="text-xs">
																{format}
															</Badge>
														)) ||
															(work.fileFormat && (
																<Badge variant="secondary" className="text-xs">
																	{work.fileFormat}
																</Badge>
															)) ||
															(work.workFormat && (
																<Badge variant="secondary" className="text-xs">
																	{work.workFormat}
																</Badge>
															))}
													</div>
												</div>
											)}
											{work.fileInfo?.totalSizeText && (
												<div className="flex items-center gap-3">
													<Clock className="h-5 w-5 text-muted-foreground" />
													<div>
														<div className="text-sm text-gray-700">総容量</div>
														<div className="font-semibold text-gray-900 font-mono">
															{work.fileInfo.totalSizeText}
														</div>
													</div>
												</div>
											)}
											{work.fileInfo?.totalDuration && (
												<div className="flex items-center gap-3">
													<Clock className="h-5 w-5 text-muted-foreground" />
													<div>
														<div className="text-sm text-gray-700">総再生時間</div>
														<div className="font-semibold text-gray-900">
															{work.fileInfo.totalDuration}
														</div>
													</div>
												</div>
											)}
										</div>

										{/* 付属ファイル */}
										{work.fileInfo?.additionalFiles && work.fileInfo.additionalFiles.length > 0 && (
											<div className="space-y-4">
												<div>
													<div className="text-sm text-gray-700 mb-2">付属ファイル</div>
													<div className="space-y-1">
														{work.fileInfo.additionalFiles.map((file) => (
															<div key={file} className="text-gray-900 text-xs">
																• {file}
															</div>
														))}
													</div>
												</div>
											</div>
										)}
									</div>

									{/* 特典・おまけ情報 */}
									{work.bonusContent && work.bonusContent.length > 0 && (
										<div className="mt-6 space-y-4">
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
						<TabsContent value="price-history">
							<Card>
								<CardHeader>
									<CardTitle>価格推移</CardTitle>
									<CardDescription>時系列での価格変動・セール履歴</CardDescription>
								</CardHeader>
								<CardContent>
									<PriceHistoryChart workId={work.productId} />

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
									<SalesHistoryChart workId={work.productId} />

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
										<div className="text-center">
											<div className="text-sm text-gray-600">カテゴリ</div>
											<div className="text-lg font-semibold text-gray-900">
												{getWorkCategoryDisplayName(work.category)}
											</div>
										</div>
									</div>
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
									{/* 声優 */}
									{work.voiceActors && work.voiceActors.length > 0 && (
										<div>
											<h5 className="text-sm font-medium text-gray-700 mb-2">声優（CV）</h5>
											<div className="space-y-2">
												{work.voiceActors.map((actor) => (
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
									{work.scenario && work.scenario.length > 0 && (
										<div>
											<h5 className="text-sm font-medium text-gray-700 mb-2">シナリオ</h5>
											<div className="space-y-2">
												{work.scenario.map((creator) => (
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

									{/* イラスト */}
									{work.illustration && work.illustration.length > 0 && (
										<div>
											<h5 className="text-sm font-medium text-gray-700 mb-2">イラスト</h5>
											<div className="space-y-2">
												{work.illustration.map((creator) => (
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
									{work.music && work.music.length > 0 && (
										<div>
											<h5 className="text-sm font-medium text-gray-700 mb-2">音楽</h5>
											<div className="space-y-2">
												{work.music.map((creator) => (
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
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</div>
	);
}
