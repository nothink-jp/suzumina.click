"use server";

import {
	buildTranscriptionPrompt,
	chunkRange,
	maxChunkIndex,
	parseDurationToSeconds,
	parseTranscriptionResponse,
	type TranscriptUtterance,
} from "@suzumina.click/shared-types";
import { getCurrentUser } from "@/lib/auth/server";
import { getFirestore } from "@/lib/firestore";
import { generateClipContent } from "@/lib/gemini/client";
import * as logger from "@/lib/logger";

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
/** 文字起こしは10分窓＝約30秒かかる（SPR-291 実測）。既定30秒では足りない */
const TRANSCRIPTION_TIMEOUT_MS = 120_000;
/** SPR-291 実測で確定した生成パラメータ（思考上限なしは JSON 切断・レイテンシ数倍） */
const TRANSCRIPTION_MAX_OUTPUT_TOKENS = 16_384;
const TRANSCRIPTION_THINKING_BUDGET = 1_024;

/** Firestore 保存形（videos/{videoId}/transcriptChunks/{chunkIndex}）。派生データ＝再生成可能 */
interface TranscriptChunkDocument {
	chunkIndex: number;
	chunkStart: number;
	chunkEnd: number;
	utterances: TranscriptUtterance[];
	model: string;
	createdAt: Date;
}

export interface GetTranscriptChunkInput {
	videoId: string;
	chunkIndex: number;
}

export type GetCachedTranscriptChunksResult =
	| {
			success: true;
			data: { chunks: Array<{ chunkIndex: number; utterances: TranscriptUtterance[] }> };
	  }
	| { success: false; error: string };

/**
 * キャッシュ済みの全チャンクを返す（SPR-293 セリフ検索用）。
 * **生成はしない**（読み取りのみ）。バックログ処理（transcribeVideoBacklog）が
 * 埋めた分だけが返る＝カバレッジはクライアント側で表示する
 */
export async function getCachedTranscriptChunks(input: {
	videoId: string;
}): Promise<GetCachedTranscriptChunksResult> {
	try {
		const user = await getCurrentUser();
		if (!user?.discordId || !user.isActive) {
			return { success: false, error: "ログインが必要です" };
		}
		if (!VIDEO_ID_PATTERN.test(input.videoId)) {
			return { success: false, error: "動画IDが不正です" };
		}

		const snapshot = await chunkCollection(input.videoId).get();
		const chunks = snapshot.docs
			.map((doc) => {
				const data = doc.data() as TranscriptChunkDocument;
				return { chunkIndex: data.chunkIndex, utterances: data.utterances ?? [] };
			})
			.sort((a, b) => a.chunkIndex - b.chunkIndex);
		return { success: true, data: { chunks } };
	} catch (error) {
		logger.error("キャッシュ済み文字起こしの取得でエラーが発生", {
			videoId: input.videoId,
			error: error instanceof Error ? error.message : String(error),
		});
		return { success: false, error: "文字起こしの取得に失敗しました" };
	}
}

export type GetTranscriptChunkResult =
	| { success: true; data: { chunkIndex: number; utterances: TranscriptUtterance[] } }
	| { success: false; error: string };

function chunkCollection(videoId: string) {
	return getFirestore().collection("videos").doc(videoId).collection("transcriptChunks");
}

