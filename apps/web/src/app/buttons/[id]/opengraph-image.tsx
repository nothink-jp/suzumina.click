import { getAudioButtonById } from "@/app/buttons/actions";
import { OgBadge, OgFooter } from "@/lib/og-branding";
import {
	OG_BACKGROUND as BACKGROUND,
	OG_MINASE_50 as MINASE_50,
	OG_MINASE_100 as MINASE_100,
	OG_MINASE_200 as MINASE_200,
	OG_MINASE_300 as MINASE_300,
	OG_MINASE_500 as MINASE_500,
	OG_MINASE_600 as MINASE_600,
	OG_MINASE_800 as MINASE_800,
	OG_MINASE_950 as MINASE_950,
	OG_MUTED_FOREGROUND as MUTED_FOREGROUND,
} from "@/lib/og-palette";
import { buildOgImageResponse, OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE } from "@/lib/og-response";
import {
	asciiOrEmpty,
	estimateTextWidth as estimateTextWidthShared,
	formatDisplayTitle,
	truncateWithEllipsis,
} from "@/lib/og-text";

/**
 * 音声ボタン詳細の動的 OG 画像（SPR-249 / デザインは Claude Design「音声ボタンOGP」1a 案）。
 * X のリンクカードは「画像 + 小タイトル + ドメイン」しか表示しないため（SPR-17 調査）、
 * サイトの AudioButton UI を再現したカードを画像中央に据え、「押せるボタン」であることを伝える。
 * og:image / twitter:image はこの規約ファイルから自動出力される（generateMetadata の images 手書きは撤去済み）。
 * どの失敗経路でも 500 は返さない（ボタン未取得→サイト名版 / フォント取得失敗→ASCII 縮退版）。
 */

export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;
export const alt = "涼花みなせ音声ボタン - すずみなくりっく！";

/** ボタン名の表示用整形。折り返し幅 750px × 4行に収まる長さへ末尾省略する */
export function truncateButtonText(text: string, max = 52): string {
	return truncateWithEllipsis(text, max);
}

/** テキストの概算描画幅（px）。lib/og-text の共通実装に委譲（詳細はそちらのコメント参照） */
export function estimateTextWidth(text: string, fontSize: number): number {
	return estimateTextWidthShared(text, fontSize);
}

/**
 * 元動画タイトルの表示用整形。フォントに無い絵文字（tofu 化する）を除去し、1行に収まる長さへ省略する
 */
export function formatVideoTitle(title: string, max = 40): string {
	return formatDisplayTitle(title, max);
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
	badgeLabel: string;
	buttonText: string;
	durationLabel: string;
	videoTitle: string;
	/** ASCII 縮退版（ブランドフォント無し）。署名の日本語サイト名を tofu 化させないため省略する */
	ascii?: boolean;
}

// AudioButton 再現カードの寸法（1200 - 左右 padding 64×2 = カード最大幅 1072。
// テキスト幅 = 1072 - dots 104 - border 8 - 内 padding 88 - 再生円 92 - gap 30 = 750）
const CARD_MAX_WIDTH = 1072;
const BUTTON_TEXT_MAX_WIDTH = 750;
const BUTTON_TEXT_FONT_SIZE = 56;

/** 1a 案レイアウト: ヘッダー + AudioButton 再現カード + メタ行 + 底部署名（通常版と ASCII 縮退版で共用。
 * 旧ヘッダー左のサイト名は底部署名（lib/og-branding.tsx の OgFooter）へ統一移動した） */
function OgCard({ badgeLabel, buttonText, durationLabel, videoTitle, ascii = false }: OgCardProps) {
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
			{/* ヘッダー: 音声ボタンピル（右寄せ） */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "flex-end",
					padding: "48px 64px 0",
				}}
			>
				<OgBadge label={badgeLabel} />
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

			{/* メタ行: 再生秒数ピル + 元動画タイトル（下に底部署名が続くため間隔を詰める） */}
			<div style={{ display: "flex", alignItems: "center", gap: 28, padding: "0 64px 28px" }}>
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

			<OgFooter ascii={ascii} />
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

	return buildOgImageResponse({
		size,
		// suzumina.click は底部署名（OgFooter）用
		boldText: `${heading}${durationLabel}すずみなくりっく！音声ボタンsuzumina.click`,
		// videoTitle が空（未設定・ボタン未取得のフォールバック経路）なら regular(400) のフェッチ自体を省く
		regularText: videoTitle || undefined,
		renderFallback: () => (
			<OgCard
				badgeLabel="SOUND BUTTON"
				buttonText={asciiOrEmpty(buttonText) || "suzumina.click"}
				durationLabel={durationSec != null ? `${durationSec.toFixed(1)}s` : ""}
				videoTitle=""
				ascii
			/>
		),
		renderFull: () => (
			<OgCard
				badgeLabel="音声ボタン"
				buttonText={heading}
				durationLabel={durationLabel}
				videoTitle={videoTitle}
			/>
		),
	});
}
