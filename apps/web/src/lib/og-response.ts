import { ImageResponse } from "next/og";
import { warn } from "@/lib/logger";
import { loadMPlusRoundedSubset } from "@/lib/og-font";

/**
 * OG 画像（ImageResponse）のフォント取得＋フォールバック構築を共通化するヘルパ。
 * app/opengraph-image.tsx・app/buttons/[id]・app/works/[workId]・app/videos/[videoId]・
 * app/circles/[circleId]・app/creators/[creatorId] の opengraph-image.tsx で共用する
 * （SPR-268 全ルート完了時点でのレビュー指摘対応。フォント成功/失敗の分岐がルートごとに
 * 複製されていたため一箇所に集約した）。
 * ブランドフォント取得失敗でも 500 を返さない（ASCII 縮退版を描画）という各ルート共通の方針を、
 * ここで一度だけ実装する。
 */

/**
 * OG 画像の共通寸法（X card 等の推奨サイズ）。全 opengraph-image.tsx の
 * `export const size` / `export const contentType` はこの値を再輸出する
 * （Next.js の file-convention 上、各ルートで直接 export する必要があるため定数化のみ）
 */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 };
export const OG_IMAGE_CONTENT_TYPE = "image/png";

interface BuildOgImageResponseParams {
	size: { width: number; height: number };
	/** M PLUS Rounded 1c bold(700) サブセット取得に使う文字列（表示に使う全文字を含める） */
	boldText: string;
	/** regular(400) を使わないルートでは省略してよい */
	regularText?: string;
	/** ブランドフォント取得失敗時に描画する ASCII 縮退版の JSX */
	renderFallback: () => React.ReactElement;
	/** 通常時に描画する JSX */
	renderFull: () => React.ReactElement;
}

/**
 * ブランドフォント取得の失敗を観測可能にしたうえで null に畳む。
 *
 * ここを無言で握りつぶすと「OG 画像がどのくらいの頻度で縮退しているか」が測れず、
 * Google Fonts への runtime 依存を続けるか、フルフォント同梱（実測 6.59MB）に倒すかの
 * 判断材料が永久に得られない。`error` には HTTP ステータス / シグネチャ不正 / タイムアウトの
 * どれで落ちたかが入るため、原因別の切り分けもログだけで済む。
 *
 * `message` と `alert` は log-based メトリクスのフィルタ対象になる契約なので英語で固定する
 * （CLAUDE.md §1）。options を必ず渡すのは、引数なし呼び出しだと jsonPayload に残らず
 * textPayload へ昇格してしまい構造化フィールドで絞り込めなくなるため
 */
async function loadFontOrLogFallback(
	weight: 400 | 700,
	text: string,
	degradation: "ascii_fallback" | "bold_only",
): Promise<ArrayBuffer | null> {
	try {
		return await loadMPlusRoundedSubset(weight, text);
	} catch (err) {
		warn("OG image brand font unavailable", {
			alert: "og_font_fallback",
			font_weight: weight,
			degradation,
			error: err,
		});
		return null;
	}
}

export async function buildOgImageResponse({
	size,
	boldText,
	regularText,
	renderFallback,
	renderFull,
}: BuildOgImageResponseParams): Promise<InstanceType<typeof ImageResponse>> {
	// bold の失敗は全面 ASCII 縮退、regular の失敗は bold のみでの描画と影響範囲が違うため区別する
	const fontBold = await loadFontOrLogFallback(700, boldText, "ascii_fallback");

	if (!fontBold) {
		return new ImageResponse(renderFallback(), { ...size });
	}

	const fontRegular = regularText
		? await loadFontOrLogFallback(400, regularText, "bold_only")
		: null;

	return new ImageResponse(renderFull(), {
		...size,
		fonts: [
			{ name: "M PLUS Rounded 1c", data: fontBold, weight: 700, style: "normal" },
			...(fontRegular
				? [
						{
							name: "M PLUS Rounded 1c",
							data: fontRegular,
							weight: 400 as const,
							style: "normal" as const,
						},
					]
				: []),
		],
	});
}
