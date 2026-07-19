"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { Heart } from "lucide-react";
import { useMemo } from "react";
import { AudioButtonWithPlayCount } from "@/components/audio/audio-button-with-play-count";
import { useFavoriteStatusBulk } from "@/hooks/use-favorite-status-bulk";
import { useLikeDislikeStatusBulk } from "@/hooks/use-like-dislike-status-bulk";

/**
 * featured セクション（SPR-257 PR②）: よく押されてるボタン + 新着ボタン。
 * フィルタなしの一覧上部にのみ表示する（呼び出し側で制御）。
 * デザイン正本: Claude Design「ボタン一覧.dc.html」（改訂版）
 */

interface FeaturedAudioButtonsProps {
	popular: AudioButtonPlainObject[];
	fresh: AudioButtonPlainObject[];
}

export function FeaturedAudioButtons({ popular, fresh }: FeaturedAudioButtonsProps) {
	const allIds = useMemo(
		() => [...new Set([...popular, ...fresh].map((b) => b.id))],
		[popular, fresh],
	);
	const { favoriteStates } = useFavoriteStatusBulk(allIds);
	const { likeDislikeStates } = useLikeDislikeStatusBulk(allIds);

	const renderButton = (button: AudioButtonPlainObject) => (
		<AudioButtonWithPlayCount
			key={button.id}
			audioButton={button}
			initialIsFavorited={favoriteStates.get(button.id) || false}
			initialIsLiked={likeDislikeStates.get(button.id)?.isLiked || false}
		/>
	);

	if (popular.length === 0 && fresh.length === 0) return null;

	return (
		<div className="mb-7 flex flex-col gap-6">
			{popular.length > 0 && (
				<section>
					<div className="mb-3.5 flex items-center gap-2">
						<Heart className="h-4 w-4 fill-heart text-heart" aria-hidden="true" />
						<h2 className="text-lg font-extrabold">よく押されてるボタン</h2>
					</div>
					<div className="flex flex-wrap gap-3.5">
						{popular.map((button) => (
							<div key={button.id} className="flex flex-col items-start gap-1.5">
								{renderButton(button)}
								<span className="pl-3 text-[11.5px] font-bold text-heart">
									{button.stats.playCount}回再生
								</span>
							</div>
						))}
					</div>
				</section>
			)}

			{fresh.length > 0 && (
				<section>
					<div className="mb-3.5 flex items-center gap-2">
						<span className="rounded-full bg-heart px-2.5 py-0.5 text-[10.5px] font-extrabold tracking-[0.08em] text-heart-foreground">
							NEW
						</span>
						<h2 className="text-lg font-extrabold">新着ボタン</h2>
					</div>
					<div className="flex flex-wrap gap-3">{fresh.map(renderButton)}</div>
					<div className="mt-6 h-px bg-border" />
				</section>
			)}
		</div>
	);
}
