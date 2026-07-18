import { getCreatorTypeLabel } from "@suzumina.click/shared-types";
import { buildOgImageResponse } from "@/lib/og-response";
import { asciiOrEmpty, formatDisplayTitle } from "@/lib/og-text";
import { TextOgCard } from "@/lib/og-text-card";
import { getCreatorInfo } from "./actions";

/**
 * DLsiteクリエイター詳細の動的 OG 画像（SPR-268 段階導入③）。
 * クリエイターは画像素材を持たないため、works/videos のジャケット/サムネイル付きカードとは異なり
 * タイポグラフィ主体のカード（lib/og-text-card.tsx 共通コンポーネント。/circles と共用）で構成する。
 * og:image / twitter:image はこの規約ファイルから自動出力される（generateMetadata の images 手書きはしない）。
 * どの失敗経路でも 500 は返さない（クリエイター未取得→サイト名版 / フォント取得失敗→ASCII 縮退版）。
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "クリエイター情報 - すずみなくりっく！";

interface OgImageParams {
	params: Promise<{ creatorId: string }>;
}

export default async function Image({ params }: OgImageParams) {
	const { creatorId } = await params;

	const creator = await getCreatorInfo(creatorId).catch(() => null);

	const name = creator ? formatDisplayTitle(creator.name, 30) : "すずみなくりっく！";
	const typeLabel = creator ? getCreatorTypeLabel(creator.types) : "";
	const statLabel = creator ? `${creator.workCount}作品` : "";

	return buildOgImageResponse({
		size,
		boldText: `${name}${typeLabel}DLsiteクリエイターすずみなくりっく！${statLabel}`,
		renderFallback: () => (
			<TextOgCard
				badgeLabel="DLSITE CREATOR"
				name={asciiOrEmpty(name) || "suzumina.click"}
				subtitle=""
				statLabel=""
			/>
		),
		renderFull: () => (
			<TextOgCard
				badgeLabel="DLsiteクリエイター"
				name={name}
				subtitle={typeLabel}
				statLabel={statLabel}
			/>
		),
	});
}
