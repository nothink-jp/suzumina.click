import "server-only";

/**
 * リクエスト元クライアントの IP を返す。取れなければ `"unknown"`。
 *
 * Cloudflare 経由なら cf-connecting-ip が正（x-forwarded-for の先頭はクライアントが偽装できる）。
 * ただしオリジン迂回（SPR-366/367）では cf-connecting-ip もクライアントが付けられるため、
 * 認可の信頼キーにはしない（抑止・スパム判定の手掛かりに留める）。
 */
export function getClientIp(headersList: Pick<Headers, "get">): string {
	return (
		headersList.get("cf-connecting-ip")?.trim() ||
		headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		"unknown"
	);
}
