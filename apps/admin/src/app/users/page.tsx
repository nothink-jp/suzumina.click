import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { ArrowLeft, Shield, ShieldCheck, User, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserManagementClient } from "@/components/UserManagementClient";
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

// ユーザー一覧取得関数
async function getUsers(): Promise<AdminUser[]> {
	try {
		const firestore = getFirestore();
		const usersSnap = await firestore.collection("users").orderBy("createdAt", "desc").get();

		return usersSnap.docs.map((doc) => {
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
	} catch (_error) {
		return [];
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

export default async function UsersPage() {
	const session = await auth();

	if (!session?.user?.isAdmin) {
		redirect("/login");
	}

	const users = await getUsers();

	// ロール別統計
	const stats = {
		total: users.length,
		active: users.filter((u) => u.isActive).length,
		admin: users.filter((u) => u.role === "admin").length,
		moderator: users.filter((u) => u.role === "moderator").length,
		member: users.filter((u) => u.role === "member").length,
	};

	return (
		<div className="p-6 space-y-6">
			{/* ページヘッダー */}
			<div className="flex items-center gap-4">
				<Button variant="outline" size="sm" asChild>
					<Link href="/" className="gap-2">
						<ArrowLeft className="h-4 w-4" />
						ダッシュボードに戻る
					</Link>
				</Button>
				<div>
					<h1 className="text-3xl font-bold text-foreground">ユーザー管理</h1>
					<p className="text-muted-foreground mt-1">登録ユーザーの管理・ロール設定</p>
				</div>
			</div>

			{/* 統計カード */}
			<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
			</div>

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
				</CardContent>
			</Card>
		</div>
	);
}
