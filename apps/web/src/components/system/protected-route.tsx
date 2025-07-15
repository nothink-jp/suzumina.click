import type { UserSession } from "@suzumina.click/shared-types";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";

interface ProtectedRouteProps {
	children: ReactNode;
	requireRole?: "admin" | "moderator" | "member";
	fallbackUrl?: string;
}

/**
 * 認証が必要なページ用のコンポーネント
 * 未認証ユーザーはサインインページにリダイレクト
 * 権限不足ユーザーは403エラーページにリダイレクト
 */
export default async function ProtectedRoute({
	children,
	requireRole = "member",
	fallbackUrl = "/auth/signin",
}: ProtectedRouteProps) {
	const session = await auth();

	// 未認証の場合
	if (!session?.user) {
		// 現在のURLをコールバックURLとして保存
		const headersList = await headers();
		const currentUrl = headersList.get("x-url") || "/buttons/create";
		redirect(`${fallbackUrl}?callbackUrl=${encodeURIComponent(currentUrl)}`);
	}

	const user = session.user;

	// 非アクティブユーザーの場合
	if (!user.isActive) {
		redirect("/auth/error?error=AccessDenied");
	}

	// 権限チェック
	const roleHierarchy = {
		member: 0,
		moderator: 1,
		admin: 2,
	};

	const userLevel = roleHierarchy[user.role];
	const requiredLevel = roleHierarchy[requireRole];

	if (userLevel < requiredLevel) {
		redirect("/auth/error?error=AccessDenied");
	}

	return <>{children}</>;
}

/**
 * 認証ステータスチェック用のユーティリティ関数
 */
export async function requireAuth(): Promise<UserSession> {
	const session = await auth();

	if (!session?.user || !session.user.isActive) {
		redirect("/auth/signin");
	}

	return session.user;
}

/**
 * 管理者権限チェック用のユーティリティ関数
 */
export async function requireAdmin(): Promise<UserSession> {
	const user = await requireAuth();

	if (user.role !== "admin") {
		redirect("/auth/error?error=AccessDenied");
	}

	return user;
}

/**
 * モデレーター以上の権限チェック用のユーティリティ関数
 */
export async function requireModerator(): Promise<UserSession> {
	const user = await requireAuth();

	if (user.role !== "admin" && user.role !== "moderator") {
		redirect("/auth/error?error=AccessDenied");
	}

	return user;
}
