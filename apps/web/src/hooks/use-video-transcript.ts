"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { getVideoTranscriptChunk } from "@/actions/video-transcription";
import {
	CHUNK_SECONDS,
	chunkIndexForTime,
	type TranscriptUtterance,
} from "@/lib/gemini/transcription-core";

export interface VideoTranscriptState {
	/** 読み込み済み発話（チャンク横断・start 昇順） */
	utterances: TranscriptUtterance[];
	/** 読み込み済みチャンクの範囲（秒）。UI の「どこまで読めたか」表示用 */
	loadedRanges: Array<{ start: number; end: number }>;
	isLoading: boolean;
	error: string | null;
	/** 指定秒を含むチャンクを読み込む（読み込み済みなら何もしない） */
	loadChunkAt: (timeSeconds: number) => void;
	/** 指定秒が読み込み済みか */
	isLoadedAt: (timeSeconds: number) => boolean;
}

/**
 * 作成画面の発話文字起こし読み込み（SPR-292）。
 * チャンク（10分）単位でオンデマンド取得する。生成初回は約30秒かかるため
 * isLoading を進捗表示に使う。失敗しても既存フローに影響しない（error 表示のみ）。
 */
export function useVideoTranscript(videoId: string): VideoTranscriptState {
	const [chunks, setChunks] = useState<Map<number, TranscriptUtterance[]>>(new Map());
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// 進行中チャンクの二重リクエスト防止（isLoading の state 更新より先に判定が要る）
	const inFlightRef = useRef<Set<number>>(new Set());

	const loadChunkAt = useCallback(
		(timeSeconds: number) => {
			const chunkIndex = chunkIndexForTime(timeSeconds);
			if (chunks.has(chunkIndex) || inFlightRef.current.has(chunkIndex)) {
				return;
			}
			inFlightRef.current.add(chunkIndex);
			setIsLoading(true);
			setError(null);
			void getVideoTranscriptChunk({ videoId, chunkIndex })
				.then((result) => {
					if (result.success) {
						setChunks((prev) => {
							const next = new Map(prev);
							next.set(chunkIndex, result.data.utterances);
							return next;
						});
					} else {
						setError(result.error);
					}
				})
				.catch(() => {
					setError("文字起こしの取得に失敗しました");
				})
				.finally(() => {
					inFlightRef.current.delete(chunkIndex);
					setIsLoading(inFlightRef.current.size > 0);
				});
		},
		[videoId, chunks],
	);

	const utterances = useMemo(() => {
		const merged: TranscriptUtterance[] = [];
		for (const list of chunks.values()) {
			merged.push(...list);
		}
		return merged.sort((a, b) => a.start - b.start);
	}, [chunks]);

	const loadedRanges = useMemo(() => {
		const indexes = [...chunks.keys()].sort((a, b) => a - b);
		const ranges: Array<{ start: number; end: number }> = [];
		for (const index of indexes) {
			const start = index * CHUNK_SECONDS;
			const end = start + CHUNK_SECONDS;
			const last = ranges[ranges.length - 1];
			if (last && last.end === start) {
				last.end = end;
			} else {
				ranges.push({ start, end });
			}
		}
		return ranges;
	}, [chunks]);

	const isLoadedAt = useCallback(
		(timeSeconds: number) => chunks.has(chunkIndexForTime(timeSeconds)),
		[chunks],
	);

	return { utterances, loadedRanges, isLoading, error, loadChunkAt, isLoadedAt };
}
