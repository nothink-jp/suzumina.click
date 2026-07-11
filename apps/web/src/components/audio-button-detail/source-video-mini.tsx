import { TimeDisplay } from "@suzumina.click/ui/components/custom/time-display";
import { YoutubeIcon } from "@suzumina.click/ui/components/custom/youtube-icon";

/**
 * モーダル用の元動画ミニカード（SPR-256）。
 * audioButton が持つ公開データのみで描画する（videos の追加取得はしない＝モーダルを軽く保つ。
 * 切り抜き位置バー等のリッチ表示はフル詳細ページ（source-video-card.tsx）の役割）。
 */

interface SourceVideoMiniProps {
	videoId: string;
	videoTitle: string;
	videoThumbnailUrl?: string;
	startTime: number;
	endTime: number;
}

export function SourceVideoMini({
	videoId,
	videoTitle,
	videoThumbnailUrl,
	startTime,
	endTime,
}: SourceVideoMiniProps) {
	const clipDuration = (endTime || startTime) - startTime;
	const thumbnailUrl = videoThumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

	return (
		<div className="flex items-center gap-3.5 px-7 pt-[18px] pb-3.5">
			<div
				role="img"
				aria-label={videoTitle}
				className="aspect-video w-[110px] flex-none rounded-[10px] bg-muted bg-cover bg-center"
				style={{ backgroundImage: `url(${thumbnailUrl})` }}
			/>
			<div className="min-w-0 flex-1 text-left">
				<p className="mb-[3px] text-[10.5px] font-bold tracking-[0.1em] text-muted-foreground">
					元動画
				</p>
				<p className="line-clamp-2 text-[13px] leading-[1.45] font-bold">{videoTitle}</p>
				<p className="mt-[5px] text-[11.5px] text-muted-foreground">
					<TimeDisplay time={startTime} format="mm:ss.s" className="inline" /> –{" "}
					<TimeDisplay time={endTime || startTime} format="mm:ss.s" className="inline" />（
					{clipDuration.toFixed(1)}秒）
				</p>
			</div>
			<a
				href={`https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(startTime)}`}
				target="_blank"
				rel="noopener noreferrer"
				aria-label="YouTubeで開く"
				className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-border transition-colors hover:bg-accent"
			>
				<YoutubeIcon className="h-[17px] w-[17px]" />
			</a>
		</div>
	);
}
