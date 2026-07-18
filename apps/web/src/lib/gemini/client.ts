/**
 * Gemini API クライアント（サーバー専用・SPR-148）。
 * YouTube URL + 区間クリップを generateContent に渡す用途に限定した素 fetch ラッパー。
 * SDK は追加しない（1エンドポイントのみのため依存を増やさない判断）。
 */

import * as logger from "@/lib/logger";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
/**
 * gemini-2.5 系は新規プロジェクトで利用不可（Spike 実測 404）のため Gemini 3 系が正本。
 * preview 名の改廃に env で追従できるよう GEMINI_MODEL で上書き可能にする。
 */
const DEFAULT_MODEL = "gemini-3-flash-preview";
const REQUEST_TIMEOUT_MS = 30_000;

export type GenerateClipContentResult =
	| { success: true; text: string }
	| { success: false; error: string };

export interface GenerateClipContentInput {
	videoId: string;
	startOffsetSeconds: number;
	endOffsetSeconds: number;
	prompt: string;
}

/**
 * YouTube 動画の指定区間に対してテキスト生成を行う。
 * 動画の取得は Google 側で行われるため、サーバーIP が YouTube にブロックされる懸念はない。
 * 失敗は success:false で返す（呼び出し側の graceful degradation 前提。throw しない）。
 */
export async function generateClipContent(
	input: GenerateClipContentInput,
): Promise<GenerateClipContentResult> {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		logger.error("GEMINI_API_KEY が未設定のため候補生成できません");
		return { success: false, error: "候補生成が利用できません" };
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
			temperature: 0.4,
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
			return { success: false, error: "候補の生成に失敗しました" };
		}

		const json = (await response.json()) as {
			candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
			usageMetadata?: { totalTokenCount?: number };
		};
		const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
		if (!text) {
			logger.error("Gemini API 応答に候補テキストがありません", { model, elapsedMs });
			return { success: false, error: "候補の生成に失敗しました" };
		}

		logger.info("Gemini 候補生成に成功", {
			model,
			elapsedMs,
			totalTokens: json.usageMetadata?.totalTokenCount,
		});
		return { success: true, text };
	} catch (error) {
		logger.error("Gemini API 呼び出しでエラーが発生", {
			model,
			error: error instanceof Error ? error.message : String(error),
		});
		return { success: false, error: "候補の生成に失敗しました" };
	}
}
