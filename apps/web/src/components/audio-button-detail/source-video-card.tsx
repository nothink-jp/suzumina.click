import { TimeDisplay } from "@suzumina.click/ui/components/custom/time-display";
import { YoutubeIcon } from "@suzumina.click/ui/components/custom/youtube-icon";
import { Clock } from "lucide-react";
import { getVideoById } from "@/app/videos/actions";
import { getVideoBadgeInfo } from "@/components/video/video-badge";

/**
 * 元動画カード（SPR-255）: サムネイル + 切り抜き位置バー + クリップ範囲 + YouTube リンク。
 * 切り抜き位置バーは動画総尺（videos ドキュメント・+1 read）から算出する。
 * 動画が取得できない場合は位置バー・日付・種別バッジなしの縮退表示で継続する。
 */

interface SourceVideoCardProps {
	videoId: string;
	videoTitle: string;
	startTime: number;
	endTime: number;
}

/** ISO8601 duration（PT1H2M3S）→ 秒。パース不能は null */
export function parseIsoDurationToSeconds(duration: string | undefined): number | null {
	if (!duration) return null;
	const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
	if (!match || (!match[1] && !match[2] && !match[3])) return null;
	const hours = match[1] ? Number.parseInt(match[1], 10) : 0;
	const minutes = match[2] ? Number.parseInt(match[2], 10) : 0;
	const seconds = match[3] ? Number.parseFloat(match[3]) : 0;
	return hours * 3600 + minutes * 60 + seconds;
}

function formatPublishedDate(isoString: string | undefined): string {
	if (!isoString) return "";
	try {
		return new Date(isoString).toLocaleDateString("ja-JP", {
			timeZone: "Asia/Tokyo",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});
	} catch {
		return "";
	}
}

export async function SourceVideoCard({
	videoId,
	videoTitle,
	startTime,
	endTime,
}: SourceVideoCardProps) {
	const video = await getVideoById(videoId).catch(() => null);

	const clipDuration = (endTime || startTime) - startTime;
	const totalSeconds = parseIsoDurationToSeconds(video?.duration);
	const clipLeftPct = totalSeconds ? Math.min(100, (startTime / totalSeconds) * 100) : null;
	const clipWidthPct = totalSeconds ? Math.min(100, (clipDuration / totalSeconds) * 100) : null;

	const badge = video ? getVideoBadgeInfo(video) : null;
	const title = video?.title || videoTitle;
	const thumbnailUrl = video?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
	const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(startTime)}`;

	return (
		<section className="overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_1px_4px_hsl(var(--suzuka-500)/0.06)]">
			<div className="relative">
				<div
					role="img"
					aria-label={title}
					className="aspect-video w-full bg-muted bg-cover bg-center"
					style={{ backgroundImage: `url(${thumbnailUrl})` }}
				/>
				{badge && (
					<span className="absolute top-2.5 left-2.5 rounded-full bg-foreground/75 px-2.5 py-1 text-[11px] font-bold text-background">
						{badge.text}
					</span>
				)}
				{/* 切り抜き位置バー（動画総尺が取れたときのみ） */}
				{clipLeftPct !== null && clipWidthPct !== null && (
					<div className="absolute right-0 bottom-0 left-0 h-[5px] bg-foreground/35">
						<span
							className="absolute top-0 bottom-0 rounded-[2px] bg-heart"
							style={{
								left: `${clipLeftPct}%`,
								width: `${clipWidthPct}%`,
								minWidth: "6px",
							}}
						/>
					</div>
				)}
			</div>
			<div className="px-[18px] pt-4 pb-[18px]">
				<p className="mb-1 text-[11px] font-bold tracking-[0.1em] text-muted-foreground">元動画</p>
				<p className="line-clamp-2 text-sm leading-[1.5] font-bold">{title}</p>
				{video?.publishedAt && (
					<p className="mt-2 text-xs text-muted-foreground">
						{formatPublishedDate(video.publishedAt)}
					</p>
				)}
				<div className="mt-3 flex items-center gap-2 rounded-xl bg-muted px-3.5 py-2.5">
					<Clock className="h-3.5 w-3.5 flex-none text-muted-foreground" />
					<span className="text-[12.5px] font-semibold text-foreground">
						<TimeDisplay time={startTime} format="mm:ss.s" className="inline" /> –{" "}
						<TimeDisplay time={endTime || startTime} format="mm:ss.s" className="inline" />（
						{clipDuration.toFixed(1)}秒）
					</span>
				</div>
				<a
					href={youtubeUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="mt-3 flex items-center justify-center gap-2 rounded-full border border-border px-4 py-[9px] text-[13px] font-bold text-foreground transition-colors hover:bg-accent"
				>
					<YoutubeIcon className="h-4 w-4" />
					この場面をYouTubeで開く
				</a>
			</div>
		</section>
	);
}
