/**
 * 配信アーカイブの発話文字起こしバックログ処理（SPR-293）。
 * チャンク（10分）単位で未生成分を新しい動画から順に埋める。
 * チェックポイントは transcriptChunks の doc 存在そのもの＝再実行は常に安全（冪等）。
 * 1回の実行はチャンク数と経過時間の両方で打ち切り、コストと関数タイムアウトを制御する。
 */

import {
	buildTranscriptionPrompt,
	chunkRange,
	maxChunkIndex,
	parseDurationToSeconds,
	parseTranscriptionResponse,
	type TranscriptUtterance,
} from "@suzumina.click/shared-types";
import firestore from "../../infrastructure/database/firestore";
import * as logger from "../../shared/logger";
import { generateTranscriptionContent } from "./gemini-client";

/** 1実行あたりの生成チャンク上限（1チャンク≈30秒・入力55kトークン。SPR-291 実測） */
const DEFAULT_CHUNKS_PER_RUN = 12;
/** タイムアウト（540s）前に安全に切り上げる経過時間の上限 */
const RUN_DEADLINE_MS = 420_000;

interface ArchiveVideo {
	videoId: string;
	durationSeconds: number;
}

export interface TranscribeBacklogResult {
	scannedVideos: number;
	processedChunks: number;
	failedChunks: number;
	backlogRemaining: boolean;
	elapsedMs: number;
}

function chunksPerRun(): number {
	const raw = Number.parseInt(process.env.TRANSCRIBE_CHUNKS_PER_RUN ?? "", 10);
	return Number.isInteger(raw) && raw > 0 ? raw : DEFAULT_CHUNKS_PER_RUN;
}

/**
 * 文字起こし対象のアーカイブ一覧（新しい順）。
 * 全件取得 + in-memory フィルタは本リポジトリの標準パターン（複合インデックスを増やさない）
 */
async function listArchiveVideos(): Promise<ArchiveVideo[]> {
	const snapshot = await firestore
		.collection("videos")
		.select("duration", "liveStreamingDetails", "status", "publishedAt")
		.get();

	const archives: Array<ArchiveVideo & { publishedAt: string }> = [];
	for (const doc of snapshot.docs) {
		const data = doc.data() as {
			duration?: string;
			liveStreamingDetails?: { actualEndTime?: unknown };
			status?: { embeddable?: boolean };
			publishedAt?: string;
		};
		// 音声ボタン作成対象（配信アーカイブ・埋め込み可）だけを文字起こしする
		if (!data.liveStreamingDetails?.actualEndTime || data.status?.embeddable === false) {
			continue;
		}
		const durationSeconds = parseDurationToSeconds(data.duration);
		if (durationSeconds <= 0) {
			continue;
		}
		archives.push({ videoId: doc.id, durationSeconds, publishedAt: data.publishedAt ?? "" });
	}
	archives.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
	return archives.map(({ videoId, durationSeconds }) => ({ videoId, durationSeconds }));
}

/** 未生成チャンク番号（昇順）。doc ID 一覧のみ取得（listDocuments）で内容は読まない */
async function listMissingChunkIndexes(video: ArchiveVideo): Promise<number[]> {
	const refs = await firestore
		.collection("videos")
		.doc(video.videoId)
		.collection("transcriptChunks")
		.listDocuments();
	const existing = new Set(refs.map((ref) => Number.parseInt(ref.id, 10)));
	const missing: number[] = [];
	for (let index = 0; index <= maxChunkIndex(video.durationSeconds); index++) {
		if (!existing.has(index)) {
			missing.push(index);
		}
	}
	return missing;
}

/** 1チャンク生成して保存。失敗は false（書き込まない＝次回リトライ） */
async function generateChunk(video: ArchiveVideo, chunkIndex: number): Promise<boolean> {
	const { chunkStart, chunkEnd, requestStart, requestEnd } = chunkRange(
		chunkIndex,
		video.durationSeconds,
	);
	const generated = await generateTranscriptionContent({
		videoId: video.videoId,
		startOffsetSeconds: requestStart,
		endOffsetSeconds: requestEnd,
		prompt: buildTranscriptionPrompt(),
	});
	if (!generated.success) {
		return false;
	}
	const utterances: TranscriptUtterance[] | null = parseTranscriptionResponse(
		generated.text,
		chunkStart,
		chunkEnd,
	);
	if (utterances === null) {
		logger.warn("文字起こし応答を解釈できませんでした", {
			videoId: video.videoId,
			chunkIndex,
			raw: generated.text.slice(0, 200),
		});
		return false;
	}
	await firestore
		.collection("videos")
		.doc(video.videoId)
		.collection("transcriptChunks")
		.doc(String(chunkIndex))
		.set({
			chunkIndex,
			chunkStart,
			chunkEnd,
			utterances,
			model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
			createdAt: new Date(),
		});
	logger.info("文字起こしチャンクを生成", {
		videoId: video.videoId,
		chunkIndex,
		utteranceCount: utterances.length,
		totalTokens: generated.totalTokens,
	});
	return true;
}

/**
 * バックログを1実行分だけ進める。
 * 予算（チャンク数・経過時間）に達したら途中で切り上げる。次回実行が続きから埋める
 */
export async function runTranscribeBacklog(): Promise<TranscribeBacklogResult> {
	const startedAt = Date.now();
	const budget = chunksPerRun();
	let processedChunks = 0;
	let failedChunks = 0;
	let scannedVideos = 0;
	let backlogRemaining = false;

	const archives = await listArchiveVideos();
	for (const video of archives) {
		if (processedChunks >= budget || Date.now() - startedAt > RUN_DEADLINE_MS) {
			backlogRemaining = true;
			break;
		}
		scannedVideos++;
		const missing = await listMissingChunkIndexes(video);
		for (const chunkIndex of missing) {
			if (processedChunks >= budget || Date.now() - startedAt > RUN_DEADLINE_MS) {
				backlogRemaining = true;
				break;
			}
			const ok = await generateChunk(video, chunkIndex);
			if (ok) {
				processedChunks++;
			} else {
				failedChunks++;
				// 同一動画で連続失敗する場合（削除済み・地域制限等）に予算を溶かさないよう次の動画へ
				break;
			}
		}
	}

	return {
		scannedVideos,
		processedChunks,
		failedChunks,
		backlogRemaining,
		elapsedMs: Date.now() - startedAt,
	};
}
