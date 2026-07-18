import { cacheLife } from "next/cache";

/**
 * OG 画像（ImageResponse / satori）向けのリモート画像取得ヘルパ。
 * app/works/[workId]/opengraph-image.tsx・app/videos/[videoId]/opengraph-image.tsx（SPR-268）で共用する。
 */

/**
 * URL 単位で取得結果（data URI）を約1日キャッシュする。ジャケット/サムネイルの差し替えは稀で、
 * 元ページの OG カード鮮度（days）と揃える。取得失敗は throw で抜けてキャッシュに残さない
 * （キャッシュされるのは成功した data URI のみ。失敗の握りつぶしは呼び出し側で行う）
 */
async function fetchImageDataUri(url: string): Promise<string> {
	"use cache";
	cacheLife("days");
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`OG画像用のリモート画像取得に失敗しました: ${res.status}`);
	}
	const buffer = await res.arrayBuffer();
	const base64 = Buffer.from(buffer).toString("base64");
	const contentType = res.headers.get("content-type") || "image/jpeg";
	return `data:${contentType};base64,${base64}`;
}

/**
 * 許可ホストの画像を data URI として取得する。取得・変換に失敗しても null を返すのみで例外を投げない
 * （satori はネットワーク不安定な remote src の直接指定より、埋め込み済み data URI の方が安定するため事前取得する）。
 * allowedHostnames は next.config.mjs の images.remotePatterns と揃える（値自体はスクレイパー/外部API
 * 由来でユーザー入力ではないが、fetch する経路である以上 next/image と同じホスト制約を明示しておく）
 */
export async function loadRemoteImageDataUri(
	url: string,
	allowedHostnames: readonly string[],
): Promise<string | null> {
	try {
		if (!allowedHostnames.includes(new URL(url).hostname)) return null;
		return await fetchImageDataUri(url);
	} catch {
		return null;
	}
}
