/**
 * テキスト主体のOG画像カード（SPR-268 段階導入③）。
 * サークル・クリエイターのように画像素材を持たないエンティティ向けの共通レイアウト。
 * app/circles/[circleId]/opengraph-image.tsx・app/creators/[creatorId]/opengraph-image.tsx で共用する。
 */

// 桜霞パレット（正本は packages/ui/src/styles/globals.css の :root。
// ImageResponse は CSS 変数を解決できないためライトモード値を転記している）
export const OG_BACKGROUND = "hsl(340, 40%, 99%)"; // --background（パール白）
export const OG_SUZUKA_50 = "hsl(342, 70%, 97%)";
export const OG_SUZUKA_100 = "hsl(341, 62%, 94%)";
export const OG_SUZUKA_500 = "hsl(340, 58%, 46%)";
export const OG_SUZUKA_700 = "hsl(339, 55%, 33%)";
export const OG_MINASE_800 = "hsl(27, 32%, 37%)";
export const OG_MUTED_FOREGROUND = "hsl(324, 8%, 40%)";

export interface TextOgCardProps {
	badgeLabel: string;
	name: string;
	subtitle: string;
	statLabel: string;
}

const NAME_MAX_WIDTH = 1000;

/** バッジ + 名称 + サブタイトル + 件数を中央揃えで構成するテキスト主体レイアウト */
export function TextOgCard({ badgeLabel, name, subtitle, statLabel }: TextOgCardProps) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				width: "100%",
				height: "100%",
				backgroundImage: `linear-gradient(160deg, ${OG_BACKGROUND} 55%, ${OG_SUZUKA_50} 100%)`,
				fontFamily: "M PLUS Rounded 1c",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					gap: 28,
					flexGrow: 1,
					padding: "0 64px",
				}}
			>
				<span
					style={{
						backgroundColor: OG_SUZUKA_100,
						color: OG_SUZUKA_700,
						fontWeight: 700,
						fontSize: 26,
						padding: "10px 32px",
						borderRadius: 9999,
					}}
				>
					{badgeLabel}
				</span>
				<div
					style={{
						display: "flex",
						alignSelf: "center",
						justifyContent: "center",
						width: NAME_MAX_WIDTH,
						textAlign: "center",
						fontWeight: 700,
						fontSize: 68,
						lineHeight: 1.3,
						color: OG_SUZUKA_500,
					}}
				>
					{name}
				</div>
				{subtitle && <span style={{ fontSize: 30, color: OG_MUTED_FOREGROUND }}>{subtitle}</span>}
				{statLabel && (
					<span style={{ fontWeight: 700, fontSize: 32, color: OG_MINASE_800 }}>{statLabel}</span>
				)}
			</div>

			<div
				style={{
					display: "flex",
					justifyContent: "center",
					paddingBottom: 26,
					fontWeight: 700,
					fontSize: 26,
					color: OG_MINASE_800,
				}}
			>
				suzumina.click
			</div>
			<div style={{ display: "flex", height: 14, flexShrink: 0, backgroundColor: OG_SUZUKA_500 }} />
		</div>
	);
}
