import { ImageResponse } from "next/og";
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

export async function buildOgImageResponse({
	size,
	boldText,
	regularText,
	renderFallback,
	renderFull,
}: BuildOgImageResponseParams): Promise<InstanceType<typeof ImageResponse>> {
	const fontBold = await loadMPlusRoundedSubset(700, boldText).catch(() => null);

	if (!fontBold) {
		return new ImageResponse(renderFallback(), { ...size });
	}

	const fontRegular = regularText
		? await loadMPlusRoundedSubset(400, regularText).catch(() => null)
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
