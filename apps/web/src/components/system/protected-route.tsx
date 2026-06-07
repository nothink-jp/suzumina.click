import type { UserSession } from "@suzumina.click/shared-types";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth/server";

interface ProtectedRouteProps {
	children: ReactNode;
	fallbackUrl?: string;
}

/**
 * 認証が必要なページ用のコンポーネント
 * 未認証ユーザーはサインインページにリダイレクト
 * 非アクティブユーザーは403エラーページにリダイレクト
 */
export default async function ProtectedRoute({
	children,
	fallbackUrl = "/auth/signin",
}: ProtectedRouteProps) {
	const user = await getCurrentUser();

	// 未認証の場合
	if (!user) {
		// 現在のURLをコールバックURLとして保存
		const headersList = await headers();
		const currentUrl = headersList.get("x-url") || "/buttons/create";
		redirect(`${fallbackUrl}?callbackUrl=${encodeURIComponent(currentUrl)}`);
	}

	// 非アクティブユーザーの場合
	if (!user.isActive) {
		redirect("/auth/error?error=AccessDenied");
	}

	return <>{children}</>;
}

/**
 * 認証ステータスチェック用のユーティリティ関数
 */
export async function requireAuth(): Promise<UserSession> {
	const user = await getCurrentUser();

	if (!user?.isActive) {
		redirect("/auth/signin");
	}

	return user;
}
