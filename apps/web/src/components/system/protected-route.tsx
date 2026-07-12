import type { UserSession } from "@suzumina.click/shared-types";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth/server";

interface ProtectedRouteProps {
	children: ReactNode;
	fallbackUrl?: string;
	/** 未認証時に signin 後の戻り先として使う元ページのパス（クエリ含む）。呼び出し元が明示指定する。 */
	callbackPath?: string;
}

/**
 * 認証が必要なページ用のラッパー（Server Component）。
 *
 * - 未認証: サインインページへリダイレクト（`callbackPath` があれば callbackUrl に付与）。
 *   `callbackPath` は呼び出し元の page.tsx が自身の searchParams から明示的に組み立てる
 *   （x-url ヘッダ等の暗黙経路には頼らない＝呼び出し元を見れば戻り先が分かる状態を優先）。
 * - 認証済みだが無効アカウント（`isActive=false`）: 汎用エラーページ `/auth/error?error=AccountDisabled` へ。
 *   無効化の手段が現状無いため通常は到達しない防御的ゲート。ロールベース認可も無いため
 *   専用の 403 ページは設けず、到達時のみ汎用エラーページで理由を説明する方針（SPR-169）。
 */
export default async function ProtectedRoute({
	children,
	fallbackUrl = "/auth/signin",
	callbackPath,
}: ProtectedRouteProps) {
	const user = await getCurrentUser();

	// 未認証の場合
	if (!user) {
		const query = callbackPath ? `?callbackUrl=${encodeURIComponent(callbackPath)}` : "";
		redirect(`${fallbackUrl}${query}`);
	}

	// 無効アカウントの場合（防御的・通常は到達しない）
	if (!user.isActive) {
		redirect("/auth/error?error=AccountDisabled");
	}

	return <>{children}</>;
}

/**
 * Server Action 等で認証必須を担保するユーティリティ。誘導先は ProtectedRoute と統一。
 * - 未認証: `/auth/signin` へ
 * - 無効アカウント（`isActive=false`、防御的・通常到達せず）: `/auth/error?error=AccountDisabled` へ
 */
export async function requireAuth(): Promise<UserSession> {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/auth/signin");
	}
	if (!user.isActive) {
		redirect("/auth/error?error=AccountDisabled");
	}

	return user;
}
