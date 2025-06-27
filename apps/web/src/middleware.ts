import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { logAdminAccessAttempt, logAdminLoginSuccess } from "@/lib/security-logger";

export async function middleware(request: NextRequest) {
	// /admin パスへのアクセスをミドルウェアレベルでフィルタリング
	if (request.nextUrl.pathname.startsWith("/admin")) {
		try {
			const token = await getToken({
				req: request,
				secret: process.env.NEXTAUTH_SECRET,
			});

			// 未認証または管理者以外はホームページにリダイレクト
			// ※ この時、404やエラーページではなくホームにリダイレクトすることで
			//   管理画面の存在を完全に隠蔽
			if (!token || token.role !== "admin") {
				// 不正アクセス試行をログ記録
				const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown";
				const userAgent = request.headers.get("user-agent") || "unknown";
				logAdminAccessAttempt(ip, userAgent, request.nextUrl.pathname, token?.sub);

				return NextResponse.redirect(new URL("/", request.url));
			}
			// 管理者の正当なアクセスをログ記録
			const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown";
			const userAgent = request.headers.get("user-agent") || "unknown";
			logAdminLoginSuccess(ip, userAgent, token.sub || "unknown");
		} catch {
			// トークン取得エラーの場合もホームページにリダイレクト
			return NextResponse.redirect(new URL("/", request.url));
		}
	}

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
