"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { useCallback, useEffect, useState } from "react";
import { useAudioButtonEngagement } from "@/hooks/use-audio-button-engagement";
import { usePlayCount } from "@/hooks/use-play-count";

/**
 * 詳細ページ/モーダルヒーローの状態管理（SPR-255）。
 * - 再生: usePlayCount で計上し、表示上は楽観的に +1（「N 回目の再生中…」）
 * - お気に入り/高評価: use-audio-button-engagement（一覧と共有の正本・SPR-257）で client 自己解決
 */
export function useAudioButtonHeroState(audioButton: AudioButtonPlainObject) {
	// 再生状態と楽観的再生回数
	const { handlePlay, cleanup } = usePlayCount();
	const [isPlaying, setIsPlaying] = useState(false);
	const [playBump, setPlayBump] = useState(0);
	useEffect(() => cleanup, [cleanup]);

	const handlePlayStart = useCallback(() => {
		handlePlay(audioButton.id);
		setPlayBump((n) => n + 1);
	}, [handlePlay, audioButton.id]);

	// お気に入り / 高評価（初期値なし＝client 自己取得）
	const { isFavorited, toggleFavorite, isLiked, likeCount, toggleLike } =
		useAudioButtonEngagement(audioButton);

	return {
		isPlaying,
		playCount: audioButton.stats.playCount + playBump,
		handlePlayStart,
		handlePlayStateChange: setIsPlaying,
		isFavorited,
		toggleFavorite,
		isLiked,
		likeCount,
		toggleLike,
	};
}
