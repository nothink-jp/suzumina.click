import { cacheLife } from "next/cache";
import { buildOgImageResponse, OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE } from "@/lib/og-response";
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

export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;
export const alt = "サークル情報 - すずみなくりっく！";

interface OgImageParams {
	params: Promise<{ circleId: string }>;
}

/**
 * OG 画像用のサークル取得キャッシュ（約1日で再検証＝作品数変動の反映猶予）。
 * null（未取得・エラー。getCircleInfo はエラーも null に畳む）は throw してキャッシュに残さず、
 * 呼び出し側の catch でサイト名版へ縮退する（縮退結果を1日固定しないため）
 */
async function getCircleForOg(circleId: string) {
	"use cache";
	cacheLife("days");
	const circle = await getCircleInfo(circleId);
	if (!circle) throw new Error(`OG画像用のサークル取得に失敗しました: ${circleId}`);
	return circle;
}

export default async function Image({ params }: OgImageParams) {
	const { circleId } = await params;

	const circle = await getCircleForOg(circleId).catch(() => null);

	const name = circle ? formatDisplayTitle(circle.name, 30) : "すずみなくりっく！";
	const statLabel = circle ? `${circle.workCount}作品` : "";

	return buildOgImageResponse({
		size,
		// suzumina.click は底部署名（OgFooter）用
		boldText: `${name}DLsiteサークルすずみなくりっく！${statLabel}suzumina.click`,
		renderFallback: () => (
			<TextOgCard
				badgeLabel="DLSITE CIRCLE"
				name={asciiOrEmpty(name) || "suzumina.click"}
				subtitle=""
				statLabel=""
				ascii
			/>
		),
		renderFull: () => (
			<TextOgCard badgeLabel="DLsiteサークル" name={name} subtitle="" statLabel={statLabel} />
		),
	});
}
