"use client";

import type {
	FrontendAudioButtonData,
	FrontendDLsiteWorkData,
	FrontendVideoData,
	UnifiedSearchFilters,
} from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent } from "@suzumina.click/ui/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@suzumina.click/ui/components/ui/tabs";
import { BookOpen, ChevronRight, Filter, Loader2, Music, Search, Video, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AudioButtonWithPlayCount } from "@/components/AudioButtonWithPlayCount";
import { HighlightText } from "@/components/HighlightText";
import { SearchFilters } from "@/components/SearchFilters";
import { SearchInputWithAutocomplete } from "@/components/SearchInputWithAutocomplete";
import ThumbnailImage from "@/components/ThumbnailImage";
import { useDebounce } from "@/hooks/useDebounce";

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

type ContentTab = "all" | "buttons" | "videos" | "works";

// Helper function to add numeric range parameters
function addNumericParams(params: URLSearchParams, filters: UnifiedSearchFilters) {
	if (filters.playCountMin !== undefined) {
		params.set("playCountMin", filters.playCountMin.toString());
	}
	if (filters.playCountMax !== undefined) {
		params.set("playCountMax", filters.playCountMax.toString());
	}
	if (filters.likeCountMin !== undefined) {
		params.set("likeCountMin", filters.likeCountMin.toString());
	}
	if (filters.likeCountMax !== undefined) {
		params.set("likeCountMax", filters.likeCountMax.toString());
	}
	if (filters.favoriteCountMin !== undefined) {
		params.set("favoriteCountMin", filters.favoriteCountMin.toString());
	}
	if (filters.favoriteCountMax !== undefined) {
		params.set("favoriteCountMax", filters.favoriteCountMax.toString());
	}
	if (filters.durationMin !== undefined) {
		params.set("durationMin", filters.durationMin.toString());
	}
	if (filters.durationMax !== undefined) {
		params.set("durationMax", filters.durationMax.toString());
	}
}

// Helper function to add date and other filter parameters
function addFilterParams(params: URLSearchParams, filters: UnifiedSearchFilters) {
	if (filters.sortBy && filters.sortBy !== "relevance") {
		params.set("sortBy", filters.sortBy);
	}
	if (filters.dateRange) {
		params.set("dateRange", filters.dateRange);
	}
	if (filters.dateFrom) {
		params.set("dateFrom", filters.dateFrom);
	}
	if (filters.dateTo) {
		params.set("dateTo", filters.dateTo);
	}
	if (filters.tags && filters.tags.length > 0) {
		params.set("tags", filters.tags.join(","));
	}
	if (filters.tagMode && filters.tagMode !== "any") {
		params.set("tagMode", filters.tagMode);
	}
}

// Helper function to build search parameters
function buildSearchParams(
	query: string,
	type: ContentTab,
	filters: UnifiedSearchFilters,
): URLSearchParams {
	const params = new URLSearchParams({
		q: query.trim(),
		type,
		limit: filters.limit.toString(),
	});

	addFilterParams(params, filters);
	addNumericParams(params, filters);

	return params;
}

// Helper function to perform the API call
async function fetchSearchResults(params: URLSearchParams): Promise<UnifiedSearchResult> {
	const response = await fetch(`/api/search?${params}`);
	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.error || "検索に失敗しました");
	}
	return response.json();
}

// PopularTags component
function PopularTags({ onTagClick }: { onTagClick: (tag: string) => void }) {
	return (
		<div className="space-y-3">
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
						onClick={() => onTagClick(tag.name)}
					>
						<span className="mr-1">{tag.icon}</span>
						{tag.name}
					</Badge>
				))}
			</div>
		</div>
	);
}

