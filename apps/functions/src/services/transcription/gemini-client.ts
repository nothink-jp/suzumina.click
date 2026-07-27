/**
 * Gemini API クライアント（functions 用・SPR-293）。
 * YouTube URL + 区間クリップの generateContent に限定した素 fetch ラッパー。
 * apps/web/src/lib/gemini/client.ts と同型（ロガーのみ functions 側）。SDK は追加しない。
 * 生成パラメータの根拠は SPR-291 スパイク実測（思考上限なしは JSON 切断・レイテンシ数倍）。
 */

import * as logger from "../../shared/logger";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-3-flash-preview";
/** 文字起こしは10分窓＝約30秒かかる（SPR-291 実測） */
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_OUTPUT_TOKENS = 16_384;
const THINKING_BUDGET = 1_024;

export type TranscribeClipResult =
	| { success: true; text: string; totalTokens?: number }
	| { success: false; error: string };

/**
 * YouTube 動画の指定区間へのテキスト生成（文字起こし用固定パラメータ）。
 * 失敗は success:false で返す（バッチ側で継続判断。throw しない）。
 */
export async function generateTranscriptionContent(input: {
	videoId: string;
	startOffsetSeconds: number;
	endOffsetSeconds: number;
	prompt: string;
}): Promise<TranscribeClipResult> {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		logger.error("環境変数に GEMINI_API_KEY が設定されていません");
		return { success: false, error: "GEMINI_API_KEY missing" };
	}
	const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

	const body = {
		contents: [
			{
				parts: [
					{
						file_data: {
							file_uri: `https://www.youtube.com/watch?v=${input.videoId}`,
						},
						video_metadata: {
							start_offset: `${input.startOffsetSeconds}s`,
							end_offset: `${input.endOffsetSeconds}s`,
						},
					},
					{ text: input.prompt },
				],
			},
		],
		generationConfig: {
			response_mime_type: "application/json",
			temperature: 0.1,
			maxOutputTokens: MAX_OUTPUT_TOKENS,
			thinkingConfig: { thinkingBudget: THINKING_BUDGET },
		},
	};

	try {
		const startedAt = Date.now();
		const response = await fetch(`${BASE_URL}/models/${model}:generateContent`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-goog-api-key": apiKey,
			},
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		});
		const elapsedMs = Date.now() - startedAt;

		if (!response.ok) {
			// 残高枯渇(429)・モデル廃止(404)は運用で気づく必要があるためエラーログに残す
			const detail = (await response.text()).slice(0, 500);
			logger.error("Gemini API がエラーを返却", {
				model,
				status: response.status,
				elapsedMs,
				detail,
			});
			return { success: false, error: `HTTP ${response.status}` };
		}

		const json = (await response.json()) as {
			candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
			usageMetadata?: { totalTokenCount?: number };
		};
		const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
		if (!text) {
			logger.error("Gemini API 応答に候補テキストがありません", { model, elapsedMs });
			return { success: false, error: "empty response" };
		}
		return { success: true, text, totalTokens: json.usageMetadata?.totalTokenCount };
	} catch (error) {
		logger.error("Gemini API 呼び出しでエラーが発生", {
			model,
			error: error instanceof Error ? error.message : String(error),
		});
		return { success: false, error: "request failed" };
	}
}
