"use client";

import type { VideoPlainObject } from "@suzumina.click/shared-types";
import { YouTubePlayer } from "@suzumina.click/ui/components/custom/youtube-player";
import type { YTPlayer } from "@suzumina.click/ui/components/custom/youtube-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { ExternalLink } from "lucide-react";

interface CaptureTargetProps {
	video: VideoPlainObject;
	isUpcoming: boolean;
	/** 埋め込み不可ならプレイヤーが動かず playerTime が取れない＝マーク自体を止める */
	isEmbeddable: boolean;
	onPlayerReady: (player: YTPlayer) => void;
}

/**
 * マーキング対象のプレイヤー領域（集中モードの主役）。
 * タイトル・状態は細いヘッダー（capture-header）、マークボタンは固定バー（capture-action-bar）に
 * 分離済みで、ここはプレイヤーと「動かせない事実の通知」だけを持つ。
 */
export function CaptureTarget({
	video,
	isUpcoming,
	isEmbeddable,
	onPlayerReady,
}: CaptureTargetProps) {
	if (!isEmbeddable) {
		return (
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
		);
	}

	return (
		<div className="space-y-2">
			<div className="aspect-video bg-muted rounded-lg overflow-hidden shadow-lg">
				<YouTubePlayer videoId={video.videoId} controls={true} onReady={onPlayerReady} />
			</div>
			{isUpcoming && (
				<p className="text-xs text-muted-foreground">
					配信開始前です。開始後にプレイヤーが再生されてからマークしてください。
				</p>
			)}
		</div>
	);
}