/** 生成本体: 動画の実在確認 → Gemini 生成 → 検証 → キャッシュ保存 */
async function generateAndCacheChunk(
	input: GetTranscriptChunkInput,
	userId: string,
): Promise<GetTranscriptChunkResult> {
	// 動画の実在と長さを確認（チャンク番号の妥当性は動画長で決まる）
	const videoDoc = await getFirestore().collection("videos").doc(input.videoId).get();
	if (!videoDoc.exists) {
		return { success: false, error: "動画が見つかりません" };
	}
	const videoDuration = parseDurationToSeconds(videoDoc.data()?.duration as string | undefined);
	if (videoDuration <= 0 || input.chunkIndex > maxChunkIndex(videoDuration)) {
		return { success: false, error: "チャンク指定が不正です" };
	}

	const { chunkStart, chunkEnd, requestStart, requestEnd } = chunkRange(
		input.chunkIndex,
		videoDuration,
	);
	const generated = await generateClipContent({
		videoId: input.videoId,
		startOffsetSeconds: requestStart,
		endOffsetSeconds: requestEnd,
		prompt: buildTranscriptionPrompt(),
		options: {
			timeoutMs: TRANSCRIPTION_TIMEOUT_MS,
			maxOutputTokens: TRANSCRIPTION_MAX_OUTPUT_TOKENS,
			thinkingBudget: TRANSCRIPTION_THINKING_BUDGET,
		},
	});
	if (!generated.success) {
		return { success: false, error: "文字起こしの取得に失敗しました" };
	}

	const utterances = parseTranscriptionResponse(generated.text, chunkStart, chunkEnd);
	if (utterances === null) {
		logger.warn("文字起こし応答を解釈できませんでした", {
			videoId: input.videoId,
			chunkIndex: input.chunkIndex,
			raw: generated.text.slice(0, 200),
		});
		return { success: false, error: "文字起こしの取得に失敗しました。もう一度お試しください" };
	}

	const doc: TranscriptChunkDocument = {
		chunkIndex: input.chunkIndex,
		chunkStart,
		chunkEnd,
		utterances,
		model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
		createdAt: new Date(),
	};
	await chunkCollection(input.videoId).doc(String(input.chunkIndex)).set(doc);

	logger.info("文字起こしチャンクを生成", {
		videoId: input.videoId,
		chunkIndex: input.chunkIndex,
		userId,
		utteranceCount: utterances.length,
	});
	return { success: true, data: { chunkIndex: input.chunkIndex, utterances } };
}

/**
 * 動画の発話文字起こしチャンクを返す（SPR-292）。
 * キャッシュ（Firestore）優先で、無ければ Gemini で生成して保存する。
 * 生成は1チャンク=10分・約30秒かかるためクライアント側は進捗表示を出すこと。
 * 同一チャンクへの並行生成は後勝ち上書きになるが、内容はほぼ同一で実害がないため
 * ロックは持たない（生成コストが二重になるだけ。頻度も低い）。
 */
export async function getVideoTranscriptChunk(
	input: GetTranscriptChunkInput,
): Promise<GetTranscriptChunkResult> {
	try {
		// 認可ゲートの正本 = getCurrentUser の null チェック（SPR-195）。
		// 生成1回ごとに外部APIコストが発生するため無効ユーザーも明示ブロックする
		const user = await getCurrentUser();
		if (!user?.discordId || !user.isActive) {
			return { success: false, error: "ログインが必要です" };
		}

		if (!VIDEO_ID_PATTERN.test(input.videoId)) {
			return { success: false, error: "動画IDが不正です" };
		}
		if (!Number.isInteger(input.chunkIndex) || input.chunkIndex < 0) {
			return { success: false, error: "チャンク指定が不正です" };
		}

		// キャッシュ優先（他ユーザーの生成結果も共有する）
		const cached = await chunkCollection(input.videoId).doc(String(input.chunkIndex)).get();
		if (cached.exists) {
			const data = cached.data() as TranscriptChunkDocument;
			return {
				success: true,
				data: { chunkIndex: input.chunkIndex, utterances: data.utterances ?? [] },
			};
		}

		return await generateAndCacheChunk(input, user.discordId);
	} catch (error) {
		logger.error("文字起こしチャンクの取得でエラーが発生", {
			videoId: input.videoId,
			chunkIndex: input.chunkIndex,
			error: error instanceof Error ? error.message : String(error),
		});
		return { success: false, error: "文字起こしの取得に失敗しました" };
	}
}
