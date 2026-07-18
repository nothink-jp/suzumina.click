import { ImageResponse } from "next/og";
import { loadMPlusRoundedSubset } from "@/lib/og-font";

/**
 * サイト共通のデフォルト OG 画像（SPR-171）。
 * 従来 layout.tsx が参照していた /opengraph-image.png・/twitter-image.png は実体が無く 404 だったため、
 * /buttons/[id] と同じ file-convention（ImageResponse）に統一して自動出力させる。
 * 個別の OG 画像を持たない全ページ（トップ・一覧・静的ページ・works/videos 等の詳細）がこの画像に
 * フォールバックする。フォント取得失敗でも 500 は返さない（ASCII 縮退版を描画）。
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "すずみなくりっく！ - 涼花みなせ 非公式ファンサイト";

// 桜霞パレット（正本は packages/ui/src/styles/globals.css の :root。
// ImageResponse は CSS 変数を解決できないためライトモード値を転記している）
const BACKGROUND = "hsl(340, 40%, 99%)"; // --background（パール白）
const SUZUKA_50 = "hsl(342, 70%, 97%)";
const SUZUKA_100 = "hsl(341, 62%, 94%)";
const SUZUKA_200 = "hsl(340, 54%, 88%)";
const SUZUKA_300 = "hsl(339, 50%, 79%)";
const SUZUKA_500 = "hsl(340, 58%, 46%)";
const SUZUKA_700 = "hsl(339, 55%, 33%)";
const MINASE_400 = "hsl(31, 38%, 73%)";
const MINASE_800 = "hsl(27, 32%, 37%)";
const MUTED_FOREGROUND = "hsl(324, 8%, 40%)";

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
	domain: string;
}

/** 中央ブランドロックアップ + 桜装飾 + 底部バー（/buttons/[id] の OG と視覚言語を揃える） */
function DefaultOgCard({ badgeLabel, title, tagline, domain }: DefaultOgCardProps) {
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
				<span
					style={{
						backgroundColor: SUZUKA_100,
						color: SUZUKA_700,
						fontWeight: 700,
						fontSize: 28,
						padding: "12px 36px",
						borderRadius: 9999,
					}}
				>
					{badgeLabel}
				</span>
				<span style={{ fontWeight: 700, fontSize: 104, color: SUZUKA_500 }}>{title}</span>
				<span style={{ fontWeight: 700, fontSize: 32, color: MUTED_FOREGROUND }}>{tagline}</span>
			</div>

			{/* 底部: ドメイン + suzuka バー（/buttons/[id] の OG と共通の締め） */}
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					paddingBottom: 26,
					fontWeight: 700,
					fontSize: 26,
					color: MINASE_800,
				}}
			>
				{domain}
			</div>
			<div style={{ display: "flex", height: 14, flexShrink: 0, backgroundColor: SUZUKA_500 }} />
		</div>
	);
}

export default async function Image() {
	const texts = {
		badgeLabel: "涼花みなせ 非公式ファンサイト",
		title: "すずみなくりっく！",
		tagline: "音声ボタン・動画・DLsite作品情報",
		domain: "suzumina.click",
	};

	// フォント取得失敗でも 500 にしない: 内蔵デフォルトフォント（latin のみ）で ASCII 縮退版を描画
	const fontBold = await loadMPlusRoundedSubset(
		700,
		`${texts.badgeLabel}${texts.title}${texts.tagline}${texts.domain}`,
	).catch(() => null);

	if (!fontBold) {
		return new ImageResponse(
			<DefaultOgCard
				badgeLabel="Suzuka Minase Fan Site"
				title="suzumina.click"
				tagline="Sound buttons / Videos / Works"
				domain="suzumina.click"
			/>,
			{ ...size },
		);
	}

	return new ImageResponse(<DefaultOgCard {...texts} />, {
		...size,
		fonts: [{ name: "M PLUS Rounded 1c", data: fontBold, weight: 700, style: "normal" }],
	});
}
