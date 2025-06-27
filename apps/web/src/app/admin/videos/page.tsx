import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { Input } from "@suzumina.click/ui/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@suzumina.click/ui/components/ui/select";
import { Download, Filter, Play, Search, TrendingUp, Youtube } from "lucide-react";
import { Suspense } from "react";
import { getTotalVideoCount, getVideoTitles } from "./actions";
import VideoList from "./components/VideoList";

interface AdminVideosProps {
	searchParams: Promise<{
		page?: string;
		sort?: string;
		search?: string;
		category?: string;
	}>;
}

export default async function AdminVideos({ searchParams }: AdminVideosProps) {
	// URLパラメータの解析
	const resolvedSearchParams = await searchParams;
	const { page, sort, search, category } = resolvedSearchParams;
	const pageParam = page;
	const currentPage =
		pageParam && typeof pageParam === "string" ? Number.parseInt(pageParam, 10) : 1;
	const validPage = Math.max(1, Number.isNaN(currentPage) ? 1 : currentPage);

	// 並行してデータを取得
	const [initialData, totalCount] = await Promise.all([
		getVideoTitles({ page: validPage, limit: 100 }),
		getTotalVideoCount(),
	]);

	// 統計データ
	const stats = {
		total: totalCount || 0,
		recentVideos: Array.isArray(initialData.videos) ? initialData.videos.slice(0, 5).length : 0,
	};

	return (
		<div className="p-6 space-y-6">
			{/* ページヘッダー */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-foreground">YouTube動画管理</h1>
					<p className="text-muted-foreground mt-1">全 {stats.total} 件のYouTube動画</p>
				</div>
				<Button variant="outline" className="flex items-center gap-2">
					<Download className="h-4 w-4" />
					CSVエクスポート
				</Button>
			</div>

			{/* 統計カード */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-suzuka-600">{stats.total}</div>
							<div className="text-sm text-muted-foreground">総動画数</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-red-600">{stats.recentVideos}</div>
							<div className="text-sm text-muted-foreground">最新動画</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-center">
							<div className="flex items-center justify-center gap-1">
								<TrendingUp className="h-4 w-4 text-green-500" />
								<span className="text-sm text-green-600">自動収集</span>
							</div>
							<div className="text-xs text-muted-foreground mt-1">YouTube API</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-center">
							<div className="flex items-center justify-center gap-1">
								<Youtube className="h-5 w-5 text-red-500" />
								<span className="text-sm text-red-600">YouTube</span>
							</div>
							<div className="text-xs text-muted-foreground mt-1">プラットフォーム</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* フィルター・検索 */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Filter className="h-5 w-5" />
						フィルター・検索
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						{/* ソート */}
						<div>
							<label htmlFor="sort-select" className="text-sm font-medium">
								並び順
							</label>
							<Select defaultValue={sort || "newest"}>
								{/* biome-ignore lint/nursery/useUniqueElementIds: Server component with unique page context */}
								<SelectTrigger id="sort-select">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="newest">新しい順</SelectItem>
									<SelectItem value="oldest">古い順</SelectItem>
									<SelectItem value="views">再生回数順</SelectItem>
									<SelectItem value="duration">長さ順</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* カテゴリフィルター */}
						<div>
							<label htmlFor="category-select" className="text-sm font-medium">
								カテゴリ
							</label>
							<Select defaultValue={category || "all"}>
								{/* biome-ignore lint/nursery/useUniqueElementIds: Server component with unique page context */}
								<SelectTrigger id="category-select">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">すべて</SelectItem>
									<SelectItem value="live">🔴 ライブ配信</SelectItem>
									<SelectItem value="video">📹 動画</SelectItem>
									<SelectItem value="shorts">⚡ ショート</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* 検索 */}
						<div className="md:col-span-2">
							<label htmlFor="search-input" className="text-sm font-medium">
								検索
							</label>
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								{/* biome-ignore lint/nursery/useUniqueElementIds: Server component with unique page context */}
								<Input
									id="search-input"
									placeholder="動画タイトル、説明、動画IDで検索..."
									defaultValue={search || ""}
									className="pl-10"
								/>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* 動画一覧 */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Play className="h-5 w-5" />
						YouTube動画一覧
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Suspense
						fallback={
							<div className="text-center py-12">
								<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-suzuka-500" />
								<p className="mt-2 text-muted-foreground">動画データを読み込み中...</p>
							</div>
						}
					>
						<VideoList data={initialData} totalCount={totalCount} currentPage={validPage} />
					</Suspense>
				</CardContent>
			</Card>
		</div>
	);
}
