import { parseDurationToSeconds } from "@suzumina.click/shared-types";
import { getVideoById } from "@/app/videos/actions";
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
 * YouTube動画詳細の動的 OG 画像（SPR-268 段階導入② / /works/[workId] と同じ file-convention パターン）。
 * X のリンクカードは「画像 + 小タイトル + ドメイン」しか表示しないため（SPR-17 調査）、
 * YouTubeサムネイル + タイトル + チャンネル名 + 再生時間を画像内に構成し、カード単体で内容が伝わるようにする。
 * og:image / twitter:image はこの規約ファイルから自動出力される（generateMetadata の images 手書きはしない）。
 * どの失敗経路でも 500 は返さない（動画未取得→サイト名版 / サムネイル取得失敗→サムネイル無し版 / フォント取得失敗→ASCII 縮退版）。
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "動画情報 - すずみなくりっく！";

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

interface OgCardProps {
	badgeLabel: string;
	title: string;
	channelTitle: string;
	durationLabel: string;
	thumbnailDataUri: string | null;
}

/** サムネイル + タイトル/チャンネル名/再生時間の2カラムレイアウト（通常版と縮退版で共用） */
function OgCard({ badgeLabel, title, channelTitle, durationLabel, thumbnailDataUri }: OgCardProps) {
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
				{thumbnailDataUri && (
					// biome-ignore lint/performance/noImgElement: ImageResponse(satori) は next/image を使えないため生 img 必須
					<img
						src={thumbnailDataUri}
						alt=""
						width={480}
						height={270}
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
					<span style={{ fontSize: 28, color: MUTED_FOREGROUND }}>{channelTitle}</span>
					{durationLabel && (
						<span style={{ fontWeight: 700, fontSize: 30, color: SUZUKA_500 }}>
							{durationLabel}
						</span>
					)}
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
			<OgCard
				badgeLabel="YOUTUBE VIDEO"
				title={asciiOrEmpty(title) || "suzumina.click"}
				channelTitle=""
				durationLabel=""
				thumbnailDataUri={thumbnailDataUri}
			/>
		),
		renderFull: () => (
			<OgCard
				badgeLabel="動画"
				title={title}
				channelTitle={channelTitle}
				durationLabel={durationLabel}
				thumbnailDataUri={thumbnailDataUri}
			/>
		),
	});
}
