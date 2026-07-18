"use server";

import { getCurrentUser } from "@/lib/auth/server";
import { generateClipContent } from "@/lib/gemini/client";
import {
	type AudioButtonSuggestion,
	buildSuggestionPrompt,
	clipRange,
	parseSuggestionResponse,
	validateSegment,
} from "@/lib/gemini/suggestion-core";
import * as logger from "@/lib/logger";

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/**
 * プロンプトに渡す既存タグ語彙（出力語彙を既存タグに寄せる）。
 * autocomplete.ts の POPULAR_TAGS と同源だが、動的な頻度集計（Firestore 500件走査）までは
 * 生成のたびに払うコストに見合わないため固定リストに留める（Phase 1 の判断）。
 */
const TAG_VOCABULARY = ["挨拶", "応援", "感謝", "日常", "ゲーム", "歌", "雑談"];

export interface GenerateSuggestionsInput {
	videoId: string;
	startTime: number;
	endTime: number;
}

export type GenerateSuggestionsResult =
	| { success: true; data: AudioButtonSuggestion }
	| { success: false; error: string };

/**
 * 選択区間の発話から buttonText・タグ候補を生成する（SPR-148 Phase 1）。
 * 失敗してもフォームの手入力は常に継続できる（graceful degradation）。
 */
export async function generateAudioButtonSuggestions(
	input: GenerateSuggestionsInput,
): Promise<GenerateSuggestionsResult> {
	try {
		// 認可ゲートの正本 = getCurrentUser の null チェック（SPR-195）。
		// 生成1回ごとに外部APIコストが発生するため無効ユーザーも明示ブロックする。
		const user = await getCurrentUser();
		if (!user?.discordId || !user.isActive) {
			return { success: false, error: "ログインが必要です" };
		}

		if (!VIDEO_ID_PATTERN.test(input.videoId)) {
			return { success: false, error: "動画IDが不正です" };
		}
		const segmentError = validateSegment(input.startTime, input.endTime);
		if (segmentError) {
			return { success: false, error: segmentError };
		}

		const { startOffsetSeconds, endOffsetSeconds } = clipRange(input.startTime, input.endTime);
		const generated = await generateClipContent({
			videoId: input.videoId,
			startOffsetSeconds,
			endOffsetSeconds,
			prompt: buildSuggestionPrompt(TAG_VOCABULARY),
		});
		if (!generated.success) {
			return { success: false, error: generated.error };
		}

		const suggestion = parseSuggestionResponse(generated.text);
		if (!suggestion) {
			logger.warn("Gemini 応答を候補として解釈できませんでした", {
				videoId: input.videoId,
				raw: generated.text.slice(0, 200),
			});
			return { success: false, error: "候補の生成に失敗しました。もう一度お試しください" };
		}

		logger.info("音声ボタン候補を生成", {
			videoId: input.videoId,
			startTime: input.startTime,
			endTime: input.endTime,
			userId: user.discordId,
			titleCount: suggestion.titles.length,
			tagCount: suggestion.tags.length,
		});
		return { success: true, data: suggestion };
	} catch (error) {
		logger.error("音声ボタン候補の生成でエラーが発生", {
			videoId: input.videoId,
			error: error instanceof Error ? error.message : String(error),
		});
		return { success: false, error: "候補の生成に失敗しました" };
	}
}
