import { getCreatorTypeLabel } from "@suzumina.click/shared-types";
import { cacheLife } from "next/cache";
import { buildOgImageResponse, OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE } from "@/lib/og-response";
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

export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;
export const alt = "クリエイター情報 - すずみなくりっく！";

interface OgImageParams {
	params: Promise<{ creatorId: string }>;
}

/**
 * OG 画像用のクリエイター取得キャッシュ（約1日で再検証＝作品数変動の反映猶予）。
 * null（未取得・エラー。getCreatorInfo はエラーも null に畳む）は throw してキャッシュに残さず、
 * 呼び出し側の catch でサイト名版へ縮退する（縮退結果を1日固定しないため）
 */
async function getCreatorForOg(creatorId: string) {
	"use cache";
	cacheLife("days");
	const creator = await getCreatorInfo(creatorId);
	if (!creator) throw new Error(`OG画像用のクリエイター取得に失敗しました: ${creatorId}`);
	return creator;
}

export default async function Image({ params }: OgImageParams) {
	const { creatorId } = await params;

	const creator = await getCreatorForOg(creatorId).catch(() => null);

	const name = creator ? formatDisplayTitle(creator.name, 30) : "すずみなくりっく！";
	const typeLabel = creator ? getCreatorTypeLabel(creator.types) : "";
	const statLabel = creator ? `${creator.workCount}作品` : "";

	return buildOgImageResponse({
		size,
		// suzumina.click は底部署名（OgFooter）用
		boldText: `${name}${typeLabel}DLsiteクリエイターすずみなくりっく！${statLabel}suzumina.click`,
		renderFallback: () => (
			<TextOgCard
				badgeLabel="DLSITE CREATOR"
				name={asciiOrEmpty(name) || "suzumina.click"}
				subtitle=""
				statLabel=""
				ascii
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
