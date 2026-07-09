import { ImageResponse } from "next/og";
import { getAudioButtonById } from "@/app/buttons/actions";

/**
 * 音声ボタン詳細の動的 OG 画像（SPR-249 / デザインは Claude Design「音声ボタンOGP」1a 案）。
 * X のリンクカードは「画像 + 小タイトル + ドメイン」しか表示しないため（SPR-17 調査）、
 * サイトの AudioButton UI を再現したカードを画像中央に据え、「押せるボタン」であることを伝える。
 * og:image / twitter:image はこの規約ファイルから自動出力される（generateMetadata の images 手書きは撤去済み）。
 * どの失敗経路でも 500 は返さない（ボタン未取得→サイト名版 / フォント取得失敗→ASCII 縮退版）。
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "涼花みなせ音声ボタン - すずみなくりっく！";

// 桜霞パレット（正本は packages/ui/src/styles/globals.css の :root。
// ImageResponse は CSS 変数を解決できないためライトモード値を転記している）
const BACKGROUND = "hsl(340, 40%, 99%)"; // --background（パール白）
const SUZUKA_100 = "hsl(341, 62%, 94%)";
const SUZUKA_500 = "hsl(340, 58%, 46%)";
const SUZUKA_700 = "hsl(339, 55%, 33%)";
const MINASE_50 = "hsl(36, 50%, 97%)";
const MINASE_100 = "hsl(34, 44%, 93%)";
const MINASE_200 = "hsl(33, 40%, 86%)";
const MINASE_300 = "hsl(32, 38%, 79%)";
const MINASE_500 = "hsl(30, 38%, 66%)";
const MINASE_600 = "hsl(29, 36%, 56%)";
const MINASE_800 = "hsl(27, 32%, 37%)";
const MINASE_950 = "hsl(25, 28%, 18%)";
const MUTED_FOREGROUND = "hsl(324, 8%, 40%)";

/** ボタン名の表示用整形。折り返し幅 750px × 4行に収まる長さへ末尾省略する */
export function truncateButtonText(text: string, max = 52): string {
	return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * テキストの概算描画幅（px）。半角 ≈ 0.6em / 全角 ≈ 1.0em の粗い見積もり。
 * satori(Yoga) は auto 幅 flex の入れ子内でテキスト折り返し幅を解決できないため、
 * 「1行に収まらない場合だけ明示幅を与えて折り返す」判定に使う（正確な字幅計測は不要）
 */
export function estimateTextWidth(text: string, fontSize: number): number {
	let em = 0;
	for (const ch of text) {
		em += (ch.codePointAt(0) ?? 0) <= 0x024f ? 0.6 : 1.0;
	}
	return Math.round(em * fontSize);
}

/**
 * 元動画タイトルの表示用整形。フォントに無い絵文字（tofu 化する）を除去し、1行に収まる長さへ省略する
 */
export function formatVideoTitle(title: string, max = 40): string {
	const stripped = title
		.replace(/\p{Extended_Pictographic}|\u{FE0F}|\u{200D}/gu, "")
		.replace(/\s+/g, " ")
		.trim();
	return stripped.length > max ? `${stripped.slice(0, max)}…` : stripped;
}

/**
 * Google Fonts から表示文字だけの M PLUS Rounded 1c（ブランドフォント正）サブセットを取得する。
 * - ブラウザ UA を名乗らない fetch には woff2 でなく TTF が返るため ImageResponse でそのまま使える
 * - `text=` 付きの css2 は日英混在でも @font-face を1件だけ返す（unicode-range 分割なし。2026-07 実測）。
 *   万一失敗しても、呼び出し側の catch で ASCII 縮退版にフォールバックする
 */
async function loadMPlusRoundedSubset(weight: 400 | 700, text: string): Promise<ArrayBuffer> {
	const uniqueChars = [...new Set(text)].join("");
	const cssUrl = `https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@${weight}&text=${encodeURIComponent(uniqueChars)}`;
	const css = await (await fetch(cssUrl)).text();
	const fontUrl = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
	if (!fontUrl) {
		throw new Error("OG画像用フォントのサブセット取得に失敗しました");
	}
	return (await fetch(fontUrl)).arrayBuffer();
}

function PlayCircle() {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				width: 92,
				height: 92,
				flexShrink: 0,
				borderRadius: 9999,
				backgroundColor: MINASE_500,
			}}
		>
			<svg
				width="44"
				height="44"
				viewBox="0 0 24 24"
				fill="white"
				stroke="white"
				strokeWidth="2"
				strokeLinejoin="round"
				style={{ marginLeft: 6 }}
				aria-hidden="true"
			>
				<path d="m6 3 14 9-14 9V3z" />
			</svg>
		</div>
	);
}

