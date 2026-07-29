"use client";

import type { VideoPlainObject } from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatSeconds } from "@/utils/format-seconds";

interface CaptureHeaderProps {
	video: VideoPlainObject;
	isLiveNow: boolean;
	isUpcoming: boolean;
	durationSeconds: number;
	markCount: number;
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
 * 集中モードの細いヘッダー（導線再設計 段2）。
 * 見出し＋説明ブロックを廃し、状態・タイトル・マーク数だけに絞る。
 * 動画の説明・タグ・統計は詳細ページの仕事なので置かない＝プレイヤーが常に主役。
 */
export function CaptureHeader({
	video,
	isLiveNow,
	isUpcoming,
	durationSeconds,
	markCount,
}: CaptureHeaderProps) {
	const router = useRouter();
	return (
		<div className="flex items-center gap-2 min-w-0">
			<Button size="sm" variant="ghost" aria-label="前のページへ戻る" onClick={() => router.back()}>
				<ArrowLeft className="h-4 w-4" />
			</Button>
			<ModeBadge isLiveNow={isLiveNow} isUpcoming={isUpcoming} />
			<h1 className="text-sm font-medium truncate min-w-0 flex-1">{video.title}</h1>
			{durationSeconds > 0 && (
				<span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
					{formatSeconds(durationSeconds)}
				</span>
			)}
			<span className="text-xs text-muted-foreground whitespace-nowrap">
				マーク <span className="text-heart font-semibold">{markCount}</span>
			</span>
		</div>
	);
}
