import { ImageResponse } from "next/og";
import { getWorkById } from "@/app/works/actions";
import { loadMPlusRoundedSubset } from "@/lib/og-font";
import { estimateTextWidth, formatDisplayTitle, truncateWithEllipsis } from "@/lib/og-text";

/**
 * DLsite作品詳細の動的 OG 画像（SPR-268 / /buttons/[id] の opengraph-image と同じ file-convention パターン）。
 * X のリンクカードは「画像 + 小タイトル + ドメイン」しか表示しないため（SPR-17 調査）、
 * 作品ジャケット + タイトル + サークル名 + 価格を画像内に構成し、カード単体で内容が伝わるようにする。
 * og:image / twitter:image はこの規約ファイルから自動出力される（generateMetadata の images 手書きはしない）。
 * どの失敗経路でも 500 は返さない（作品未取得→サイト名版 / ジャケット取得失敗→ジャケット無し版 / フォント取得失敗→ASCII 縮退版）。
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "DLsite作品情報 - すずみなくりっく！";

// 桜霞パレット（正本は packages/ui/src/styles/globals.css の :root。
// ImageResponse は CSS 変数を解決できないためライトモード値を転記している）
const BACKGROUND = "hsl(340, 40%, 99%)"; // --background（パール白）
const SUZUKA_100 = "hsl(341, 62%, 94%)";
const SUZUKA_500 = "hsl(340, 58%, 46%)";
const SUZUKA_700 = "hsl(339, 55%, 33%)";
const MINASE_300 = "hsl(32, 38%, 79%)";
const MINASE_800 = "hsl(27, 32%, 37%)";
const MINASE_950 = "hsl(25, 28%, 18%)";
const MUTED_FOREGROUND = "hsl(324, 8%, 40%)";

const TITLE_MAX_WIDTH = 620;
const TITLE_FONT_SIZE = 48;

/**
 * ジャケット画像を data URI として取得する。取得・変換に失敗しても null を返すのみで例外を投げない
 * （satori はネットワーク不安定な remote src の直接指定より、埋め込み済み data URI の方が安定するため事前取得する）
 */
async function loadJacketDataUri(url: string): Promise<string | null> {
	try {
		const res = await fetch(url);
		if (!res.ok) return null;
		const buffer = await res.arrayBuffer();
		const base64 = Buffer.from(buffer).toString("base64");
		const contentType = res.headers.get("content-type") || "image/jpeg";
		return `data:${contentType};base64,${base64}`;
	} catch {
		return null;
	}
}

interface OgCardProps {
	badgeLabel: string;
	title: string;
	circle: string;
	price: string;
	jacketDataUri: string | null;
}

/** ジャケット + タイトル/サークル/価格の2カラムレイアウト（通常版と縮退版で共用） */
function OgCard({ badgeLabel, title, circle, price, jacketDataUri }: OgCardProps) {
	const needsWrap = estimateTextWidth(title, TITLE_FONT_SIZE) > TITLE_MAX_WIDTH;
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
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 56,
					flexGrow: 1,
					padding: "56px 64px 0",
				}}
			>
				{jacketDataUri && (
					// biome-ignore lint/performance/noImgElement: ImageResponse(satori) は next/image を使えないため生 img 必須
					<img
						src={jacketDataUri}
						alt=""
						width={420}
						height={315}
						style={{
							borderRadius: 24,
							border: `4px solid ${MINASE_300}`,
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
					<span
						style={{
							alignSelf: "flex-start",
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
					<div
						style={{
							...(needsWrap ? { width: TITLE_MAX_WIDTH } : {}),
							fontWeight: 700,
							fontSize: TITLE_FONT_SIZE,
							lineHeight: 1.35,
							color: MINASE_950,
						}}
					>
						{title}
					</div>
					<span style={{ fontSize: 28, color: MUTED_FOREGROUND }}>{circle}</span>
					<span style={{ fontWeight: 700, fontSize: 34, color: SUZUKA_500 }}>{price}</span>
				</div>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 64px 40px" }}>
				<span style={{ fontWeight: 700, fontSize: 30, color: SUZUKA_500 }}>すずみなくりっく！</span>
				<span style={{ fontSize: 22, color: MINASE_800 }}>suzumina.click</span>
			</div>

			<div style={{ display: "flex", height: 14, flexShrink: 0, backgroundColor: SUZUKA_500 }} />
		</div>
	);
}

interface OgImageParams {
	params: Promise<{ workId: string }>;
}

export default async function Image({ params }: OgImageParams) {
	const { workId } = await params;

	const work = await getWorkById(workId).catch(() => null);

	const title = work ? formatDisplayTitle(work.title, 44) : "すずみなくりっく！";
	const circle = work ? truncateWithEllipsis(work.circle, 30) : "";
	const price = work ? work.price.formattedPrice : "";
	const jacketUrl = work?.highResImageUrl || work?.thumbnailUrl || null;
	const jacketDataUri = jacketUrl ? await loadJacketDataUri(jacketUrl) : null;

	const fontBold = await loadMPlusRoundedSubset(700, `${title}DLsite作品すずみなくりっく！`).catch(
		() => null,
	);
	const fontRegular = await loadMPlusRoundedSubset(400, `${circle}${price}suzumina.click`).catch(
		() => null,
	);

	if (!fontBold) {
		const asciiTitle = /^[\x20-\x7E]+$/.test(title) ? title : "";
		return new ImageResponse(
			<OgCard
				badgeLabel="DLSITE WORK"
				title={asciiTitle || "suzumina.click"}
				circle=""
				price=""
				jacketDataUri={jacketDataUri}
			/>,
			{ ...size },
		);
	}

	return new ImageResponse(
		<OgCard
			badgeLabel="DLsite作品"
			title={title}
			circle={circle}
			price={price}
			jacketDataUri={jacketDataUri}
		/>,
		{
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
		},
	);
}
