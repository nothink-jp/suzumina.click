import { parseDurationToSeconds } from "@suzumina.click/shared-types";
import { getVideoById } from "@/app/videos/actions";
import { MediaOgCard } from "@/lib/og-media-card";
import { loadRemoteImageDataUri } from "@/lib/og-remote-image";
import { buildOgImageResponse, OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE } from "@/lib/og-response";
import { asciiOrEmpty, formatDisplayTitle, truncateWithEllipsis } from "@/lib/og-text";

/**
 * YouTube動画詳細の動的 OG 画像（SPR-268 段階導入② / /works/[workId] と同じ file-convention パターン）。
 * X のリンクカードは「画像 + 小タイトル + ドメイン」しか表示しないため（SPR-17 調査）、
 * YouTubeサムネイル + タイトル + チャンネル名 + 再生時間を画像内に構成し、カード単体で内容が伝わるようにする。
 * og:image / twitter:image はこの規約ファイルから自動出力される（generateMetadata の images 手書きはしない）。
 * どの失敗経路でも 500 は返さない（動画未取得→サイト名版 / サムネイル取得失敗→サムネイル無し版 / フォント取得失敗→ASCII 縮退版）。
 * カード自体のレイアウトは lib/og-media-card.tsx（/works/[workId] と共用）。
 */

export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;
export const alt = "動画情報 - すずみなくりっく！";

const THUMBNAIL_WIDTH = 480;
const THUMBNAIL_HEIGHT = 270;
// カード幅1200 - 左右padding128 - サムネ480 - gap56 = 536px（タイトル列の折り返し幅）
const TITLE_MAX_WIDTH = 536;
const TITLE_FONT_SIZE = 40;
const TITLE_MAX_LEN = 40;

// next.config.mjs の images.remotePatterns と同じ許可ホスト（YouTube サムネイルCDN限定）
const ALLOWED_THUMBNAIL_HOSTNAMES = ["i.ytimg.com", "img.youtube.com"];

/** 秒数を m:ss / h:mm:ss にフォーマットする（OG画像表示用。小数は出さない） */
function formatDurationLabel(seconds: number): string {
	if (seconds <= 0) return "";
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);
	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	}
	return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

interface OgImageParams {
	params: Promise<{ videoId: string }>;
}

export default async function Image({ params }: OgImageParams) {
	const { videoId } = await params;

	const video = await getVideoById(videoId).catch(() => null);

	const title = video ? formatDisplayTitle(video.title, TITLE_MAX_LEN) : "すずみなくりっく！";
	const channelTitle = video ? truncateWithEllipsis(video.channelTitle, 30) : "";
	const durationLabel = video ? formatDurationLabel(parseDurationToSeconds(video.duration)) : "";
	const thumbnailUrl =
		video?.thumbnails?.maxres?.url ||
		video?.thumbnails?.standard?.url ||
		video?.thumbnails?.high?.url ||
		video?.thumbnailUrl ||
		null;
	const thumbnailDataUri = thumbnailUrl
		? await loadRemoteImageDataUri(thumbnailUrl, ALLOWED_THUMBNAIL_HOSTNAMES)
		: null;

	return buildOgImageResponse({
		size,
		boldText: `${title}動画すずみなくりっく！${durationLabel}`,
		regularText: `${channelTitle}suzumina.click`,
		renderFallback: () => (
			<MediaOgCard
				badgeLabel="YOUTUBE VIDEO"
				title={asciiOrEmpty(title) || "suzumina.click"}
				titleMaxWidth={TITLE_MAX_WIDTH}
				titleFontSize={TITLE_FONT_SIZE}
				imageDataUri={thumbnailDataUri}
				imageWidth={THUMBNAIL_WIDTH}
				imageHeight={THUMBNAIL_HEIGHT}
				ascii
			/>
		),
		renderFull: () => (
			<MediaOgCard
				badgeLabel="動画"
				title={title}
				titleMaxWidth={TITLE_MAX_WIDTH}
				titleFontSize={TITLE_FONT_SIZE}
				imageDataUri={thumbnailDataUri}
				imageWidth={THUMBNAIL_WIDTH}
				imageHeight={THUMBNAIL_HEIGHT}
				secondaryLine={channelTitle}
				emphasisLine={durationLabel}
			/>
		),
	});
}
