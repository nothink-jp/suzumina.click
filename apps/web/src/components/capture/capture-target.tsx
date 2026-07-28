"use client";

import type { VideoPlainObject } from "@suzumina.click/shared-types";
import { YouTubePlayer } from "@suzumina.click/ui/components/custom/youtube-player";
import type { YTPlayer } from "@suzumina.click/ui/components/custom/youtube-types";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Bookmark, ExternalLink, Loader2 } from "lucide-react";

interface CaptureTargetProps {
	video: VideoPlainObject;
	isLiveNow: boolean;
	isUpcoming: boolean;
	/** 埋め込み不可ならプレイヤーが動かず playerTime が取れない＝マーク自体を止める */
	isEmbeddable: boolean;
	isMarking: boolean;
	justMarked: boolean;
	onMark: () => void;
	onPlayerReady: (player: YTPlayer) => void;
}

function ModeBadge({ isLiveNow, isUpcoming }: { isLiveNow: boolean; isUpcoming: boolean }) {
	if (isLiveNow) {
		return <Badge variant="destructive">配信中</Badge>;
	}
	if (isUpcoming) {
		return <Badge variant="secondary">配信予定</Badge>;
	}
	return <Badge variant="outline">アーカイブ</Badge>;
}

/**
 * マーキング対象の動画エリア（プレイヤー + マークボタン）。
 * 配信/アーカイブの区別は表示とガード文言だけに効き、マークの保存内容は同じ（生の捕捉信号）。
 */
export function CaptureTarget({
	video,
	isLiveNow,
	isUpcoming,
	isEmbeddable,
	isMarking,
	justMarked,
	onMark,
	onPlayerReady,
}: CaptureTargetProps) {
	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2 flex-wrap">
				<ModeBadge isLiveNow={isLiveNow} isUpcoming={isUpcoming} />
				<span className="text-sm font-medium truncate">{video.title}</span>
			</div>

			{isEmbeddable ? (
				<>
					<div className="aspect-video bg-muted rounded-lg overflow-hidden shadow-lg">
						<YouTubePlayer videoId={video.videoId} controls={true} onReady={onPlayerReady} />
					</div>

					<Button
						onClick={onMark}
						disabled={isMarking}
						size="lg"
						className={`w-full min-h-[56px] text-lg font-bold transition-colors ${
							justMarked ? "bg-green-600 hover:bg-green-600" : ""
						}`}
					>
						{isMarking ? (
							<Loader2 className="h-5 w-5 mr-2 animate-spin" />
						) : (
							<Bookmark className="h-5 w-5 mr-2" />
						)}
						{justMarked ? "マークしました" : "ここをマーク（M）"}
					</Button>

					{isUpcoming && (
						<p className="text-xs text-muted-foreground">
							配信開始前です。開始後にプレイヤーが再生されてからマークしてください。
						</p>
					)}
				</>
			) : (
				<div className="border rounded-lg p-6 text-center space-y-2">
					<p className="text-sm text-muted-foreground">
						この動画は埋め込みが制限されているため、マーキングできません。
					</p>
					<Button
						variant="outline"
						size="sm"
						render={
							<a
								href={`https://youtube.com/watch?v=${video.videoId}`}
								target="_blank"
								rel="noopener noreferrer"
							>
								<ExternalLink className="h-3.5 w-3.5 mr-1" />
								YouTube で見る
							</a>
						}
					/>
				</div>
			)}
		</div>
	);
}
