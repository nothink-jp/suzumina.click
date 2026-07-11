"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { ActionPillRow } from "@suzumina.click/ui/components/custom/action-pill-row";
import { MetaPillRow } from "@suzumina.click/ui/components/custom/meta-pill-row";
import { PlayHero } from "@suzumina.click/ui/components/custom/play-hero";
import { buildXShareUrl } from "@/lib/x-share";
import { formatJSTDateSlash } from "@/utils/date-format";
import { useAudioButtonHeroState } from "./use-audio-button-hero-state";

/**
 * 詳細ページのヒーロー本体（SPR-255）。再生ヒーロー L + メタピル行 + description + アクションピル行。
 * per-user 状態（お気に入り/高評価）は SSR に焼かず client で自己解決する（純公開 shell・SPR-223）。
 * 再生回数は再生開始時に楽観的に +1 表示する（デザインの「N 回目の再生中…」）。
 */

interface AudioButtonHeroProps {
	audioButton: AudioButtonPlainObject;
}

export function AudioButtonHero({ audioButton }: AudioButtonHeroProps) {
	const {
		isPlaying,
		playCount,
		handlePlayStart,
		handlePlayStateChange,
		isFavorited,
		toggleFavorite,
		isLiked,
		likeCount,
		toggleLike,
	} = useAudioButtonHeroState(audioButton);

	const duration = (audioButton.endTime || audioButton.startTime) - audioButton.startTime;
	const shareUrl = buildXShareUrl(audioButton.id, audioButton.buttonText);

	const actionPillProps = {
		isFavorite: isFavorited,
		onFavoriteToggle: toggleFavorite,
		isLiked,
		likeCount,
		onLikeToggle: toggleLike,
		shareUrl,
	};

	return (
		<div className="text-center">
			<PlayHero
				audioButton={audioButton}
				size="L"
				onPlay={handlePlayStart}
				onPlayStateChange={handlePlayStateChange}
			/>

			<div className="mt-4 sm:mt-5">
				<MetaPillRow
					playCount={playCount}
					durationText={`${duration.toFixed(1)}秒`}
					dateText={formatJSTDateSlash(audioButton.createdAt)}
					favoriteCount={audioButton.stats.favoriteCount || 0}
					isPlaying={isPlaying}
				/>
			</div>

			{audioButton.description?.trim() && (
				<p className="mx-auto mt-4 max-w-[560px] text-[13.5px] leading-[1.7] text-muted-foreground line-clamp-2">
					{audioButton.description}
				</p>
			)}

			<div className="mt-[18px] sm:mt-[22px]">
				<div className="hidden sm:block">
					<ActionPillRow size="default" {...actionPillProps} />
				</div>
				<div className="sm:hidden">
					<ActionPillRow size="sm" {...actionPillProps} />
				</div>
			</div>
		</div>
	);
}
