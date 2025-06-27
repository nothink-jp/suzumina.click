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
import { Download, Filter, Search, Users as UsersIcon } from "lucide-react";
import { Suspense } from "react";
import { getUserStats, getUsers } from "./actions";
import UserList from "./components/UserList";

interface AdminUsersProps {
	searchParams: Promise<{
		role?: string;
		search?: string;
		sort?: string;
	}>;
}

function parseAdminUsersParams(searchParams: { role?: string; search?: string; sort?: string }) {
	const { role: roleParam, search: searchParam, sort: sortParam } = searchParams;

	const role =
		roleParam && typeof roleParam === "string"
			? (roleParam as "member" | "moderator" | "admin")
			: undefined;

	const searchText = searchParam && typeof searchParam === "string" ? searchParam : undefined;

	const sortBy =
		sortParam && typeof sortParam === "string"
			? (sortParam as "newest" | "oldest" | "mostActive" | "alphabetical")
			: "newest";

	return { role, searchText, sortBy };
}

export default async function AdminUsers({ searchParams }: AdminUsersProps) {
	// URLパラメータの解析
	const resolvedSearchParams = await searchParams;
	const { role, searchText, sortBy } = parseAdminUsersParams(resolvedSearchParams);

	// 並行してデータを取得
	const [initialData, stats] = await Promise.all([
		getUsers({
			limit: 20,
			role,
			searchText,
			sortBy,
			onlyPublic: false,
		}),
		getUserStats(),
	]);

	return (
		<div className="p-6 space-y-6">
			{/* ページヘッダー */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-foreground">ユーザー管理</h1>
					<p className="text-muted-foreground mt-1">全 {stats?.totalUsers || 0} 人のユーザー</p>
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
							<div className="text-2xl font-bold text-suzuka-600">{stats?.totalUsers || 0}</div>
							<div className="text-sm text-muted-foreground">総ユーザー</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-red-600">{stats?.adminUsers || 0}</div>
							<div className="text-sm text-muted-foreground">管理者</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-blue-600">{stats?.moderatorUsers || 0}</div>
							<div className="text-sm text-muted-foreground">モデレーター</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-green-600">
								{(stats?.totalUsers || 0) - (stats?.adminUsers || 0) - (stats?.moderatorUsers || 0)}
							</div>
							<div className="text-sm text-muted-foreground">メンバー</div>
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
						{/* ロールフィルター */}
						<div>
							<label htmlFor="role-select" className="text-sm font-medium">
								ロール
							</label>
							<Select defaultValue={role || "all"}>
								{/* biome-ignore lint/nursery/useUniqueElementIds: Server component with unique page context */}
								<SelectTrigger id="role-select">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">すべて</SelectItem>
									<SelectItem value="admin">🔴 管理者</SelectItem>
									<SelectItem value="moderator">🔵 モデレーター</SelectItem>
									<SelectItem value="member">🔘 メンバー</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* ソート */}
						<div>
							<label htmlFor="sort-select" className="text-sm font-medium">
								並び順
							</label>
							<Select defaultValue={sortBy || "newest"}>
								{/* biome-ignore lint/nursery/useUniqueElementIds: Server component with unique page context */}
								<SelectTrigger id="sort-select">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="newest">新しい順</SelectItem>
									<SelectItem value="oldest">古い順</SelectItem>
									<SelectItem value="mostActive">アクティブ順</SelectItem>
									<SelectItem value="alphabetical">名前順</SelectItem>
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
									placeholder="ユーザー名、表示名、メールアドレスで検索..."
									defaultValue={searchText || ""}
									className="pl-10"
								/>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* ユーザー一覧 */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<UsersIcon className="h-5 w-5" />
						ユーザー一覧
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Suspense
						fallback={
							<div className="text-center py-12">
								<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-suzuka-500" />
								<p className="mt-2 text-muted-foreground">ユーザーデータを読み込み中...</p>
							</div>
						}
					>
						<UserList data={initialData} currentPage={1} />
					</Suspense>
				</CardContent>
			</Card>
		</div>
	);
}
