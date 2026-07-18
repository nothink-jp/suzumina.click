/**
 * テキスト主体のOG画像カード（SPR-268 段階導入③）。
 * サークル・クリエイターのように画像素材を持たないエンティティ向けの共通レイアウト。
 * app/circles/[circleId]/opengraph-image.tsx・app/creators/[creatorId]/opengraph-image.tsx で共用する。
 * 署名・バッジは lib/og-branding.tsx が正本。
 */

import { OgBadge, OgFooter } from "@/lib/og-branding";
import {
	OG_BACKGROUND,
	OG_MINASE_800,
	OG_MUTED_FOREGROUND,
	OG_SUZUKA_50,
	OG_SUZUKA_500,
} from "@/lib/og-palette";

export interface TextOgCardProps {
	badgeLabel: string;
	name: string;
	subtitle: string;
	statLabel: string;
	/** ASCII 縮退版（ブランドフォント無し）。署名の日本語サイト名を tofu 化させないため省略する */
	ascii?: boolean;
}

const NAME_MAX_WIDTH = 1000;

/** バッジ + 名称 + サブタイトル + 件数を中央揃えで構成するテキスト主体レイアウト */
export function TextOgCard({
	badgeLabel,
	name,
	subtitle,
	statLabel,
	ascii = false,
}: TextOgCardProps) {
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
				<OgBadge label={badgeLabel} />
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

			<OgFooter ascii={ascii} />
		</div>
	);
}
