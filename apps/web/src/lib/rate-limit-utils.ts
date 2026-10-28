import type { UserFlags } from "@suzumina.click/shared-types";

/** 1日の音声ボタン作成上限（全ユーザー）。表示文言もここから出す＝上限値の正本 */
export const GENERAL_DAILY_BUTTON_LIMIT = 10;
/** 1日の音声ボタン作成上限（すずみなふぁみりー）。基本値 + ファミリーボーナス 100 */
export const FAMILY_DAILY_BUTTON_LIMIT = GENERAL_DAILY_BUTTON_LIMIT + 100;

/**
 * ユーザーの1日の上限を計算
 */
export function calculateDailyLimit(flags: UserFlags | undefined): number {
	return flags?.isFamilyMember ? FAMILY_DAILY_BUTTON_LIMIT : GENERAL_DAILY_BUTTON_LIMIT;
}

/** Gemini 呼び出しの日次上限の種別。users.dailyGeminiUsage のカウンタ名と一致させる */
export type GeminiUsageKind = "transcription" | "suggestion";

/**
 * Gemini 呼び出しの1日の上限（SPR-336）。上限値の正本。
 * ボタン作成と同じく「基本値 + ファミリーボーナス」で決める。
 * - transcription: 文字起こしチャンク（1回=10分窓）の新規生成数。キャッシュ命中は数えない
 * - suggestion: タイトル・タグ候補の生成数（ボタン作成上限の3倍＝再生成の余地）
 */
export const GEMINI_DAILY_LIMITS: Record<
	GeminiUsageKind,
	{ general: number; familyBonus: number }
> = {
	transcription: { general: 6, familyBonus: 30 },
	suggestion: {
		general: GENERAL_DAILY_BUTTON_LIMIT * 3,
		familyBonus: (FAMILY_DAILY_BUTTON_LIMIT - GENERAL_DAILY_BUTTON_LIMIT) * 3,
	},
};

/**
 * ユーザーの Gemini 呼び出しの1日の上限を計算
 */
export function calculateGeminiDailyLimit(
	flags: UserFlags | undefined,
	kind: GeminiUsageKind,
): number {
	const { general, familyBonus } = GEMINI_DAILY_LIMITS[kind];
	return flags?.isFamilyMember ? general + familyBonus : general;
}

/**
 * 残り時間を人間が読みやすい形式に変換
 */
export function formatTimeUntilReset(): string {
	const now = new Date();
	const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));

	const jstMidnight = new Date(jstNow);
	jstMidnight.setHours(24, 0, 0, 0);

	const diffMs = jstMidnight.getTime() - jstNow.getTime();
	const hours = Math.floor(diffMs / (1000 * 60 * 60));
	const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

	if (hours > 0) {
		return `約${hours}時間後`;
	}
	return `約${minutes}分後`;
}
