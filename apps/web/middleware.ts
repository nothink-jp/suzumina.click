import { auth } from "@/auth";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import type { NextMiddleware, NextRequest } from "next/server";

// Define the core logic using auth()
const authMiddlewareLogic = auth(
  (req: NextRequest & { auth: Session | null }) => {
    const authResult = req.auth;

    // 認証状態とページタイプの確認
    const isAuthPage = req.nextUrl.pathname.startsWith("/auth");
    const isUserPage = req.nextUrl.pathname.startsWith("/users");

    // 未認証ユーザーが保護されたページにアクセスした場合
    if (!authResult && isUserPage) {
      const signInUrl = new URL("/auth/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(signInUrl);
    }

    // 認証済みユーザーが認証ページにアクセスした場合
    if (authResult?.user?.id && isAuthPage) {
      return NextResponse.redirect(
        new URL(`/users/${authResult.user.id}`, req.url),
      );
    }

    // No redirect needed, proceed with the request
    return NextResponse.next();
  },
);

// Use type assertion to cast the result of auth() to NextMiddleware
// This might suppress the TS build error but might hide underlying type issues.
// Biome will likely still warn about this assertion.
const middleware = authMiddlewareLogic as NextMiddleware;

export default middleware;

// 認証ミドルウェアを適用するパスを指定
export const config = {
  matcher: [
    // 認証ページ
    "/auth/:path*",
    // ユーザーページ
    "/users/:path*",
  ],
};
