import {
	ListPageContent,
	ListPageGrid,
	ListPageHeader,
	ListPageLayout,
	ListPageStats,
} from "@suzumina.click/ui/components/custom/list-page-layout";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@suzumina.click/ui/components/ui/pagination";
import { ArrowLeft, Shield, ShieldCheck, User, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserManagementClient } from "@/components/management/UserManagementClient";
import { auth } from "@/lib/auth";
import { getFirestore } from "@/lib/firestore";

// ユーザーデータの型定義
interface AdminUser {
	id: string;
	discordId: string;
	username: string;
	globalName?: string;
	displayName: string;
	role: "member" | "moderator" | "admin";
	isActive: boolean;
	createdAt: string;
	lastLoginAt?: string;
}

// ユーザー一覧取得関数（ページネーション対応）
async function getUsers(
	page = 1,
	limit = 100,
): Promise<{
	users: AdminUser[];
	totalCount: number;
	currentPage: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}> {
	try {
		const firestore = getFirestore();

		// 総件数を取得
		const totalSnap = await firestore.collection("users").get();
		const totalCount = totalSnap.size;

		// ページング計算
		const _offset = (page - 1) * limit;
		const totalPages = Math.ceil(totalCount / limit);

		// ページ範囲チェック
		const currentPage = Math.max(1, Math.min(page, totalPages));
		const actualOffset = (currentPage - 1) * limit;

		// データ取得（createdAtでソート）
		const usersSnap = await firestore
			.collection("users")
			.orderBy("createdAt", "desc")
			.offset(actualOffset)
			.limit(limit)
			.get();

		const users = usersSnap.docs.map((doc) => {
			const data = doc.data();
			return {
				id: doc.id,
				discordId: data.discordId || doc.id,
				username: data.username || "Unknown",
				globalName: data.globalName,
				displayName: data.displayName || data.username || "Unknown",
				role: data.role || "member",
				isActive: data.isActive !== false,
				createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
				lastLoginAt: data.lastLoginAt?.toDate?.()?.toISOString(),
			};
		});

		return {
			users,
			totalCount,
			currentPage,
			totalPages,
			hasNext: currentPage < totalPages,
			hasPrev: currentPage > 1,
		};
	} catch (_error) {
		return {
			users: [],
			totalCount: 0,
			currentPage: 1,
			totalPages: 1,
			hasNext: false,
			hasPrev: false,
		};
	}
}

// ロールバッジのスタイル
function _getRoleBadge(role: string) {
	switch (role) {
		case "admin":
			return (
				<Badge variant="destructive" className="gap-1">
					<ShieldCheck className="h-3 w-3" />
					管理者
				</Badge>
			);
		case "moderator":
			return (
				<Badge variant="secondary" className="gap-1">
					<Shield className="h-3 w-3" />
					モデレーター
				</Badge>
			);
		default:
			return (
				<Badge variant="outline" className="gap-1">
					<User className="h-3 w-3" />
					メンバー
				</Badge>
			);
	}
}

// 最終ログイン時刻の表示
function _formatLastLogin(lastLoginAt?: string) {
	if (!lastLoginAt) return "未ログイン";
	const date = new Date(lastLoginAt);
	return date.toLocaleString("ja-JP");
}

interface UsersPageProps {
	searchParams: Promise<{
		page?: string;
	}>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
	const session = await auth();

	if (!session?.user?.isAdmin) {
		redirect("/login");
	}

	// ページ番号を取得
	const params = await searchParams;
	const currentPage = Math.max(1, Number.parseInt(params.page || "1", 10));

	const result = await getUsers(currentPage, 100);
	const { users, totalCount, totalPages, hasNext, hasPrev } = result;

	// ロール別統計
	const stats = {
		total: totalCount,
		active: users.filter((u) => u.isActive).length,
		admin: users.filter((u) => u.role === "admin").length,
		moderator: users.filter((u) => u.role === "moderator").length,
		member: users.filter((u) => u.role === "member").length,
	};

	return (
		<ListPageLayout>
			<ListPageHeader title="ユーザー管理" description="登録ユーザーの管理・ロール設定">
				<Button variant="outline" size="sm" asChild>
					<Link href="/" className="gap-2">
						<ArrowLeft className="h-4 w-4" />
						ダッシュボードに戻る
					</Link>
				</Button>
			</ListPageHeader>

			<ListPageContent>
				{/* 統計カード */}
				<ListPageGrid columns={{ default: 2, md: 3, lg: 5 }}>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium flex items-center gap-2">
								<Users className="h-4 w-4" />
								総ユーザー
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{stats.total}</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">アクティブ</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-green-600">{stats.active}</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">管理者</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-destructive">{stats.admin}</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">モデレーター</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-secondary">{stats.moderator}</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">メンバー</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-muted-foreground">{stats.member}</div>
						</CardContent>
					</Card>
				</ListPageGrid>

				{/* ユーザーテーブル */}
				<Card>
					<CardHeader>
						<CardTitle>ユーザー一覧</CardTitle>
					</CardHeader>
					<CardContent>
						<UserManagementClient initialUsers={users} currentUserId={session.user.id} />

						{users.length === 0 && (
							<div className="text-center py-8 text-muted-foreground">ユーザーが見つかりません</div>
						)}

						{/* ページネーション */}
						{totalPages > 1 && (
							<div className="mt-4">
								<Pagination>
									<PaginationContent>
										<PaginationItem>
											{hasPrev ? (
												<PaginationPrevious href={`/users?page=${currentPage - 1}`} />
											) : (
												<PaginationPrevious className="pointer-events-none opacity-50" />
											)}
										</PaginationItem>

										{/* 現在のページ番号表示 */}
										{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
											const pageNum = Math.max(1, currentPage - 2) + i;
											if (pageNum > totalPages) return null;
											return (
												<PaginationItem key={pageNum}>
													<PaginationLink
														href={`/users?page=${pageNum}`}
														isActive={pageNum === currentPage}
													>
														{pageNum}
													</PaginationLink>
												</PaginationItem>
											);
										})}

										<PaginationItem>
											{hasNext ? (
												<PaginationNext href={`/users?page=${currentPage + 1}`} />
											) : (
												<PaginationNext className="pointer-events-none opacity-50" />
											)}
										</PaginationItem>
									</PaginationContent>
								</Pagination>

								<ListPageStats
									currentPage={currentPage}
									totalPages={totalPages}
									totalCount={totalCount}
									itemsPerPage={100}
									className="mt-4"
								/>
							</div>
						)}
					</CardContent>
				</Card>
			</ListPageContent>
		</ListPageLayout>
	);
}
