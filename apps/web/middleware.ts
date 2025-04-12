import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * ミドルウェア関数
 * 認証とリクエストの処理を行う
 */
export default auth((req) => {
  // 現在のパス
  const path = req.nextUrl.pathname;

  // 認証が必要なパスの場合
  if (path === "/" || path.startsWith("/dashboard")) {
    if (!req.auth) {
      // 未認証の場合はログインページへリダイレクト
      return Response.redirect(new URL("/auth/signin", req.nextUrl));
    }
  }

  // Secret Managerからの環境変数を処理
  for (const key of Object.keys(process.env)) {
    const value = process.env[key];
    if (value?.startsWith("Secret:")) {
      // Secret Managerの値は既に解決されているはずなので、
      // ここでの特別な処理は不要
      console.info(`Environment variable ${key} is from Secret Manager`);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/", "/dashboard/:path*", "/auth/:path*"],
};
