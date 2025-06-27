import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { logAdminAccessAttempt, logAdminLoginSuccess } from "@/lib/security-logger";

function getClientInfo(request: NextRequest) {
	// biome-ignore lint/suspicious/noExplicitAny: NextRequest.ip property not in types but available at runtime
	const ip = (request as any).ip || request.headers.get("x-forwarded-for") || "unknown";
	const userAgent = request.headers.get("user-agent") || "unknown";
	return { ip, userAgent };
}

async function handleAdminAccess(request: NextRequest): Promise<NextResponse | null> {
	if (!request.nextUrl.pathname.startsWith("/admin")) {
		return null;
	}

	try {
		const token = await getToken({
			req: request,
			secret: process.env.NEXTAUTH_SECRET,
		});

		// 管理者チェック
		const isAdmin = token && token.role === "admin";

		// 未認証または管理者以外はホームページにリダイレクト
		if (!token || !isAdmin) {
			const { ip, userAgent } = getClientInfo(request);
			logAdminAccessAttempt(ip, userAgent, request.nextUrl.pathname, token?.sub);
			return NextResponse.redirect(new URL("/", request.url));
		}

		// 管理者の正当なアクセスをログ記録
		const { ip, userAgent } = getClientInfo(request);
		logAdminLoginSuccess(ip, userAgent, token.sub || "unknown");
		return null;
	} catch {
		// トークン取得エラーの場合もホームページにリダイレクト
		return NextResponse.redirect(new URL("/", request.url));
	}
}

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
	// 管理者アクセス制御
	const adminResponse = await handleAdminAccess(request);
	if (adminResponse) {
		return adminResponse;
	}

	// ホスト名バリデーション
	const hostResponse = handleHostValidation(request);
	if (hostResponse) {
		return hostResponse;
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