// SearchResults component
function SearchResults({
	searchResult,
	activeTab,
	onTabChange,
	isAutoSearching,
	searchQuery,
}: {
	searchResult: UnifiedSearchResult | null;
	activeTab: ContentTab;
	onTabChange: (value: string) => void;
	isAutoSearching: boolean;
	searchQuery: string;
}) {
	if (!searchResult) return null;

	const getTabLabel = (tab: string, count: number) => {
		const labels = {
			all: "すべて",
			buttons: "音声ボタン",
			videos: "動画",
			works: "作品",
		};
		return `${labels[tab as keyof typeof labels]} (${count})`;
	};

	return (
		<div className="space-y-4">
			<Tabs value={activeTab} onValueChange={onTabChange}>
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="all">
						{getTabLabel(
							"all",
							searchResult.totalCount.buttons +
								searchResult.totalCount.videos +
								searchResult.totalCount.works,
						)}
					</TabsTrigger>
					<TabsTrigger value="buttons">
						{getTabLabel("buttons", searchResult.totalCount.buttons)}
					</TabsTrigger>
					<TabsTrigger value="videos">
						{getTabLabel("videos", searchResult.totalCount.videos)}
					</TabsTrigger>
					<TabsTrigger value="works">
						{getTabLabel("works", searchResult.totalCount.works)}
					</TabsTrigger>
				</TabsList>

				{/* 自動検索インジケーター */}
				{isAutoSearching && (
					<div className="flex items-center justify-center py-2">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" />
							検索中...
						</div>
					</div>
				)}

				{/* タブコンテンツは長いので別途処理 */}
				<TabsContent value="all" className="space-y-6">
					{/* 統合結果 */}
					{searchResult.audioButtons.length > 0 && (
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<Music className="h-5 w-5 text-suzuka-600" />
								<h3 className="text-lg font-semibold">音声ボタン</h3>
								<Badge variant="secondary">{searchResult.totalCount.buttons}</Badge>
							</div>
							<div className="flex flex-wrap gap-3">
								{searchResult.audioButtons.slice(0, 6).map((button) => (
									<AudioButtonWithPlayCount
										key={button.id}
										audioButton={button}
										searchQuery={searchQuery}
										highlightClassName="bg-yellow-200 text-yellow-900 font-medium px-0.5 rounded"
									/>
								))}
							</div>
							{searchResult.hasMore.buttons && (
								<div className="text-center">
									<Button variant="outline" onClick={() => onTabChange("buttons")}>
										音声ボタンをもっと見る
										<ChevronRight className="h-4 w-4 ml-1" />
									</Button>
								</div>
							)}
						</div>
					)}

					{searchResult.videos.length > 0 && (
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<Video className="h-5 w-5 text-suzuka-600" />
								<h3 className="text-lg font-semibold">動画</h3>
								<Badge variant="secondary">{searchResult.totalCount.videos}</Badge>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{searchResult.videos.slice(0, 6).map((video) => (
									<Link
										key={video.id}
										href={`/videos/${video.id}`}
										className="group block hover:shadow-lg transition-shadow"
									>
										<Card className="h-full">
											<div className="aspect-video relative overflow-hidden rounded-t-lg">
												<ThumbnailImage
													src={video.thumbnailUrl}
													alt={video.title}
													className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
												/>
											</div>
											<CardContent className="p-4">
												<h3 className="font-medium line-clamp-2 group-hover:text-suzuka-600 transition-colors">
													<HighlightText
														text={video.title}
														searchQuery={searchQuery}
														highlightClassName="bg-yellow-200 text-yellow-900 font-medium px-0.5 rounded"
													/>
												</h3>
												<p className="text-sm text-muted-foreground mt-1">
													{new Date(video.publishedAt).toLocaleDateString("ja-JP")}
												</p>
											</CardContent>
										</Card>
									</Link>
								))}
							</div>
							{searchResult.hasMore.videos && (
								<div className="text-center">
									<Button variant="outline" onClick={() => onTabChange("videos")}>
										動画をもっと見る
										<ChevronRight className="h-4 w-4 ml-1" />
									</Button>
								</div>
							)}
						</div>
					)}

					{searchResult.works.length > 0 && (
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<BookOpen className="h-5 w-5 text-suzuka-600" />
								<h3 className="text-lg font-semibold">作品</h3>
								<Badge variant="secondary">{searchResult.totalCount.works}</Badge>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{searchResult.works.slice(0, 6).map((work) => (
									<Link
										key={work.id}
										href={`/works/${work.id}`}
										className="group block hover:shadow-lg transition-shadow"
									>
										<Card className="h-full">
											<div className="aspect-[4/3] relative overflow-hidden rounded-t-lg">
												<ThumbnailImage
													src={work.thumbnailUrl || "/placeholder-work.png"}
													alt={work.title}
													className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
												/>
											</div>
											<CardContent className="p-4">
												<h3 className="font-medium line-clamp-2 group-hover:text-suzuka-600 transition-colors">
													<HighlightText
														text={work.title}
														searchQuery={searchQuery}
														highlightClassName="bg-yellow-200 text-yellow-900 font-medium px-0.5 rounded"
													/>
												</h3>
												<p className="text-sm text-muted-foreground mt-1">
													登録日:{" "}
													{work.registDate
														? new Date(work.registDate).toLocaleDateString("ja-JP")
														: "不明"}
												</p>
											</CardContent>
										</Card>
									</Link>
								))}
							</div>
							{searchResult.hasMore.works && (
								<div className="text-center">
									<Button variant="outline" onClick={() => onTabChange("works")}>
										作品をもっと見る
										<ChevronRight className="h-4 w-4 ml-1" />
									</Button>
								</div>
							)}
						</div>
					)}
				</TabsContent>

				<TabsContent value="buttons">
					<div className="flex flex-wrap gap-3">
						{searchResult.audioButtons.map((button) => (
							<AudioButtonWithPlayCount
								key={button.id}
								audioButton={button}
								searchQuery={searchQuery}
								highlightClassName="bg-yellow-200 text-yellow-900 font-medium px-0.5 rounded"
							/>
						))}
					</div>
				</TabsContent>

				<TabsContent value="videos">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{searchResult.videos.map((video) => (
							<Link
								key={video.id}
								href={`/videos/${video.id}`}
								className="group block hover:shadow-lg transition-shadow"
							>
								<Card className="h-full">
									<div className="aspect-video relative overflow-hidden rounded-t-lg">
										<ThumbnailImage
											src={video.thumbnailUrl}
											alt={video.title}
											className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
										/>
									</div>
									<CardContent className="p-4">
										<h3 className="font-medium line-clamp-2 group-hover:text-suzuka-600 transition-colors">
											<HighlightText
												text={video.title}
												searchQuery={searchQuery}
												highlightClassName="bg-yellow-200 text-yellow-900 font-medium px-0.5 rounded"
											/>
										</h3>
										<p className="text-sm text-muted-foreground mt-1">
											{new Date(video.publishedAt).toLocaleDateString("ja-JP")}
										</p>
									</CardContent>
								</Card>
							</Link>
						))}
					</div>
				</TabsContent>

				<TabsContent value="works">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{searchResult.works.map((work) => (
							<Link
								key={work.id}
								href={`/works/${work.id}`}
								className="group block hover:shadow-lg transition-shadow"
							>
								<Card className="h-full">
									<div className="aspect-[4/3] relative overflow-hidden rounded-t-lg">
										<ThumbnailImage
											src={work.thumbnailUrl || "/placeholder-work.png"}
											alt={work.title}
											className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
										/>
									</div>
									<CardContent className="p-4">
										<h3 className="font-medium line-clamp-2 group-hover:text-suzuka-600 transition-colors">
											<HighlightText
												text={work.title}
												searchQuery={searchQuery}
												highlightClassName="bg-yellow-200 text-yellow-900 font-medium px-0.5 rounded"
											/>
										</h3>
										<p className="text-sm text-muted-foreground mt-1">
											登録日:{" "}
											{work.registDate
												? new Date(work.registDate).toLocaleDateString("ja-JP")
												: "不明"}
										</p>
									</CardContent>
								</Card>
							</Link>
						))}
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}

export default function SearchPageContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");
	const [activeTab, setActiveTab] = useState<"all" | "buttons" | "videos" | "works">("all");
	const [searchResult, setSearchResult] = useState<UnifiedSearchResult | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isAutoSearching, setIsAutoSearching] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [filters, setFilters] = useState<UnifiedSearchFilters>({
		query: "",
		type: "all",
		limit: 12,
		sortBy: "relevance",
		tagMode: "any",
	});

	// デバウンスされた検索クエリ（自動検索用）
	const debouncedSearchQuery = useDebounce(searchQuery, 400);

	// 検索実行
	const performSearch = useCallback(
		async (
			query: string,
			type: ContentTab = "all",
			isAutoSearch = false,
			searchFilters?: UnifiedSearchFilters,
		) => {
			if (!query.trim()) {
				setSearchResult(null);
				return;
			}

			if (isAutoSearch) {
				setIsAutoSearching(true);
			} else {
				setIsLoading(true);
			}
			setError(null);

			try {
				const currentFilters = searchFilters || filters;
				const params = buildSearchParams(query, type, currentFilters);
				const result = await fetchSearchResults(params);
				setSearchResult(result);
			} catch (err) {
				setError(err instanceof Error ? err.message : "検索中にエラーが発生しました");
			} finally {
				setIsLoading(false);
				setIsAutoSearching(false);
			}
		},
		[filters],
	);

	// URLパラメータから初期状態を設定
	useEffect(() => {
		const q = searchParams.get("q") || "";
		const type = (searchParams.get("type") as ContentTab) || "all";
		setSearchQuery(q);
		setActiveTab(type);

		if (q) {
			performSearch(q, type);
		}
	}, [searchParams, performSearch]);

	// URL更新
	const updateURL = useCallback(
		(query: string, type: ContentTab) => {
			const params = new URLSearchParams();
			if (query) params.set("q", query);
			if (type !== "all") params.set("type", type);

			const newURL = params.toString() ? `/search?${params}` : "/search";
			router.replace(newURL);
		},
		[router],
	);

	// デバウンスされた自動検索
	useEffect(() => {
		// 初期ロードやURLパラメータからの設定時は自動検索しない
		if (!debouncedSearchQuery || searchParams.get("q") === debouncedSearchQuery) {
			return;
		}

		// 最小文字数チェック
		if (debouncedSearchQuery.length >= 2) {
			updateURL(debouncedSearchQuery, activeTab);
			performSearch(debouncedSearchQuery, activeTab, true);
		} else if (debouncedSearchQuery.length === 0) {
			updateURL("", activeTab);
			setSearchResult(null);
		}
	}, [debouncedSearchQuery, activeTab, updateURL, performSearch, searchParams]);

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
			const newTab = value as ContentTab;
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
						<SearchInputWithAutocomplete
							value={searchQuery}
							onChange={setSearchQuery}
							onSubmit={() => {
								if (searchQuery.trim()) {
									updateURL(searchQuery, activeTab);
									performSearch(searchQuery, activeTab);
								}
							}}
							onClear={() => {
								setSearchQuery("");
								setSearchResult(null);
								updateURL("", activeTab);
							}}
							isAutoSearching={isAutoSearching}
						/>
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

					{/* 検索ヒント */}
					{searchQuery.length > 0 && searchQuery.length < 2 && (
						<div className="text-sm text-muted-foreground bg-yellow-50 border border-yellow-200 rounded-lg p-3">
							💡 2文字以上入力すると自動検索が開始されます
						</div>
					)}

					{/* 人気タグ */}
					<PopularTags onTagClick={handleTagClick} />
				</CardContent>
			</Card>

			{/* フィルターコンポーネント */}
			<SearchFilters
				filters={filters}
				onFiltersChange={setFilters}
				onApply={() => {
					if (searchQuery) {
						performSearch(searchQuery, activeTab, false, filters);
					}
				}}
				contentType={activeTab}
			/>

			{/* エラー表示 */}
			{error && (
				<Card className="border-destructive">
					<CardContent className="p-4">
						<div className="flex items-center gap-2">
							<X className="h-5 w-5 text-destructive" />
							<p className="text-destructive font-medium">エラー: {error}</p>
						</div>
						<p className="text-sm text-muted-foreground mt-2">
							しばらく待ってから再度お試しください。
						</p>
					</CardContent>
				</Card>
			)}

			{/* ローディング状態（メイン検索） */}
			{isLoading && searchQuery && (
				<div className="space-y-6">
					{/* タブスケルトン */}
					<div className="flex gap-2">
						{Array.from({ length: 4 }, (_, i) => {
							const key = `tab-skeleton-${i}-${Math.random().toString(36).substr(2, 9)}`;
							return <div key={key} className="h-12 bg-muted rounded-lg w-32 animate-pulse" />;
						})}
					</div>
					{/* 結果スケルトン */}
					<div className="space-y-6">
						{Array.from({ length: 3 }, (_, i) => {
							const sectionKey = `result-skeleton-${i}-${Math.random().toString(36).substr(2, 9)}`;
							return (
								<div key={sectionKey} className="space-y-4">
									<div className="h-6 bg-muted rounded w-32 animate-pulse" />
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
										{Array.from({ length: 3 }, (_, j) => {
											const cardKey = `card-skeleton-${i}-${j}-${Math.random().toString(36).substr(2, 9)}`;
											return (
												<div key={cardKey} className="h-40 bg-muted rounded-lg animate-pulse" />
											);
										})}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* 検索結果 */}
			{searchQuery && searchResult && !error && !isLoading && (
				<SearchResults
					searchResult={searchResult}
					activeTab={activeTab}
					onTabChange={handleTabChange}
					isAutoSearching={isAutoSearching}
					searchQuery={searchQuery}
				/>
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
