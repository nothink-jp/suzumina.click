import { type NextRequest, NextResponse } from "next/server";

function handleHostValidation(request: NextRequest): NextResponse | null {
	const isProduction = process.env.NODE_ENV === "production";
	const allowedHostsEnv = process.env.ALLOWED_HOSTS;

	if (!isProduction || !allowedHostsEnv) {
		return null;
	}

	// ヘルスチェックエンドポイントは常に許可
	if (request.nextUrl.pathname === "/api/health") {
		return null;
	}

	const allowedHosts = allowedHostsEnv.split(",").map((host) => host.trim());
	const requestHost = request.headers.get("host");

	if (requestHost && !allowedHosts.includes(requestHost)) {
		return new NextResponse("Not Found", { status: 404 });
	}

	return null;
}

export async function middleware(request: NextRequest) {
	// ホスト名バリデーション
	const hostResponse = handleHostValidation(request);
	if (hostResponse) {
		return hostResponse;
	}

	// Service Worker navigation preload エラーを回避するため、適切なヘッダーを設定
	const response = NextResponse.next();

	// Service Worker関連のヘッダーを追加
	response.headers.set("Service-Worker-Allowed", "/");
	response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");

	return response;
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
