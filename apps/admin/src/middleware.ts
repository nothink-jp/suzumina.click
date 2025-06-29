import { type NextRequest, NextResponse } from "next/server";

export async function middleware(_request: NextRequest) {
	// middlewareでの認証チェックを無効化し、ページレベルの認証のみに依存
	// これによりリダイレクトループを回避
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
