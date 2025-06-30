"use client";

import type {
	FrontendAudioButtonData,
	FrontendDLsiteWorkData,
	FrontendVideoData,
} from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent } from "@suzumina.click/ui/components/ui/card";
import { Input } from "@suzumina.click/ui/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@suzumina.click/ui/components/ui/tabs";
import { BookOpen, ChevronRight, Filter, Loader2, Music, Search, Video } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AudioButtonWithFavoriteClient } from "@/components/AudioButtonWithFavoriteClient";
import ThumbnailImage from "@/components/ThumbnailImage";

interface UnifiedSearchResult {
	audioButtons: FrontendAudioButtonData[];
	videos: FrontendVideoData[];
	works: FrontendDLsiteWorkData[];
	totalCount: {
		buttons: number;
		videos: number;
		works: number;
	};
	hasMore: {
		buttons: boolean;
		videos: boolean;
		works: boolean;
	};
}

// 人気タグ（v0サンプルに基づく）
const POPULAR_TAGS = [
	{ name: "挨拶", icon: "👋" },
	{ name: "応援", icon: "📣" },
	{ name: "感謝", icon: "🙏" },
	{ name: "動き", icon: "🏃" },
	{ name: "朝", icon: "🌅" },
	{ name: "夜", icon: "🌙" },
	{ name: "お礼", icon: "💝" },
];

