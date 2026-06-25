"use client";

import type { AudioButton, VideoPlainObject } from "@suzumina.click/shared-types";
import { canCreateAudioButton } from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { AudioButtonWithPlayCount } from "@/components/audio/audio-button-with-play-count";
import { useAudioButtonStatuses } from "@/hooks/use-audio-button-statuses";
import { useSession } from "@/lib/auth/client";

interface RelatedAudioButtonsProps {
	audioButtons: AudioButton[];
	totalCount: number;
	videoId: string;
	video: VideoPlainObject;
}

export function RelatedAudioButtons({
	audioButtons,
	totalCount,
	videoId,
	video,
}: RelatedAudioButtonsProps) {
	const user = useSession();
	// per-user 状態（お気に入り/高低評価）は SSR に焼かず client で一括取得する（純公開 shell・SPR-226）。
	// 公開リスト（/buttons）と同じ pattern。これにより /videos/[id] を public キャッシュへ戻せる。
	const audioButtonIds = useMemo(() => audioButtons.map((button) => button.id), [audioButtons]);
	const { likeDislikeStatuses, favoriteStatuses } = useAudioButtonStatuses(audioButtonIds);
	const canCreateButton = user && canCreateAudioButton(video) && video.status?.embeddable !== false;

	if (audioButtons.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				<p className="mb-4">この動画の音声ボタンはまだありません</p>
				{canCreateButton && (
					<Button asChild size="sm" variant="outline">
						<Link href={`/buttons/create?video_id=${videoId}`}>
							<Plus className="h-4 w-4 mr-2" />
							最初の音声ボタンを作る
						</Link>
					</Button>
				)}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* 音声ボタン一覧 */}
			<div className="flex flex-wrap gap-2">
				{audioButtons.map((audioButton) => {
					const likeDislikeStatus = likeDislikeStatuses[audioButton.id];
					const isFavorited = favoriteStatuses[audioButton.id] || false;

					return (
						<AudioButtonWithPlayCount
							key={audioButton.id}
							audioButton={audioButton}
							maxTitleLength={15}
							className="shadow-sm hover:shadow-md transition-all duration-200"
							initialIsFavorited={isFavorited}
							initialIsLiked={likeDislikeStatus?.isLiked || false}
							initialIsDisliked={likeDislikeStatus?.isDisliked || false}
						/>
					);
				})}
			</div>

			{/* もっと見るボタン */}
			{totalCount > audioButtons.length && (
				<div className="text-center pt-2">
					<Button asChild variant="outline" size="sm">
						<Link href={`/buttons?videoId=${videoId}`}>
							<ArrowRight className="h-4 w-4 mr-2" />
							すべての音声ボタンを見る ({totalCount}件)
						</Link>
					</Button>
				</div>
			)}
		</div>
	);
}
