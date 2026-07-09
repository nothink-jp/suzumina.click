import { ImageResponse } from "next/og";
import { getAudioButtonById } from "@/app/buttons/actions";

/**
 * 音声ボタン詳細の動的 OG 画像（SPR-249）。
 * X のリンクカードは「画像 + 小タイトル + ドメイン」しか表示しないため（SPR-17 調査）、
 * 「音声ボタンである」こと・ボタン名を画像自体に載せる。
 * og:image / twitter:image はこの規約ファイルから自動出力される（generateMetadata の images 手書きは撤去済み）。
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "涼花みなせ音声ボタン - すずみなくりっく！";

// 桜霞パレット（正本は packages/ui/src/styles/globals.css の :root。
// ImageResponse は CSS 変数を解決できないためライトモード値を転記している）
const SUZUKA_500 = "hsl(340, 58%, 46%)";
const SUZUKA_700 = "hsl(339, 55%, 33%)";
const MINASE_50 = "hsl(36, 50%, 97%)";
const MINASE_200 = "hsl(33, 40%, 86%)";
const MINASE_600 = "hsl(29, 36%, 56%)";
const MINASE_950 = "hsl(25, 28%, 18%)";

/** ボタン名の表示用整形。長すぎる場合は末尾を省略する */
export function truncateButtonText(text: string, max = 60): string {
	return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** ボタン名の長さに応じたフォントサイズ（px） */
export function buttonTextFontSize(text: string): number {
	if (text.length <= 15) return 76;
	if (text.length <= 30) return 60;
	return 44;
}

/**
 * Google Fonts から表示文字だけの Noto Sans JP サブセットを取得する。
 * ブラウザ UA を名乗らない fetch には woff2 でなく TTF が返るため ImageResponse でそのまま使える。
 */
async function loadNotoSansJpSubset(text: string): Promise<ArrayBuffer> {
	const uniqueChars = [...new Set(text)].join("");
	const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(uniqueChars)}`;
	const css = await (await fetch(cssUrl)).text();
	const fontUrl = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
	if (!fontUrl) {
		throw new Error("OG画像用フォントのサブセット取得に失敗しました");
	}
	return (await fetch(fontUrl)).arrayBuffer();
}

function PlayIcon() {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				width: 88,
				height: 88,
				borderRadius: 9999,
				backgroundColor: SUZUKA_500,
			}}
		>
			<svg width="36" height="40" viewBox="0 0 18 20" aria-hidden="true">
				<path d="M2 1.5 L16.5 10 L2 18.5 Z" fill="white" />
			</svg>
		</div>
	);
}

interface OgImageParams {
	params: Promise<{ id: string }>;
}

export default async function Image({ params }: OgImageParams) {
	const { id } = await params;

	let buttonText = "";
	let durationLabel = "";
	try {
		const result = await getAudioButtonById(id);
		if (result.success) {
			const button = result.data;
			buttonText = truncateButtonText(button.buttonText);
			const duration = (button.endTime || button.startTime) - button.startTime;
			durationLabel = `${duration.toFixed(1)}秒`;
		}
	} catch {
		// ボタン未取得時はサイト名だけのフォールバック画像を返す（画像 500 でカード無画像になるより良い）
	}

	const heading = buttonText ? `「${buttonText}」` : "すずみなくりっく！";
	const fontText = `${heading}${durationLabel}涼花みなせ音声ボタンすずみなくりっく！suzumina.click`;
	const notoSansJp = await loadNotoSansJpSubset(fontText);

	return new ImageResponse(
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				width: "100%",
				height: "100%",
				padding: 64,
				backgroundColor: MINASE_50,
				borderBottom: `20px solid ${SUZUKA_500}`,
				fontFamily: "Noto Sans JP",
			}}
		>
			{/* ヘッダー: 再生アイコン + ラベル */}
			<div style={{ display: "flex", alignItems: "center", gap: 28 }}>
				<PlayIcon />
				<div style={{ display: "flex", flexDirection: "column" }}>
					<span style={{ fontSize: 34, color: SUZUKA_700 }}>涼花みなせ 音声ボタン</span>
					{durationLabel && (
						<span style={{ fontSize: 28, color: MINASE_600 }}>{durationLabel}</span>
					)}
				</div>
			</div>

			{/* ボタン名 */}
			<div
				style={{
					display: "flex",
					flexGrow: 1,
					alignItems: "center",
					fontSize: buttonText ? buttonTextFontSize(buttonText) : 76,
					fontWeight: 700,
					color: MINASE_950,
					lineHeight: 1.35,
					wordBreak: "break-all",
				}}
			>
				{heading}
			</div>

			{/* フッター: サイトブランド */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					borderTop: `2px solid ${MINASE_200}`,
					paddingTop: 28,
				}}
			>
				<span style={{ fontSize: 36, fontWeight: 700, color: SUZUKA_500 }}>すずみなくりっく！</span>
				<span style={{ fontSize: 30, color: MINASE_600 }}>suzumina.click</span>
			</div>
		</div>,
		{
			...size,
			fonts: [{ name: "Noto Sans JP", data: notoSansJp, weight: 700, style: "normal" }],
		},
	);
}
