"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { ActionPillRow } from "@suzumina.click/ui/components/custom/action-pill-row";
import { MetaPillRow } from "@suzumina.click/ui/components/custom/meta-pill-row";
import { PlayHero } from "@suzumina.click/ui/components/custom/play-hero";
import Link from "next/link";
import { buildXShareUrl } from "@/lib/x-share";
import { formatJSTDateSlash } from "@/utils/date-format";
import { useAudioButtonHeroState } from "./use-audio-button-hero-state";

/**
 * モーダル用クイックビューのヒーロー部（SPR-256）。再生ヒーロー M + メタピル行 + タグ + アクションピル行 sm。
 * 状態管理は詳細ページヒーローと同じ useAudioButtonHeroState を共有する（二重実装ドリフト防止）。
 */

interface AudioButtonQuickViewProps {
	audioButton: AudioButtonPlainObject;
}

export function AudioButtonQuickView({ audioButton }: AudioButtonQuickViewProps) {
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

	return (
		<div className="px-7 pt-7 pb-6 text-center">
			<PlayHero
				audioButton={audioButton}
				size="M"
				onPlay={handlePlayStart}
				onPlayStateChange={handlePlayStateChange}
			/>

			<div className="mt-4">
				<MetaPillRow
					playCount={playCount}
					durationText={`${duration.toFixed(1)}秒`}
					dateText={formatJSTDateSlash(audioButton.createdAt)}
					creatorName={audioButton.creatorName}
					isPlaying={isPlaying}
				/>
			</div>

			{(audioButton.tags?.length ?? 0) > 0 && (
				<div className="mt-3.5 flex flex-wrap justify-center gap-[7px]">
					{audioButton.tags?.map((tag) => (
						<Link
							key={tag}
							href={`/buttons?tags=${encodeURIComponent(tag)}`}
							className="inline-flex items-center rounded-full border border-suzuka-200 bg-suzuka-50 px-3 py-[5px] text-xs font-bold text-suzuka-800 transition-colors hover:bg-suzuka-500 hover:text-white"
						>
							{tag}
						</Link>
					))}
				</div>
			)}

			<div className="mt-[18px]">
				<ActionPillRow
					size="sm"
					isFavorite={isFavorited}
					onFavoriteToggle={toggleFavorite}
					isLiked={isLiked}
					likeCount={likeCount}
					onLikeToggle={toggleLike}
					shareUrl={buildXShareUrl(audioButton.id, audioButton.buttonText)}
				/>
			</div>
		</div>
	);
}
