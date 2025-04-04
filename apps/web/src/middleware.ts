import { auth } from "./auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 認証ミドルウェアの実装
export default auth((req) => {
  // 認証状態とページタイプの確認
  const isAuth = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/auth");
  const isUserPage = req.nextUrl.pathname.startsWith("/users");

  // 未認証ユーザーが保護されたページにアクセスした場合
  if (!isAuth && isUserPage) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(signInUrl);
  }

  // 認証済みユーザーが認証ページにアクセスした場合
  if (isAuth && isAuthPage && req.auth) {
    const userId = req.auth.user?.id;
    if (userId) {
      return NextResponse.redirect(new URL(`/users/${userId}`, req.url));
    }
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