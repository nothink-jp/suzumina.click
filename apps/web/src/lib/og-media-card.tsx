import { OgBadge, OgFooter } from "@/lib/og-branding";
import {
	OG_BACKGROUND,
	OG_MINASE_300,
	OG_MINASE_950,
	OG_MUTED_FOREGROUND,
	OG_SUZUKA_500,
} from "@/lib/og-palette";

/**
 * 画像（ジャケット/サムネイル）+ タイトル + 2行のメタ情報の2カラムレイアウト。
 * app/works/[workId]/opengraph-image.tsx・app/videos/[videoId]/opengraph-image.tsx で共用する
 * （両ルートの OgCard がジャケット/サムネイルの差異以外ほぼ同一だったため SPR-268 完了時点で統合）。
 * 通常版と ASCII 縮退版の両方でこのコンポーネントを使う。署名・バッジは lib/og-branding.tsx が正本。
 */

const DEFAULT_EMPHASIS_FONT_SIZE = 30;

export interface MediaOgCardProps {
	badgeLabel: string;
	title: string;
	/** タイトル列の折り返し幅（px）。画像幅に応じてルート側で計算する */
	titleMaxWidth: number;
	titleFontSize: number;
	imageDataUri: string | null;
	imageWidth: number;
	imageHeight: number;
	/** 淡色・通常ウェイトの補足行（サークル名・チャンネル名等）。空文字なら非表示 */
	secondaryLine?: string;
	/** 強調行（価格・再生時間等）。空文字なら非表示 */
	emphasisLine?: string;
	emphasisFontSize?: number;
	/** ASCII 縮退版（ブランドフォント無し）。署名の日本語サイト名を tofu 化させないため省略する */
	ascii?: boolean;
}

export function MediaOgCard({
	badgeLabel,
	title,
	titleMaxWidth,
	titleFontSize,
	imageDataUri,
	imageWidth,
	imageHeight,
	secondaryLine,
	emphasisLine,
	emphasisFontSize = DEFAULT_EMPHASIS_FONT_SIZE,
	ascii = false,
}: MediaOgCardProps) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				width: "100%",
				height: "100%",
				backgroundColor: OG_BACKGROUND,
				fontFamily: "M PLUS Rounded 1c",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 56,
					flexGrow: 1,
					padding: "56px 64px 0",
				}}
			>
				{imageDataUri && (
					// biome-ignore lint/performance/noImgElement: ImageResponse(satori) は next/image を使えないため生 img 必須
					<img
						src={imageDataUri}
						alt=""
						width={imageWidth}
						height={imageHeight}
						style={{
							borderRadius: 24,
							border: `4px solid ${OG_MINASE_300}`,
							boxShadow: "0 12px 40px hsla(30, 38%, 66%, 0.35)",
							objectFit: "cover",
							flexShrink: 0,
						}}
					/>
				)}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 22,
						minWidth: 0,
					}}
				>
					<OgBadge label={badgeLabel} style={{ alignSelf: "flex-start" }} />
					<div
						style={{
							width: titleMaxWidth,
							fontWeight: 700,
							fontSize: titleFontSize,
							lineHeight: 1.35,
							color: OG_MINASE_950,
						}}
					>
						{title}
					</div>
					{secondaryLine && (
						<span style={{ fontSize: 28, color: OG_MUTED_FOREGROUND }}>{secondaryLine}</span>
					)}
					{emphasisLine && (
						<span style={{ fontWeight: 700, fontSize: emphasisFontSize, color: OG_SUZUKA_500 }}>
							{emphasisLine}
						</span>
					)}
				</div>
			</div>

			<OgFooter ascii={ascii} />
		</div>
	);
}
