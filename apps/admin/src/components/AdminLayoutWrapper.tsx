"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { AdminNavigation } from "./navigation/AdminNavigation";

interface AdminLayoutWrapperProps {
	children: React.ReactNode;
}

export function AdminLayoutWrapper({ children }: AdminLayoutWrapperProps) {
	const { data: session, status } = useSession();
	const pathname = usePathname();

	// ログインページの場合はナビゲーションを表示しない
	const isLoginPage = pathname === "/login";

	// セッション確認中またはログインページの場合はナビゲーションなし
	if (status === "loading" || isLoginPage || !session?.user?.isAdmin) {
		return <>{children}</>;
	}

	// 認証済み管理者の場合はナビゲーション付きレイアウト
	return (
		<div className="min-h-screen">
			<AdminNavigation />
			<main>{children}</main>
		</div>
	);
}
