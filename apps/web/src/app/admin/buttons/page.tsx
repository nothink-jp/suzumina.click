import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { convertToFrontendAudioButton } from "@suzumina.click/shared-types";
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
import { Download, Filter, Music, Search } from "lucide-react";
import { getFirestore } from "@/lib/firestore";
import { ButtonList } from "./components/ButtonList";

type ButtonsPageProps = {
	searchParams: {
		category?: string;
		user?: string;
		search?: string;
		page?: string;
		sort?: string;
	};
};

async function getButtons({
	category,
	user,
	search,
	page = "1",
	sort = "newest",
}: {
	category?: string;
	user?: string;
	search?: string;
	page?: string;
	sort?: string;
}) {
	try {
		const firestore = getFirestore();
		let query = firestore.collection("audioButtons");

		// カテゴリフィルター
		if (category && category !== "all") {
			// biome-ignore lint/suspicious/noExplicitAny: Firestore query typing issue
			query = query.where("category", "==", category) as any;
		}

		// ユーザーフィルター
		if (user && user !== "all") {
			// biome-ignore lint/suspicious/noExplicitAny: Firestore query typing issue
			query = query.where("userId", "==", user) as any;
		}

		// ソート順
		const orderDirection = sort === "oldest" ? "asc" : "desc";
		// biome-ignore lint/suspicious/noExplicitAny: Firestore query typing issue
		query = query.orderBy("createdAt", orderDirection) as any;

		const snapshot = await query.get();

		let buttons = snapshot.docs.map((doc) => {
			const data = doc.data();
			// biome-ignore lint/suspicious/noExplicitAny: Firestore data typing issue
			return convertToFrontendAudioButton(data as any);
		}) as FrontendAudioButtonData[];

		// 検索フィルター（クライアントサイド）
		if (search) {
			const searchLower = search.toLowerCase();
			buttons = buttons.filter(
				(button) =>
					button.title.toLowerCase().includes(searchLower) ||
					button.description?.toLowerCase().includes(searchLower) ||
					button.uploadedByName?.toLowerCase().includes(searchLower),
			);
		}

		// ページネーション
		const limit = 20;
		const offset = (Number.parseInt(page) - 1) * limit;
		const paginatedButtons = buttons.slice(offset, offset + limit);

		return {
			buttons: paginatedButtons,
			total: buttons.length,
			hasMore: buttons.length > offset + limit,
		};
	} catch {
		return {
			buttons: [],
			total: 0,
			hasMore: false,
		};
	}
}

async function getButtonStats() {
	try {
		const firestore = getFirestore();
		const snapshot = await firestore.collection("audioButtons").get();

		const stats = snapshot.docs.reduce(
			(acc, doc) => {
				const category = doc.data().category || "other";
				const isFileType = doc.data().audioFileUrl ? "file" : "youtube";

				acc.byCategory[category] = (acc.byCategory[category] || 0) + 1;
				acc.byType[isFileType] = (acc.byType[isFileType] || 0) + 1;
				acc.total++;

				return acc;
			},
			{
				total: 0,
				byCategory: {} as Record<string, number>,
				byType: {} as Record<string, number>,
			},
		);

		return stats;
	} catch {
		return {
			total: 0,
			byCategory: {},
			byType: {},
		};
	}
}

export default async function ButtonsAdminPage({ searchParams }: ButtonsPageProps) {
	const { category, user, search, page, sort } = searchParams;

	const [{ buttons, total, hasMore }, stats] = await Promise.all([
		getButtons({ category, user, search, page, sort }),
		getButtonStats(),
	]);

	return (
		<div className="p-6 space-y-6">
			{/* ページヘッダー */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-foreground">音声ボタン管理</h1>
					<p className="text-muted-foreground mt-1">全 {stats.total} 件の音声ボタン</p>
				</div>
				<Button variant="outline" className="flex items-center gap-2">
					<Download className="h-4 w-4" />
					CSVエクスポート
				</Button>
			</div>

			{/* 統計カード */}
			<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
				<Card>
					<CardContent className="p-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-suzuka-600">{stats.total}</div>
							<div className="text-sm text-muted-foreground">総数</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-blue-600">{stats.byType.youtube || 0}</div>
							<div className="text-sm text-muted-foreground">YouTube</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-green-600">{stats.byType.file || 0}</div>
							<div className="text-sm text-muted-foreground">音声ファイル</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-orange-600">
								{stats.byCategory.normal || 0}
							</div>
							<div className="text-sm text-muted-foreground">通常</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-purple-600">
								{stats.byCategory.special || 0}
							</div>
							<div className="text-sm text-muted-foreground">特別</div>
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
					<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
									<SelectItem value="normal">🎵 通常</SelectItem>
									<SelectItem value="special">⭐ 特別</SelectItem>
									<SelectItem value="other">📝 その他</SelectItem>
								</SelectContent>
							</Select>
						</div>

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
									<SelectItem value="title">タイトル順</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* ユーザーフィルター */}
						<div>
							<label htmlFor="user-select" className="text-sm font-medium">
								作成者
							</label>
							<Select defaultValue={user || "all"}>
								{/* biome-ignore lint/nursery/useUniqueElementIds: Server component with unique page context */}
								<SelectTrigger id="user-select">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">すべて</SelectItem>
									{/* 実際の運用では、ユーザー一覧をAPIから取得 */}
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
									placeholder="タイトル、説明、作成者で検索..."
									defaultValue={search || ""}
									className="pl-10"
								/>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* 音声ボタン一覧 */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Music className="h-5 w-5" />
						音声ボタン一覧
					</CardTitle>
				</CardHeader>
				<CardContent>
					<ButtonList buttons={buttons} />

					{/* ページネーション */}
					{total > 20 && (
						<div className="flex justify-center mt-6">
							<div className="flex items-center gap-2">
								<Button variant="outline" size="sm" disabled={page === "1"}>
									前のページ
								</Button>
								<span className="text-sm text-muted-foreground">{page || "1"} ページ</span>
								<Button variant="outline" size="sm" disabled={!hasMore}>
									次のページ
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
