import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
	// 本番環境でのみHost headerチェックを実行
	if (process.env.NODE_ENV === "production" && process.env.ALLOWED_HOSTS) {
		const allowedHosts = process.env.ALLOWED_HOSTS.split(",").map((host) => host.trim());
		const requestHost = request.headers.get("host");

		// ヘルスチェックエンドポイントは常に許可
		if (request.nextUrl.pathname === "/api/health") {
			return NextResponse.next();
		}

		// 許可されたホスト名でない場合は404を返す
		if (requestHost && !allowedHosts.includes(requestHost)) {
			return new NextResponse("Not Found", { status: 404 });
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 */
		"/((?!_next/static|_next/image|favicon.ico).*)",
	],
};
