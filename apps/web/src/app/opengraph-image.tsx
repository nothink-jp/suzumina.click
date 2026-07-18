import { OgBadge, OgFooter } from "@/lib/og-branding";
import {
	OG_BACKGROUND as BACKGROUND,
	OG_MINASE_400 as MINASE_400,
	OG_MUTED_FOREGROUND as MUTED_FOREGROUND,
	OG_SUZUKA_50 as SUZUKA_50,
	OG_SUZUKA_100 as SUZUKA_100,
	OG_SUZUKA_200 as SUZUKA_200,
	OG_SUZUKA_300 as SUZUKA_300,
	OG_SUZUKA_500 as SUZUKA_500,
} from "@/lib/og-palette";
import { buildOgImageResponse, OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE } from "@/lib/og-response";

/**
 * サイト共通のデフォルト OG 画像（SPR-171）。
 * 従来 layout.tsx が参照していた /opengraph-image.png・/twitter-image.png は実体が無く 404 だったため、
 * /buttons/[id] と同じ file-convention（ImageResponse）に統一して自動出力させる。
 * 個別の OG 画像を持たない全ページ（トップ・一覧・静的ページ・works/videos 等の詳細）がこの画像に
 * フォールバックする。フォント取得失敗でも 500 は返さない（ASCII 縮退版を描画）。
 */

export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;
export const alt = "すずみなくりっく！ - 涼花みなせ 非公式ファンサイト";

/** 桜の花（5枚花弁・先端に切れ込み）。装飾用の SVG で、satori がそのまま描画できる */
function SakuraBloom({
	blossomSize,
	color,
	style,
}: {
	blossomSize: number;
	color: string;
	style?: React.CSSProperties;
}) {
	return (
		<svg
			width={blossomSize}
			height={blossomSize}
			viewBox="0 0 36 36"
			style={style}
			aria-hidden="true"
		>
			{[0, 72, 144, 216, 288].map((deg) => (
				<path
					key={deg}
					d="M18 18 C13 12 13.5 5.5 16.5 3.5 L18 6 L19.5 3.5 C22.5 5.5 23 12 18 18 Z"
					fill={color}
					transform={`rotate(${deg} 18 18)`}
				/>
			))}
		</svg>
	);
}

interface DefaultOgCardProps {
	badgeLabel: string;
	title: string;
	tagline: string;
	/** ASCII 縮退版（ブランドフォント無し）。署名の日本語サイト名を tofu 化させないため省略する */
	ascii?: boolean;
}

/** 中央ブランドロックアップ + 桜装飾 + 底部署名（署名・バッジは lib/og-branding.tsx が正本） */
function DefaultOgCard({ badgeLabel, title, tagline, ascii = false }: DefaultOgCardProps) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				width: "100%",
				height: "100%",
				backgroundImage: `linear-gradient(160deg, ${BACKGROUND} 55%, ${SUZUKA_50} 100%)`,
				fontFamily: "M PLUS Rounded 1c",
			}}
		>
			{/* 装飾: 桜の花を四隅に散らす（読みやすさを損なわない淡色のみ） */}
			<SakuraBloom
				blossomSize={300}
				color={SUZUKA_100}
				style={{ position: "absolute", top: -70, right: -60, transform: "rotate(18deg)" }}
			/>
			<SakuraBloom
				blossomSize={170}
				color={SUZUKA_200}
				style={{ position: "absolute", top: 120, right: 190, transform: "rotate(-12deg)" }}
			/>
			<SakuraBloom
				blossomSize={230}
				color={SUZUKA_200}
				style={{ position: "absolute", bottom: -50, left: -50, transform: "rotate(30deg)" }}
			/>
			<SakuraBloom
				blossomSize={110}
				color={MINASE_400}
				style={{ position: "absolute", bottom: 150, left: 170, transform: "rotate(-20deg)" }}
			/>
			<SakuraBloom
				blossomSize={90}
				color={SUZUKA_300}
				style={{ position: "absolute", top: 60, left: 90, transform: "rotate(45deg)" }}
			/>

			{/* 中央: バッジ + サイト名 + キャッチコピー */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					gap: 34,
					flexGrow: 1,
				}}
			>
				<OgBadge label={badgeLabel} />
				<span style={{ fontWeight: 700, fontSize: 104, color: SUZUKA_500 }}>{title}</span>
				<span style={{ fontWeight: 700, fontSize: 32, color: MUTED_FOREGROUND }}>{tagline}</span>
			</div>

			<OgFooter ascii={ascii} />
		</div>
	);
}

export default async function Image() {
	const texts = {
		badgeLabel: "涼花みなせ 非公式ファンサイト",
		title: "すずみなくりっく！",
		tagline: "音声ボタン・動画・DLsite作品情報",
	};

	return buildOgImageResponse({
		size,
		// suzumina.click は底部署名（OgFooter）用
		boldText: `${texts.badgeLabel}${texts.title}${texts.tagline}suzumina.click`,
		renderFallback: () => (
			<DefaultOgCard
				badgeLabel="Suzuka Minase Fan Site"
				title="suzumina.click"
				tagline="Sound buttons / Videos / Works"
				ascii
			/>
		),
		renderFull: () => <DefaultOgCard {...texts} />,
	});
}
