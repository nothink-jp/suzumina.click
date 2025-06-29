import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
	// ログインページとAPIルートはアクセス許可
	if (request.nextUrl.pathname === "/login" || request.nextUrl.pathname.startsWith("/api/")) {
		return NextResponse.next();
	}

	// 認証チェック
	const session = await auth();

	if (!session?.user?.isAdmin) {
		// 未認証または管理者でない場合はログインページにリダイレクト
		const loginUrl = new URL("/login", request.url);
		return NextResponse.redirect(loginUrl);
	}

	// 認証済み管理者はアクセス許可
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
