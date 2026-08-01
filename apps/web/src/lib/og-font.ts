import { cacheLife } from "next/cache";

/**
 * OG 画像（ImageResponse）用のブランドフォント取得ヘルパ。
 * app/opengraph-image.tsx（サイト既定・SPR-171）と app/buttons/[id]/opengraph-image.tsx（SPR-249）で共用する。
 */

/**
 * フォント取得の待ち上限。ハングを P95 レイテンシに乗せず ASCII 縮退版へ早期フォールバックさせる。
 *
 * これは **loadMPlusRoundedSubset 1 回あたりの合計**（css2 とバイナリの 2 fetch で 1 つの
 * deadline を共有する）。fetch ごとに独立したタイムアウトを張ると上限が 2 倍になる。
 * さらに og-response.ts は bold / regular で本関数を 2 回逐次呼ぶため、
 * OG 画像 1 枚の最悪値は 3s × 2 = 6s。high_latency アラートの閾値 10s の内側に収める意図。
 * 実測の所要は 102〜262ms（css2 45-188ms + バイナリ 53-74ms）なので 3s でも 10 倍以上の余裕がある
 */
const FONT_FETCH_TIMEOUT_MS = 3000;

/**
 * sfnt（TTF/OTF）コンテナの先頭4バイト。satori はこれ以外を
 * `Unsupported OpenType signature` で弾くため、描画前にここで検査する
 */
const SFNT_SIGNATURES = new Set([
	0x00010000, // TrueType outlines
	0x74727565, // 'true'（Apple TrueType）
	0x74746366, // 'ttcf'（TrueType Collection）
	0x4f54544f, // 'OTTO'（CFF outlines）
]);

/**
 * 2xx 以外を例外にして返す fetch。
 * `res.ok` を見ないと、エラー HTML が `arrayBuffer()` で「成功」してしまい
 * 呼び出し側の縮退フォールバックを素通りする（本番 503 の実績あり）
 */
async function fetchFontResource(
	url: string,
	label: string,
	signal: AbortSignal,
): Promise<Response> {
	const res = await fetch(url, { signal });
	if (!res.ok) {
		throw new Error(`OG画像用フォントの${label}取得に失敗しました (HTTP ${res.status})`);
	}
	return res;
}

function isSfntBinary(buffer: ArrayBuffer): boolean {
	if (buffer.byteLength < 4) {
		return false;
	}
	return SFNT_SIGNATURES.has(new DataView(buffer).getUint32(0, false));
}

/**
 * Google Fonts から表示文字だけの M PLUS Rounded 1c（ブランドフォント正）サブセットを取得する。
 * - ブラウザ UA を名乗らない fetch には woff2 でなく TTF が返るため ImageResponse でそのまま使える
 * - `text=` 付きの css2 は日英混在でも @font-face を1件だけ返す（unicode-range 分割なし。2026-07 実測）。
 *   万一失敗しても、呼び出し側の catch で ASCII 縮退版にフォールバックする
 * - `use cache`（cacheComponents）で (weight, text) 単位にキャッシュする。同一文字集合のサブセットは
 *   不変なので `max` プロファイル。これによりリクエスト毎の Google Fonts 2連続 fetch を排除し、
 *   完全静的な app/opengraph-image.tsx はビルド時 prerender（静的化）が可能になる。
 *   取得失敗は throw で抜ける（エラーはキャッシュされず、次アクセスで再試行される）
 *
 * 失敗を必ず throw に寄せるのが要点。HTTP ステータスとフォントシグネチャを検査せずに
 * `arrayBuffer()` の結果をそのまま返すと、エラー HTML が「成功した非 null の戻り値」として
 * `cacheLife("max")` で恒久キャッシュされ、satori が描画中に落ちて Cloud Run が 503 を返す
 * （2026-08-01 の高レイテンシアラート発火源。`/works/[workId]/opengraph-image`）
 */
export async function loadMPlusRoundedSubset(
	weight: 400 | 700,
	text: string,
): Promise<ArrayBuffer> {
	"use cache";
	cacheLife("max");
	// 2 fetch で 1 つの deadline を共有する。呼び出し側から signal を渡す設計は採れない
	// （"use cache" の引数は直列化可能でなければキャッシュキーが壊れる）ため関数内で生成する
	const deadline = AbortSignal.timeout(FONT_FETCH_TIMEOUT_MS);
	const uniqueChars = [...new Set(text)].join("");
	const cssUrl = `https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@${weight}&text=${encodeURIComponent(uniqueChars)}`;
	const css = await (await fetchFontResource(cssUrl, "css2", deadline)).text();
	const fontUrl = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
	if (!fontUrl) {
		throw new Error("OG画像用フォントのサブセット取得に失敗しました");
	}
	const fontData = await (await fetchFontResource(fontUrl, "バイナリ", deadline)).arrayBuffer();
	if (!isSfntBinary(fontData)) {
		throw new Error("OG画像用フォントの取得結果がフォントバイナリではありません");
	}
	return fontData;
}
