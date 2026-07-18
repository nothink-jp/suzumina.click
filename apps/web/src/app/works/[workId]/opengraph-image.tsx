import { cacheLife } from "next/cache";
import { getWorkById } from "@/app/works/actions";
import { MediaOgCard } from "@/lib/og-media-card";
import { loadRemoteImageDataUri } from "@/lib/og-remote-image";
import { buildOgImageResponse, OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE } from "@/lib/og-response";
import { asciiOrEmpty, formatDisplayTitle, truncateWithEllipsis } from "@/lib/og-text";

/**
 * DLsite作品詳細の動的 OG 画像（SPR-268 / /buttons/[id] の opengraph-image と同じ file-convention パターン）。
 * X のリンクカードは「画像 + 小タイトル + ドメイン」しか表示しないため（SPR-17 調査）、
 * 作品ジャケット + タイトル + サークル名 + 価格を画像内に構成し、カード単体で内容が伝わるようにする。
 * og:image / twitter:image はこの規約ファイルから自動出力される（generateMetadata の images 手書きはしない）。
 * どの失敗経路でも 500 は返さない（作品未取得→サイト名版 / ジャケット取得失敗→ジャケット無し版 / フォント取得失敗→ASCII 縮退版）。
 * カード自体のレイアウトは lib/og-media-card.tsx（/videos/[videoId] と共用）。
 */

export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;
export const alt = "DLsite作品情報 - すずみなくりっく！";

const JACKET_WIDTH = 420;
const JACKET_HEIGHT = 315;
// カード幅1200 - 左右padding128 - ジャケット420 - gap56 = 596px（タイトル列の折り返し幅）
const TITLE_MAX_WIDTH = 590;
const TITLE_FONT_SIZE = 48;
const PRICE_FONT_SIZE = 34;

// next.config.mjs の images.remotePatterns と同じ許可ホスト（DLsite CDN限定）
const ALLOWED_JACKET_HOSTNAMES = ["img.dlsite.jp"];

interface OgImageParams {
	params: Promise<{ workId: string }>;
}

/**
 * OG 画像用の作品取得キャッシュ（約1日で再検証＝価格改定・タイトル変更の反映猶予）。
 * null（未取得・エラー。getWorkById はエラーも null に畳む）は throw してキャッシュに残さず、
 * 呼び出し側の catch でサイト名版へ縮退する（縮退結果を1日固定しないため）
 */
async function getWorkForOg(workId: string) {
	"use cache";
	cacheLife("days");
	const work = await getWorkById(workId);
	if (!work) throw new Error(`OG画像用の作品取得に失敗しました: ${workId}`);
	return work;
}

export default async function Image({ params }: OgImageParams) {
	const { workId } = await params;

	const work = await getWorkForOg(workId).catch(() => null);

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
			<MediaOgCard
				badgeLabel="DLSITE WORK"
				title={asciiOrEmpty(title) || "suzumina.click"}
				titleMaxWidth={TITLE_MAX_WIDTH}
				titleFontSize={TITLE_FONT_SIZE}
				imageDataUri={jacketDataUri}
				imageWidth={JACKET_WIDTH}
				imageHeight={JACKET_HEIGHT}
				ascii
			/>
		),
		renderFull: () => (
			<MediaOgCard
				badgeLabel="DLsite作品"
				title={title}
				titleMaxWidth={TITLE_MAX_WIDTH}
				titleFontSize={TITLE_FONT_SIZE}
				imageDataUri={jacketDataUri}
				imageWidth={JACKET_WIDTH}
				imageHeight={JACKET_HEIGHT}
				secondaryLine={circle}
				emphasisLine={price}
				emphasisFontSize={PRICE_FONT_SIZE}
			/>
		),
	});
}
