/**
 * next/image に渡す src の正規化と、最適化可能かどうかの判定。
 *
 * 背景（なぜ描画前に弾くのか）:
 * next/image のホスト検証（`Invalid src prop ... hostname "x" is not configured`）は
 * `NODE_ENV !== "production"` のガード内にあり、**開発時のみ throw** する
 * （next/dist/shared/lib/image-loader.js）。つまり許可外ホストの URL が 1 件混ざると
 * - 開発: レンダリング中に throw してページ全体がエラーページになる
 * - 本番: `/_next/image` が 400 を返し、onError 経由でフォールバックに落ちる（無駄な往復）
 * という非対称な壊れ方をする。DLsite の「画像なし」プレースホルダ
 * （https://www.dlsite.com/images/web/home/no_img_*.gif）が実データに存在するため、
 * 表示側で許可ホスト以外を弾き、自前のプレースホルダへ倒す。
 */

interface AllowedImagePattern {
	hostname: string;
	/** remotePatterns の pathname グロブ（`/x/y/**`）から `**` を除いた前方一致部分 */
	pathnamePrefix: string;
}

/**
 * next/image が最適化を許可するリモート画像パターン。
 *
 * 正本は next.config.mjs の `images.remotePatterns`（Next 本体が実際に読む設定）で、
 * ここはその写し。ズレは `__tests__/image-src.test.ts` が next.config.mjs を読み込んで
 * 突き合わせ、テスト失敗として検出する（コメントでの運用に頼らない）。
 */
export const ALLOWED_IMAGE_PATTERNS: readonly AllowedImagePattern[] = [
	{ hostname: "i.ytimg.com", pathnamePrefix: "/vi/" },
	{ hostname: "img.youtube.com", pathnamePrefix: "/vi/" },
	{ hostname: "img.dlsite.jp", pathnamePrefix: "/resize/images2/" },
	{ hostname: "img.dlsite.jp", pathnamePrefix: "/modpub/images2/" },
	{ hostname: "cdn.discordapp.com", pathnamePrefix: "/avatars/" },
	{ hostname: "cdn.discordapp.com", pathnamePrefix: "/embed/avatars/" },
];

/**
 * 画像 URL を正規化する。
 * プロトコル相対 URL（`//img.dlsite.jp/...`）と http:// を https:// に揃える。
 */
export function normalizeImageUrl(url: string): string {
	if (typeof url !== "string" || url.trim() === "") {
		return "";
	}
	if (url.startsWith("//")) {
		return `https:${url}`;
	}
	if (url.startsWith("http://")) {
		return url.replace("http://", "https://");
	}
	return url;
}

/**
 * 正規化済みの src を next/image に渡してよいか判定する。
 * data URI と自サイトの相対パスは常に可。リモート URL は許可パターンに一致した場合のみ可。
 */
export function isOptimizableImageSrc(src: string): boolean {
	if (typeof src !== "string" || src.trim() === "") {
		return false;
	}
	if (src.startsWith("data:")) {
		return true;
	}
	// 自サイトの相対パス（`//` はプロトコル相対 URL なので除外）
	if (src.startsWith("/") && !src.startsWith("//")) {
		return true;
	}

	let parsed: URL;
	try {
		parsed = new URL(src);
	} catch {
		return false;
	}
	if (parsed.protocol !== "https:") {
		return false;
	}
	return ALLOWED_IMAGE_PATTERNS.some(
		(pattern) =>
			pattern.hostname === parsed.hostname && parsed.pathname.startsWith(pattern.pathnamePrefix),
	);
}
