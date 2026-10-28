import "server-only";
import { error as logError, warn as logWarn } from "./logger";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 5000;

/**
 * Cloudflare 公式のテスト用鍵（常に通る）。本番以外で env が無いときだけ使う
 * （`pnpm dev:local` やプレビューを本物の鍵なしで動かすため）。本番では使わない
 */
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
export const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

const isProduction = () => process.env.NODE_ENV === "production";

/**
 * Turnstile のサイトキー（公開してよい値）。サーバ専用
 *
 * 本番では Cloud Run の実行時 env としてしか渡さない（`deploy-web.yml` の `--set-env-vars`）ため、
 * クライアントで `process.env` を読むと undefined になる（GA 測定 ID と同じ事情・SPR-307）。
 * Server Component から prop で渡すこと。本番で未設定なら undefined（フォームは送信不可を表示する）
 */
export function getTurnstileSiteKey(): string | undefined {
	return process.env.TURNSTILE_SITE_KEY || (isProduction() ? undefined : TURNSTILE_TEST_SITE_KEY);
}

function getSecretKey(): string | undefined {
	return (
		process.env.TURNSTILE_SECRET_KEY || (isProduction() ? undefined : TURNSTILE_TEST_SECRET_KEY)
	);
}

interface SiteverifyResponse {
	success: boolean;
	"error-codes"?: string[];
}

/**
 * Turnstile のトークンを Cloudflare の siteverify で検証する
 *
 * **fail closed**: 鍵の未設定・通信失敗・タイムアウトも false を返す（確かめられないまま通すと
 * 「Turnstile で守っている」という約束と実際の動きがずれるため・SPR-398）。
 * `remoteIp` は Cloudflare への参考情報で、判定の正本ではない（オリジン迂回では偽装できる・SPR-366/367）
 *
 * @returns 検証に成功したときだけ true
 */
export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
	if (!token) return false;

	const secret = getSecretKey();
	if (!secret) {
		logError("TURNSTILE_SECRET_KEY が未設定のためお問い合わせを拒否した", {
			alert: "turnstile_secret_missing",
		});
		return false;
	}

	const body = new URLSearchParams({ secret, response: token });
	if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

	try {
		const res = await fetch(SITEVERIFY_URL, {
			method: "POST",
			body,
			signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
		});
		if (!res.ok) {
			logError("Turnstile siteverify が HTTP エラーを返した", {
				alert: "turnstile_siteverify_unavailable",
				status: res.status,
			});
			return false;
		}
		const result = (await res.json()) as SiteverifyResponse;
		if (!result.success) {
			logWarn("Turnstile の検証に失敗した", { errorCodes: result["error-codes"] ?? [] });
		}
		return result.success === true;
	} catch (err) {
		logError("Turnstile siteverify に到達できなかった", err);
		return false;
	}
}