function DotsIcon() {
	return (
		<svg width="44" height="44" viewBox="0 0 24 24" fill={MINASE_600} aria-hidden="true">
			<circle cx="5" cy="12" r="2.2" />
			<circle cx="12" cy="12" r="2.2" />
			<circle cx="19" cy="12" r="2.2" />
		</svg>
	);
}

function ClockIcon() {
	return (
		<svg
			width="26"
			height="26"
			viewBox="0 0 24 24"
			fill="none"
			stroke={MINASE_800}
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="10" />
			<path d="M12 6v6l4 2" />
		</svg>
	);
}

function VideoIcon() {
	return (
		<svg
			width="28"
			height="28"
			viewBox="0 0 24 24"
			fill="none"
			stroke={MUTED_FOREGROUND}
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="m22 8-6 4 6 4V8Z" />
			<rect x="2" y="6" width="14" height="12" rx="2" />
		</svg>
	);
}

interface OgCardProps {
	siteName: string;
	badgeLabel: string;
	buttonText: string;
	durationLabel: string;
	videoTitle: string;
}

// AudioButton 再現カードの寸法（1200 - 左右 padding 64×2 = カード最大幅 1072。
// テキスト幅 = 1072 - dots 104 - border 8 - 内 padding 88 - 再生円 92 - gap 30 = 750）
const CARD_MAX_WIDTH = 1072;
const BUTTON_TEXT_MAX_WIDTH = 750;
const BUTTON_TEXT_FONT_SIZE = 56;

/** 1a 案レイアウト: ヘッダー + AudioButton 再現カード + メタ行 + 底部バー（通常版と ASCII 縮退版で共用） */
function OgCard({ siteName, badgeLabel, buttonText, durationLabel, videoTitle }: OgCardProps) {
	// 1行に収まらない場合のみ明示幅を与えて折り返す（satori は auto 幅入れ子で折り返せない）
	const needsWrap = estimateTextWidth(buttonText, BUTTON_TEXT_FONT_SIZE) > BUTTON_TEXT_MAX_WIDTH;
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				width: "100%",
				height: "100%",
				backgroundColor: BACKGROUND,
				fontFamily: "M PLUS Rounded 1c",
			}}
		>
			{/* ヘッダー: サイト名 + 音声ボタンピル */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "48px 64px 0",
				}}
			>
				<span style={{ fontWeight: 700, fontSize: 36, color: SUZUKA_500 }}>{siteName}</span>
				<span
					style={{
						backgroundColor: SUZUKA_100,
						color: SUZUKA_700,
						fontWeight: 700,
						fontSize: 25,
						padding: "10px 30px",
						borderRadius: 9999,
					}}
				>
					{badgeLabel}
				</span>
			</div>

			{/* 中央: サイトの AudioButton を再現したカード */}
			<div
				style={{
					display: "flex",
					flexGrow: 1,
					alignItems: "center",
					justifyContent: "center",
					padding: "0 64px",
					minHeight: 0,
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "stretch",
						...(needsWrap ? { width: CARD_MAX_WIDTH } : {}),
						backgroundColor: MINASE_50,
						border: `4px solid ${MINASE_300}`,
						borderRadius: 32,
						boxShadow: "0 12px 40px hsla(30, 38%, 66%, 0.35)",
						overflow: "hidden",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 30,
							padding: "32px 44px",
							minWidth: 0,
						}}
					>
						<PlayCircle />
						<div
							style={{
								...(needsWrap ? { width: BUTTON_TEXT_MAX_WIDTH } : {}),
								fontWeight: 700,
								fontSize: BUTTON_TEXT_FONT_SIZE,
								lineHeight: 1.3,
								color: MINASE_950,
							}}
						>
							{buttonText}
						</div>
					</div>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							width: 104,
							flexShrink: 0,
							borderLeft: `3px solid ${MINASE_200}`,
						}}
					>
						<DotsIcon />
					</div>
				</div>
			</div>

			{/* メタ行: 再生秒数ピル + 元動画タイトル */}
			<div style={{ display: "flex", alignItems: "center", gap: 28, padding: "0 64px 44px" }}>
				{durationLabel && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 12,
							flexShrink: 0,
							backgroundColor: MINASE_100,
							borderRadius: 9999,
							padding: "10px 26px",
							fontWeight: 700,
							fontSize: 25,
							color: MINASE_800,
						}}
					>
						<ClockIcon />
						<span>{durationLabel}</span>
					</div>
				)}
				{videoTitle && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 14,
							minWidth: 0,
							flexGrow: 1,
							color: MUTED_FOREGROUND,
							fontSize: 25,
						}}
					>
						<VideoIcon />
						<span
							style={{
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap",
							}}
						>
							{videoTitle}
						</span>
					</div>
				)}
			</div>

			{/* 底部バー */}
			<div style={{ display: "flex", height: 14, flexShrink: 0, backgroundColor: SUZUKA_500 }} />
		</div>
	);
}

