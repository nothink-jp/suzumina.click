import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

// Node.js Runtimeを指定
export const runtime = "nodejs";

export default auth((req) => {
  // 認証状態とページタイプの確認
  const isAuthPage = req.nextUrl.pathname.startsWith("/auth");
  const isUserPage = req.nextUrl.pathname.startsWith("/users");

  // 未認証ユーザーが保護されたページにアクセスした場合
  if (!req.auth && isUserPage) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(signInUrl);
  }

  // 認証済みユーザーが認証ページにアクセスした場合
  if (req.auth?.user?.id && isAuthPage) {
    return NextResponse.redirect(
      new URL(`/users/${req.auth.user.id}`, req.url),
    );
  }

  return NextResponse.next();
});

// 認証ミドルウェアを適用するパスを指定
export const config = {
  matcher: [
    // 認証ページ
    "/auth/:path*",
    // ユーザーページ
    "/users/:path*",
  ],
};
