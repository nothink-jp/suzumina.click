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
import { BookOpen, Download, Filter, Search, TrendingUp } from "lucide-react";
import { Suspense } from "react";
import { getWorks } from "./actions";
import WorkList from "./components/WorkList";

interface AdminWorksProps {
	searchParams: Promise<{
		page?: string;
		sort?: string;
		search?: string;
		category?: string;
	}>;
}

export default async function AdminWorks({ searchParams }: AdminWorksProps) {
	// URLパラメータの解析
	const resolvedSearchParams = await searchParams;
	const { page, sort, search, category } = resolvedSearchParams;
	const pageParam = page;
	const parsedPage = pageParam ? Number.parseInt(pageParam, 10) : 1;
	const validPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

	// Server Actionでデータ取得
	const result = await getWorks({ page: validPage, limit: 100 });
	const { works: initialData, totalCount } = result;

	// 統計データ
	const stats = {
		total: totalCount || 0,
		recentWorks: initialData.slice(0, 5).length,
	};

	return (
		<div className="p-6 space-y-6">
			{/* ページヘッダー */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-foreground">DLsite作品管理</h1>
					<p className="text-muted-foreground mt-1">全 {stats.total} 件のDLsite作品</p>
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
							<div className="text-sm text-muted-foreground">総作品数</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-green-600">{stats.recentWorks}</div>
							<div className="text-sm text-muted-foreground">最新作品</div>
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
							<div className="text-xs text-muted-foreground mt-1">Cloud Functions</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-blue-600">DLsite</div>
							<div className="text-xs text-muted-foreground">プラットフォーム</div>
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
							<label htmlFor="sort-select" className="text-sm font-medium">並び順</label>
							<Select defaultValue={sort || "newest"}>
								<SelectTrigger id="sort-select">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="newest">新しい順</SelectItem>
									<SelectItem value="oldest">古い順</SelectItem>
									<SelectItem value="price">価格順</SelectItem>
									<SelectItem value="rating">評価順</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* カテゴリフィルター */}
						<div>
							<label htmlFor="category-select" className="text-sm font-medium">カテゴリ</label>
							<Select defaultValue={category || "all"}>
								<SelectTrigger id="category-select">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">すべて</SelectItem>
									<SelectItem value="voice">🎵 音声作品</SelectItem>
									<SelectItem value="game">🎮 ゲーム</SelectItem>
									<SelectItem value="other">📚 その他</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* 検索 */}
						<div className="md:col-span-2">
							<label htmlFor="search-input" className="text-sm font-medium">検索</label>
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									id="search-input"
									placeholder="作品タイトル、作者、RJ番号で検索..."
									defaultValue={search || ""}
									className="pl-10"
								/>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* 作品一覧 */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<BookOpen className="h-5 w-5" />
						DLsite作品一覧
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Suspense
						fallback={
							<div className="text-center py-12">
								<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-suzuka-500" />
								<p className="mt-2 text-muted-foreground">作品データを読み込み中...</p>
							</div>
						}
					>
						<WorkList data={initialData} totalCount={totalCount || 0} currentPage={validPage} />
					</Suspense>
				</CardContent>
			</Card>
		</div>
	);
}

// メタデータ設定
export const metadata = {
	title: "DLsite作品管理 | suzumina.click",
	description: "涼花みなせさんが出演されているDLsite作品の管理画面",
};
