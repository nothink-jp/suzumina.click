/**
 * ローカル開発ログイン（dev 専用 / Discord OAuth を通さずに better-auth の実セッションを発行する）。
 *
 *   http://localhost:3000/api/dev/signin
 *   http://localhost:3000/api/dev/signin?callbackUrl=/buttons/create
 *
 * `pnpm dev:local:auth` で起動したときだけ生きる。有効化条件は `lib/dev-auth/guard.ts` の 3 段ゲートで、
 * 1 つでも欠ければ 404（＝存在しないルートとして振る舞う）。本番では無条件に 404 になる。
 *
 * サインアウトは通常どおりヘッダーのログアウト（better-auth の `/api/auth/sign-out`）で行える
 * ＝発行しているのが本物のセッションのため、専用の解除経路は要らない。
 */
import { type NextRequest, NextResponse } from "next/server";
import { sanitizeRelativePath } from "@/lib/auth/auth-redirect";
import { issueDevSessionCookie } from "@/lib/better-auth/dev-session";
import { isDevAuthEnabled } from "@/lib/dev-auth/guard";

export async function GET(request: NextRequest): Promise<NextResponse> {
	if (!isDevAuthEnabled()) {
		return new NextResponse(null, { status: 404 });
	}

	// callbackUrl は URL 経由で外から来るため、通常のログインと同じサニタイズを通す。
	const callbackUrl = sanitizeRelativePath(request.nextUrl.searchParams.get("callbackUrl"));
	const cookie = await issueDevSessionCookie();

	const response = NextResponse.redirect(new URL(callbackUrl, request.nextUrl.origin));
	response.cookies.set(cookie.name, cookie.value, cookie.options);
	return response;
}
