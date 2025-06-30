"use client";

import { Badge } from "@suzumina.click/ui/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@suzumina.click/ui/components/ui/table";
import { Shield, ShieldCheck, User } from "lucide-react";
import { useState } from "react";
import { UserDeleteDialog } from "@/components/UserDeleteDialog";
import { UserEditDialog } from "@/components/UserEditDialog";

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

interface UserManagementClientProps {
	initialUsers: AdminUser[];
	currentUserId: string;
}

export function UserManagementClient({ initialUsers, currentUserId }: UserManagementClientProps) {
	const [users, _setUsers] = useState(initialUsers);

	const refreshUsers = async () => {
		// ページをリロードしてデータを更新
		window.location.reload();
	};

	const getRoleIcon = (role: string) => {
		switch (role) {
			case "admin":
				return <Shield className="h-4 w-4 text-red-500" />;
			case "moderator":
				return <ShieldCheck className="h-4 w-4 text-orange-500" />;
			default:
				return <User className="h-4 w-4 text-gray-500" />;
		}
	};

	const getRoleBadge = (role: string) => {
		switch (role) {
			case "admin":
				return <Badge className="bg-red-100 text-red-700 border-red-200">Admin</Badge>;
			case "moderator":
				return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Moderator</Badge>;
			default:
				return <Badge variant="secondary">Member</Badge>;
		}
	};

	const formatLastLogin = (lastLoginAt?: string) => {
		if (!lastLoginAt) return "未ログイン";
		const date = new Date(lastLoginAt);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffHours = diffMs / (1000 * 60 * 60);

		if (diffHours < 24) {
			return `${Math.floor(diffHours)}時間前`;
		}
		const diffDays = Math.floor(diffHours / 24);
		if (diffDays < 30) {
			return `${diffDays}日前`;
		}
		return date.toLocaleDateString("ja-JP");
	};

	return (
		<div className="rounded-md border overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="min-w-[200px]">ユーザー</TableHead>
						<TableHead className="min-w-[100px]">ロール</TableHead>
						<TableHead className="min-w-[100px]">ステータス</TableHead>
						<TableHead className="min-w-[120px] hidden sm:table-cell">最終ログイン</TableHead>
						<TableHead className="min-w-[100px] hidden md:table-cell">登録日</TableHead>
						<TableHead className="text-right min-w-[120px]">操作</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{users.map((user) => (
						<TableRow key={user.id}>
							<TableCell>
								<div className="flex items-center space-x-3">
									{getRoleIcon(user.role)}
									<div>
										<div className="font-medium">{user.displayName}</div>
										<div className="text-sm text-muted-foreground">@{user.username}</div>
									</div>
								</div>
							</TableCell>
							<TableCell>{getRoleBadge(user.role)}</TableCell>
							<TableCell>
								{user.isActive ? (
									<Badge variant="outline" className="text-green-600 border-green-600">
										アクティブ
									</Badge>
								) : (
									<Badge variant="secondary">無効</Badge>
								)}
							</TableCell>
							<TableCell className="text-sm hidden sm:table-cell">
								{formatLastLogin(user.lastLoginAt)}
							</TableCell>
							<TableCell className="text-sm hidden md:table-cell">
								{new Date(user.createdAt).toLocaleDateString("ja-JP")}
							</TableCell>
							<TableCell className="text-right">
								<div className="flex justify-end space-x-1 sm:space-x-2">
									<UserEditDialog user={user} onUpdate={refreshUsers} />
									{user.id !== currentUserId && (
										<UserDeleteDialog user={user} onDelete={refreshUsers} />
									)}
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
