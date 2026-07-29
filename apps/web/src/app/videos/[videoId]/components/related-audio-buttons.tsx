"use client";

import type { AudioButton, VideoPlainObject } from "@suzumina.click/shared-types";
import { canCreateAudioButton } from "@suzumina.click/shared-types";
import { EmptyState } from "@suzumina.click/ui/components/custom";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { ArrowRight, Bookmark, Volume2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { AudioButtonWithPlayCount } from "@/components/audio/audio-button-with-play-count";
import { resolveCaptureVideoMode } from "@/components/capture/video-mode";
import { useAudioButtonStatuses } from "@/hooks/use-audio-button-statuses";

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
	// per-user 状態（お気に入り/高低評価）は SSR に焼かず client で一括取得する（純公開 shell・SPR-226）。
	// 公開リスト（/buttons）と同じ pattern。これにより /videos/[id] を public キャッシュへ戻せる。
	const audioButtonIds = useMemo(() => audioButtons.map((button) => button.id), [audioButtons]);
	const { likeDislikeStatuses, favoriteStatuses } = useAudioButtonStatuses(audioButtonIds);
	// 空状態の導線は本文の主アクションと同じ /watch 行き（「ここにもある」ではなく「ここから始める」）。
	// ログインは見ない＝ポインタに徹し、認証は /watch の ProtectedRoute に委ねる
	const mode = resolveCaptureVideoMode(video);
	const canMark =
		video.status?.embeddable !== false && (canCreateAudioButton(video) || mode !== "archived");

	if (audioButtons.length === 0) {
		return (
			<EmptyState
				icon={<Volume2 className="h-6 w-6" />}
				title="この動画の音声ボタンはまだありません"
				description={canMark ? "通し見ながら拾うのがいちばん早いです" : undefined}
				action={
					canMark ? (
						<Button
							size="sm"
							variant="outline"
							render={
								<Link href={`/watch?v=${videoId}`}>
									<Bookmark className="h-4 w-4 mr-2" />
									マークして見る
								</Link>
							}
						/>
					) : undefined
				}
			/>
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
						/>
					);
				})}
			</div>

			{/* もっと見るボタン */}
			{totalCount > audioButtons.length && (
				<div className="text-center pt-2">
					<Button
						variant="outline"
						size="sm"
						render={
							<Link href={`/buttons?videoId=${videoId}`}>
								<ArrowRight className="h-4 w-4 mr-2" />
								すべての音声ボタンを見る ({totalCount}件)
							</Link>
						}
					/>
				</div>
			)}
		</div>
	);
}
