import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
	// ログインページとAPIルートはアクセス許可
	if (request.nextUrl.pathname === "/login" || request.nextUrl.pathname.startsWith("/api/")) {
		return NextResponse.next();
	}

	// 簡単なセッションチェック（詳細な認証はページレベルで実装）
	const sessionCookie =
		request.cookies.get("next-auth.session-token") ||
		request.cookies.get("__Secure-next-auth.session-token");

	if (!sessionCookie) {
		// セッションがない場合はログインページにリダイレクト
		const loginUrl = new URL("/login", request.url);
		return NextResponse.redirect(loginUrl);
	}

	// セッションがある場合はアクセス許可（詳細チェックはページコンポーネントで実行）
	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - login (login page)
		 */
		"/((?!api|_next/static|_next/image|favicon.ico|login).*)",
	],
};
