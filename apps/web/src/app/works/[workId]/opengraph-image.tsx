import { getWorkById } from "@/app/works/actions";
import {
	OG_BACKGROUND as BACKGROUND,
	OG_MINASE_300 as MINASE_300,
	OG_MINASE_800 as MINASE_800,
	OG_MINASE_950 as MINASE_950,
	OG_MUTED_FOREGROUND as MUTED_FOREGROUND,
	OG_SUZUKA_100 as SUZUKA_100,
	OG_SUZUKA_500 as SUZUKA_500,
	OG_SUZUKA_700 as SUZUKA_700,
} from "@/lib/og-palette";
import { loadRemoteImageDataUri } from "@/lib/og-remote-image";
import { buildOgImageResponse } from "@/lib/og-response";
import { asciiOrEmpty, formatDisplayTitle, truncateWithEllipsis } from "@/lib/og-text";

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

// カード幅1200 - 左右padding128 - ジャケット420 - gap56 = 596px（タイトル列の折り返し幅）
const TITLE_MAX_WIDTH = 590;
const TITLE_FONT_SIZE = 48;

// next.config.mjs の images.remotePatterns と同じ許可ホスト（DLsite CDN限定）
const ALLOWED_JACKET_HOSTNAMES = ["img.dlsite.jp"];

interface OgCardProps {
	badgeLabel: string;
	title: string;
	circle: string;
	price: string;
	jacketDataUri: string | null;
}

/** ジャケット + タイトル/サークル/価格の2カラムレイアウト（通常版と縮退版で共用） */
function OgCard({ badgeLabel, title, circle, price, jacketDataUri }: OgCardProps) {
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
							width: TITLE_MAX_WIDTH,
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
	const jacketDataUri = jacketUrl
		? await loadRemoteImageDataUri(jacketUrl, ALLOWED_JACKET_HOSTNAMES)
		: null;

	return buildOgImageResponse({
		size,
		boldText: `${title}DLsite作品すずみなくりっく！`,
		regularText: `${circle}${price}suzumina.click`,
		renderFallback: () => (
			<OgCard
				badgeLabel="DLSITE WORK"
				title={asciiOrEmpty(title) || "suzumina.click"}
				circle=""
				price=""
				jacketDataUri={jacketDataUri}
			/>
		),
		renderFull: () => (
			<OgCard
				badgeLabel="DLsite作品"
				title={title}
				circle={circle}
				price={price}
				jacketDataUri={jacketDataUri}
			/>
		),
	});
}