export default function SearchPageContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");
	const [activeTab, setActiveTab] = useState<"all" | "buttons" | "videos" | "works">("all");
	const [searchResult, setSearchResult] = useState<UnifiedSearchResult | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// 検索実行
	const performSearch = useCallback(async (query: string, type: typeof activeTab = "all") => {
		if (!query.trim()) {
			setSearchResult(null);
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const params = new URLSearchParams({
				q: query.trim(),
				type,
				limit: "12",
			});

			const response = await fetch(`/api/search?${params}`);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "検索に失敗しました");
			}

			const result = await response.json();
			setSearchResult(result);
		} catch (err) {
			setError(err instanceof Error ? err.message : "検索中にエラーが発生しました");
		} finally {
			setIsLoading(false);
		}
	}, []);

	// URLパラメータから初期状態を設定
	useEffect(() => {
		const q = searchParams.get("q") || "";
		const type = (searchParams.get("type") as typeof activeTab) || "all";
		setSearchQuery(q);
		setActiveTab(type);

		if (q) {
			performSearch(q, type);
		}
	}, [searchParams, performSearch]);

	// URL更新
	const updateURL = useCallback(
		(query: string, type: typeof activeTab) => {
			const params = new URLSearchParams();
			if (query) params.set("q", query);
			if (type !== "all") params.set("type", type);

			const newURL = params.toString() ? `/search?${params}` : "/search";
			router.replace(newURL);
		},
		[router],
	);

	// 検索フォーム送信
	const handleSearch = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			if (searchQuery.trim()) {
				updateURL(searchQuery, activeTab);
				performSearch(searchQuery, activeTab);
			} else {
				updateURL("", activeTab);
				setSearchResult(null);
			}
		},
		[searchQuery, activeTab, updateURL, performSearch],
	);

	// タブ変更
	const handleTabChange = useCallback(
		(value: string) => {
			const newTab = value as typeof activeTab;
			setActiveTab(newTab);
			if (searchQuery) {
				updateURL(searchQuery, newTab);
				performSearch(searchQuery, newTab);
			}
		},
		[searchQuery, updateURL, performSearch],
	);

	// 人気タグクリック
	const handleTagClick = useCallback(
		(tagName: string) => {
			setSearchQuery(tagName);
			updateURL(tagName, activeTab);
			performSearch(tagName, activeTab);
		},
		[activeTab, updateURL, performSearch],
	);

	// 検索結果の総数計算
	const totalResults = useMemo(() => {
		if (!searchResult) return 0;
		const { totalCount } = searchResult;
		return totalCount.buttons + totalCount.videos + totalCount.works;
	}, [searchResult]);

	return (
		<div className="space-y-8">
			{/* ページヘッダー */}
			<div className="space-y-2">
				<h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
					<Search className="h-8 w-8 text-suzuka-500" />
					検索結果
				</h1>
				{searchQuery && searchResult && (
					<p className="text-lg text-muted-foreground">
						「<span className="font-semibold text-foreground">{searchQuery}</span>」の検索結果（
						{totalResults}件）
					</p>
				)}
			</div>

			{/* 検索フォーム */}
			<Card className="bg-suzuka-50 border-suzuka-200">
				<CardContent className="p-6 space-y-4">
					<form onSubmit={handleSearch} className="flex gap-2">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								type="text"
								placeholder="ボタンや作品を検索..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-10 h-12 text-base"
								data-testid="search-input"
							/>
						</div>
						<Button
							type="submit"
							size="lg"
							className="px-8"
							disabled={isLoading}
							data-testid="search-button"
						>
							{isLoading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Search className="h-4 w-4" />
							)}
							検索
						</Button>
					</form>

					{/* 人気タグ */}
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-sm font-medium text-suzuka-700">
							<Filter className="h-4 w-4" />
							人気タグ
						</div>
						<div className="flex flex-wrap gap-2">
							{POPULAR_TAGS.map((tag) => (
								<Badge
									key={tag.name}
									variant="outline"
									className="cursor-pointer hover:bg-suzuka-100 hover:border-suzuka-300 transition-colors"
									onClick={() => handleTagClick(tag.name)}
								>
									<span className="mr-1">{tag.icon}</span>
									{tag.name}
								</Badge>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* エラー表示 */}
			{error && (
				<Card className="border-destructive">
					<CardContent className="p-4">
						<p className="text-destructive font-medium">エラー: {error}</p>
					</CardContent>
				</Card>
			)}

			{/* 検索結果 */}
			{searchQuery && searchResult && !error && (
				<Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
					<TabsList className="grid w-full grid-cols-4 h-12">
						<TabsTrigger value="all" className="text-sm">
							すべて ({totalResults})
						</TabsTrigger>
						<TabsTrigger value="buttons" className="text-sm flex items-center gap-1">
							<Music className="h-4 w-4" />
							ボタン ({searchResult.totalCount.buttons})
						</TabsTrigger>
						<TabsTrigger value="videos" className="text-sm flex items-center gap-1">
							<Video className="h-4 w-4" />
							動画 ({searchResult.totalCount.videos})
						</TabsTrigger>
						<TabsTrigger value="works" className="text-sm flex items-center gap-1">
							<BookOpen className="h-4 w-4" />
							作品 ({searchResult.totalCount.works})
						</TabsTrigger>
					</TabsList>

					<TabsContent value="all" className="space-y-8">
						{/* 音声ボタン結果 */}
						{searchResult.audioButtons.length > 0 && (
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<h2 className="text-xl font-bold text-foreground flex items-center gap-2">
										<Music className="h-5 w-5 text-minase-500" />
										音声ボタン
										<Badge variant="secondary">{searchResult.audioButtons.length}件</Badge>
									</h2>
									{searchResult.hasMore.buttons && (
										<Button variant="outline" asChild>
											<Link href={`/buttons?q=${encodeURIComponent(searchQuery)}`}>
												すべて見る
												<ChevronRight className="h-4 w-4 ml-1" />
											</Link>
										</Button>
									)}
								</div>
								<div className="flex flex-wrap gap-3">
									{searchResult.audioButtons.map((audioButton) => (
										<AudioButtonWithFavoriteClient
											key={audioButton.id}
											audioButton={audioButton}
											className="shadow-sm hover:shadow-md transition-all duration-200"
											maxTitleLength={40}
										/>
									))}
								</div>
							</div>
						)}

						{/* 動画結果 */}
						{searchResult.videos.length > 0 && (
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<h2 className="text-xl font-bold text-foreground flex items-center gap-2">
										<Video className="h-5 w-5 text-minase-500" />
										動画
										<Badge variant="secondary">{searchResult.videos.length}件</Badge>
									</h2>
									{searchResult.hasMore.videos && (
										<Button variant="outline" asChild>
											<Link href={`/videos?q=${encodeURIComponent(searchQuery)}`}>
												すべて見る
												<ChevronRight className="h-4 w-4 ml-1" />
											</Link>
										</Button>
									)}
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
									{searchResult.videos.map((video) => (
										<Link key={video.id} href={`/videos/${video.id}`}>
											<Card className="hover:shadow-md transition-shadow">
												<div className="aspect-video relative overflow-hidden rounded-t-lg">
													<ThumbnailImage
														src={video.thumbnailUrl}
														alt={video.title}
														className="object-cover w-full h-full"
													/>
												</div>
												<CardContent className="p-4">
													<h3 className="font-semibold text-sm line-clamp-2 mb-2">{video.title}</h3>
													<p className="text-xs text-muted-foreground">{video.publishedAt}</p>
												</CardContent>
											</Card>
										</Link>
									))}
								</div>
							</div>
						)}

						{/* 作品結果 */}
						{searchResult.works.length > 0 && (
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<h2 className="text-xl font-bold text-foreground flex items-center gap-2">
										<BookOpen className="h-5 w-5 text-minase-500" />
										出演作品
										<Badge variant="secondary">{searchResult.works.length}件</Badge>
									</h2>
									{searchResult.hasMore.works && (
										<Button variant="outline" asChild>
											<Link href={`/works?q=${encodeURIComponent(searchQuery)}`}>
												すべて見る
												<ChevronRight className="h-4 w-4 ml-1" />
											</Link>
										</Button>
									)}
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
									{searchResult.works.map((work) => (
										<Link key={work.id} href={`/works/${work.id}`}>
											<Card className="hover:shadow-md transition-shadow">
												<div className="aspect-[3/4] relative overflow-hidden rounded-t-lg">
													<ThumbnailImage
														src={work.thumbnailUrl}
														alt={work.title}
														className="object-cover w-full h-full"
													/>
												</div>
												<CardContent className="p-4">
													<h3 className="font-semibold text-sm line-clamp-2 mb-2">{work.title}</h3>
													<div className="flex items-center justify-between">
														<Badge variant="outline" className="text-xs">
															{work.category}
														</Badge>
														<p className="text-sm font-semibold text-suzuka-600">
															¥{work.price?.toLocaleString() || "0"}
														</p>
													</div>
												</CardContent>
											</Card>
										</Link>
									))}
								</div>
							</div>
						)}

						{/* 結果なし */}
						{totalResults === 0 && !isLoading && (
							<Card>
								<CardContent className="p-8 text-center">
									<Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
									<h3 className="text-lg font-semibold text-foreground mb-2">
										「{searchQuery}」に一致する結果が見つかりませんでした
									</h3>
									<p className="text-muted-foreground mb-4">
										別のキーワードで検索するか、人気タグから選択してみてください。
									</p>
									<div className="flex flex-wrap gap-2 justify-center">
										{POPULAR_TAGS.slice(0, 4).map((tag) => (
											<Badge
												key={tag.name}
												variant="outline"
												className="cursor-pointer hover:bg-suzuka-100"
												onClick={() => handleTagClick(tag.name)}
											>
												{tag.icon} {tag.name}
											</Badge>
										))}
									</div>
								</CardContent>
							</Card>
						)}
					</TabsContent>

					{/* 個別タブコンテンツ */}
					<TabsContent value="buttons">
						{searchResult.audioButtons.length > 0 ? (
							<div className="flex flex-wrap gap-3">
								{searchResult.audioButtons.map((audioButton) => (
									<AudioButtonWithFavoriteClient
										key={audioButton.id}
										audioButton={audioButton}
										className="shadow-sm hover:shadow-md transition-all duration-200"
										maxTitleLength={50}
									/>
								))}
							</div>
						) : (
							<Card>
								<CardContent className="p-8 text-center">
									<Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
									<p className="text-lg text-muted-foreground">
										「{searchQuery}」に一致する音声ボタンが見つかりませんでした
									</p>
								</CardContent>
							</Card>
						)}
					</TabsContent>

					<TabsContent value="videos">
						{searchResult.videos.length > 0 ? (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								{searchResult.videos.map((video) => (
									<Link key={video.id} href={`/videos/${video.id}`}>
										<Card className="hover:shadow-md transition-shadow">
											<div className="aspect-video relative overflow-hidden rounded-t-lg">
												<ThumbnailImage
													src={video.thumbnailUrl}
													alt={video.title}
													className="object-cover w-full h-full"
												/>
											</div>
											<CardContent className="p-4">
												<h3 className="font-semibold text-sm line-clamp-2 mb-2">{video.title}</h3>
												<p className="text-xs text-muted-foreground">{video.publishedAt}</p>
											</CardContent>
										</Card>
									</Link>
								))}
							</div>
						) : (
							<Card>
								<CardContent className="p-8 text-center">
									<Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
									<p className="text-lg text-muted-foreground">
										「{searchQuery}」に一致する動画が見つかりませんでした
									</p>
								</CardContent>
							</Card>
						)}
					</TabsContent>

					<TabsContent value="works">
						{searchResult.works.length > 0 ? (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								{searchResult.works.map((work) => (
									<Link key={work.id} href={`/works/${work.id}`}>
										<Card className="hover:shadow-md transition-shadow">
											<div className="aspect-[3/4] relative overflow-hidden rounded-t-lg">
												<ThumbnailImage
													src={work.thumbnailUrl}
													alt={work.title}
													className="object-cover w-full h-full"
												/>
											</div>
											<CardContent className="p-4">
												<h3 className="font-semibold text-sm line-clamp-2 mb-2">{work.title}</h3>
												<div className="flex items-center justify-between">
													<Badge variant="outline" className="text-xs">
														{work.category}
													</Badge>
													<p className="text-sm font-semibold text-suzuka-600">
														¥{work.price?.toLocaleString() || "0"}
													</p>
												</div>
											</CardContent>
										</Card>
									</Link>
								))}
							</div>
						) : (
							<Card>
								<CardContent className="p-8 text-center">
									<BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
									<p className="text-lg text-muted-foreground">
										「{searchQuery}」に一致する作品が見つかりませんでした
									</p>
								</CardContent>
							</Card>
						)}
					</TabsContent>
				</Tabs>
			)}

			{/* 検索前の状態 */}
			{!searchQuery && (
				<Card className="bg-muted/20">
					<CardContent className="p-8 text-center">
						<Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
						<h2 className="text-2xl font-bold text-foreground mb-2">音声ボタンや作品を検索</h2>
						<p className="text-lg text-muted-foreground mb-6">
							キーワードを入力して、お気に入りのコンテンツを見つけましょう
						</p>
						<div className="space-y-4">
							<p className="text-sm text-muted-foreground">人気タグから検索してみる：</p>
							<div className="flex flex-wrap gap-2 justify-center">
								{POPULAR_TAGS.map((tag) => (
									<Badge
										key={tag.name}
										variant="outline"
										className="cursor-pointer hover:bg-suzuka-100 hover:border-suzuka-300 transition-colors text-sm py-1 px-3"
										onClick={() => handleTagClick(tag.name)}
									>
										<span className="mr-1">{tag.icon}</span>
										{tag.name}
									</Badge>
								))}
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
