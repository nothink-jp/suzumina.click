import { cacheLife } from "next/cache";

/**
 * OG 画像（ImageResponse）用のブランドフォント取得ヘルパ。
 * app/opengraph-image.tsx（サイト既定・SPR-171）と app/buttons/[id]/opengraph-image.tsx（SPR-249）で共用する。
 */

/**
 * Google Fonts から表示文字だけの M PLUS Rounded 1c（ブランドフォント正）サブセットを取得する。
 * - ブラウザ UA を名乗らない fetch には woff2 でなく TTF が返るため ImageResponse でそのまま使える
 * - `text=` 付きの css2 は日英混在でも @font-face を1件だけ返す（unicode-range 分割なし。2026-07 実測）。
 *   万一失敗しても、呼び出し側の catch で ASCII 縮退版にフォールバックする
 * - `use cache`（cacheComponents）で (weight, text) 単位にキャッシュする。同一文字集合のサブセットは
 *   不変なので `max` プロファイル。これによりリクエスト毎の Google Fonts 2連続 fetch を排除し、
 *   完全静的な app/opengraph-image.tsx はビルド時 prerender（静的化）が可能になる。
 *   取得失敗は throw で抜ける（エラーはキャッシュされず、次アクセスで再試行される）
 */
export async function loadMPlusRoundedSubset(
	weight: 400 | 700,
	text: string,
): Promise<ArrayBuffer> {
	"use cache";
	cacheLife("max");
	const uniqueChars = [...new Set(text)].join("");
	const cssUrl = `https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@${weight}&text=${encodeURIComponent(uniqueChars)}`;
	const css = await (await fetch(cssUrl)).text();
	const fontUrl = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
	if (!fontUrl) {
		throw new Error("OG画像用フォントのサブセット取得に失敗しました");
	}
	return (await fetch(fontUrl)).arrayBuffer();
}