interface OgImageParams {
	params: Promise<{ id: string }>;
}

export default async function Image({ params }: OgImageParams) {
	const { id } = await params;

	// getAudioButtonById は withErrorHandling で例外を握り常に {success} を返すが、
	// OG 画像はどの経路でも 500 にしないルートなので念のため reject も null に落とす
	const result = await getAudioButtonById(id).catch(() => null);
	let buttonText = "";
	let durationSec: number | null = null;
	let videoTitle = "";
	if (result?.success) {
		buttonText = truncateButtonText(result.data.buttonText);
		durationSec = (result.data.endTime || result.data.startTime) - result.data.startTime;
		videoTitle = formatVideoTitle(result.data.videoTitle || "");
	}

	const heading = buttonText || "すずみなくりっく！";
	const durationLabel = durationSec != null ? `${durationSec.toFixed(1)}秒` : "";
	const boldText = `${heading}${durationLabel}すずみなくりっく！音声ボタン`;

	// フォント取得失敗でも 500 にしない: 内蔵デフォルトフォント（latin のみ）で ASCII 縮退版を描画。
	// ボタン名が ASCII ならそのまま表示を継続できる。regular(400) はメタ行専用なので欠けても bold で代替される
	const [fontBold, fontRegular] = await Promise.all([
		loadMPlusRoundedSubset(700, boldText).catch(() => null),
		// videoTitle が空（未設定・ボタン未取得のフォールバック経路）なら 400 のフェッチ自体を省く
		videoTitle ? loadMPlusRoundedSubset(400, videoTitle).catch(() => null) : Promise.resolve(null),
	]);

	if (!fontBold) {
		const asciiButtonText = /^[\x20-\x7E]+$/.test(buttonText) ? buttonText : "";
		return new ImageResponse(
			<OgCard
				siteName="suzumina.click"
				badgeLabel="SOUND BUTTON"
				buttonText={asciiButtonText || "suzumina.click"}
				durationLabel={durationSec != null ? `${durationSec.toFixed(1)}s` : ""}
				videoTitle=""
			/>,
			{ ...size },
		);
	}

	return new ImageResponse(
		<OgCard
			siteName="すずみなくりっく！"
			badgeLabel="音声ボタン"
			buttonText={heading}
			durationLabel={durationLabel}
			videoTitle={videoTitle}
		/>,
		{
			...size,
			fonts: [
				{ name: "M PLUS Rounded 1c", data: fontBold, weight: 700, style: "normal" },
				...(fontRegular && videoTitle
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
		},
	);
}
