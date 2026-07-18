import { buildOgImageResponse } from "@/lib/og-response";
import { asciiOrEmpty, formatDisplayTitle } from "@/lib/og-text";
import { TextOgCard } from "@/lib/og-text-card";
import { getCircleInfo } from "./actions";

/**
 * DLsiteサークル詳細の動的 OG 画像（SPR-268 段階導入③）。
 * サークルは画像素材を持たないため、works/videos のジャケット/サムネイル付きカードとは異なり
 * タイポグラフィ主体のカード（lib/og-text-card.tsx 共通コンポーネント）で構成する。
 * og:image / twitter:image はこの規約ファイルから自動出力される（generateMetadata の images 手書きはしない）。
 * どの失敗経路でも 500 は返さない（サークル未取得→サイト名版 / フォント取得失敗→ASCII 縮退版）。
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "サークル情報 - すずみなくりっく！";

interface OgImageParams {
	params: Promise<{ circleId: string }>;
}

export default async function Image({ params }: OgImageParams) {
	const { circleId } = await params;

	const circle = await getCircleInfo(circleId).catch(() => null);

	const name = circle ? formatDisplayTitle(circle.name, 30) : "すずみなくりっく！";
	const statLabel = circle ? `${circle.workCount}作品` : "";

	return buildOgImageResponse({
		size,
		boldText: `${name}DLsiteサークルすずみなくりっく！${statLabel}`,
		renderFallback: () => (
			<TextOgCard
				badgeLabel="DLSITE CIRCLE"
				name={asciiOrEmpty(name) || "suzumina.click"}
				subtitle=""
				statLabel=""
			/>
		),
		renderFull: () => (
			<TextOgCard badgeLabel="DLsiteサークル" name={name} subtitle="" statLabel={statLabel} />
		),
	});
}
