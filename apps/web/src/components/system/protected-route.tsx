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
 * 認証が必要なページ用のラッパー（Server Component）。
 *
 * - 未認証: サインインページへリダイレクト（元 URL を callbackUrl に付与）。
 * - 認証済みだが無効アカウント（`isActive=false`）: 汎用エラーページ `/auth/error?error=AccountDisabled` へ。
 *   無効化の手段が現状無いため通常は到達しない防御的ゲート。ロールベース認可も無いため
 *   専用の 403 ページは設けず、到達時のみ汎用エラーページで理由を説明する方針（SPR-169）。
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

	// 無効アカウントの場合（防御的・通常は到達しない）
	if (!user.isActive) {
		redirect("/auth/error?error=AccountDisabled");
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
