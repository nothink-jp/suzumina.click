/**
 * 音声ボタンのメタ入力候補生成（SPR-148）の純粋ロジック。
 * Gemini API 呼び出し本体は client.ts。ここはプロンプト・区間・応答検証のみ（テスト対象）。
 */

export interface AudioButtonSuggestion {
	/** クリップ区間の文字起こし（候補選択時の確認用） */
	transcript: string;
	/** buttonText 候補（発話引用優先） */
	titles: string[];
	/** タグ候補 */
	tags: string[];
}

/** 生成対象区間の上限（コスト上限。通常のボタンは数秒） */
export const MAX_SEGMENT_SECONDS = 60;
/** 発話の切れ目を拾うためのクリップ前後余白 */
export const CLIP_PADDING_SECONDS = 2;

const MAX_TITLE_LENGTH = 100;
const MAX_TAG_LENGTH = 30;
const MAX_TITLES = 3;
const MAX_TAGS = 3;

/**
 * サイト全体の暗黙前提でタグとして無意味なもの。
 * Spike 実測でモデルが毎回付けてきたため出力から除外する。
 */
const EXCLUDED_TAGS = ["涼花みなせ", "すずみな", "切り抜き", "音声ボタン"];

/** クリップ区間（秒・整数）。Gemini の video_metadata に渡す */
export function clipRange(
	startTime: number,
	endTime: number,
): { startOffsetSeconds: number; endOffsetSeconds: number } {
	return {
		startOffsetSeconds: Math.max(0, Math.floor(startTime - CLIP_PADDING_SECONDS)),
		endOffsetSeconds: Math.ceil(endTime + CLIP_PADDING_SECONDS),
	};
}

/** 区間の入力検証。エラーメッセージ or null（button-drafts と同スタイル） */
export function validateSegment(startTime: number, endTime: number): string | null {
	if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime < 0) {
		return "区間が不正です";
	}
	if (endTime <= startTime) {
		return "終了時間は開始時間より後にしてください";
	}
	if (endTime - startTime > MAX_SEGMENT_SECONDS) {
		return `候補生成は${MAX_SEGMENT_SECONDS}秒以内の区間で利用できます`;
	}
	return null;
}

/**
 * 生成プロンプト。既存タグ語彙を渡して出力の語彙を揃える。
 * 除外タグはプロンプト指示＋parseSuggestionResponse の二段で防ぐ（モデルは指示を守らないことがある）。
 */
export function buildSuggestionPrompt(existingTags: string[]): string {
	const vocabulary = existingTags.length > 0 ? existingTags.join(", ") : "なし";
	return `この動画クリップは日本語配信アーカイブの一部です。
1. クリップ内で話者が発した言葉を、聞こえたとおり正確に文字起こししてください（transcript）。
2. この発話を「音声ボタン」（短いセリフを再生するボタン）にするときのタイトル候補を${MAX_TITLES}つ提案してください。発話そのままの引用が最良。各5〜20文字程度（titles）。
3. 内容に合うタグを最大${MAX_TAGS}つ提案してください。既存タグの例: ${vocabulary}。合うものがあれば既存タグを優先し、無ければ新規でよい。話者名・サイト名のタグ（${EXCLUDED_TAGS.join("、")}）は付けないでください（tags）。
JSONで出力: {"transcript": string, "titles": string[], "tags": string[]}`;
}

function sanitizeStringArray(
	value: unknown,
	{ maxItems, maxLength }: { maxItems: number; maxLength: number },
): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const seen = new Set<string>();
	const result: string[] = [];
	for (const item of value) {
		if (typeof item !== "string") {
			continue;
		}
		const trimmed = item.trim().slice(0, maxLength);
		if (trimmed === "" || seen.has(trimmed)) {
			continue;
		}
		seen.add(trimmed);
		result.push(trimmed);
		if (result.length >= maxItems) {
			break;
		}
	}
	return result;
}

/**
 * Gemini の応答テキスト（JSON文字列想定）を検証して候補に変換する。
 * titles が1件も残らなければ候補として不成立＝null（transcript だけでは使い道がない）。
 */
export function parseSuggestionResponse(raw: string): AudioButtonSuggestion | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}
	if (typeof parsed !== "object" || parsed === null) {
		return null;
	}
	const record = parsed as Record<string, unknown>;
	const titles = sanitizeStringArray(record.titles, {
		maxItems: MAX_TITLES,
		maxLength: MAX_TITLE_LENGTH,
	});
	if (titles.length === 0) {
		return null;
	}
	const tags = sanitizeStringArray(record.tags, {
		maxItems: MAX_TAGS,
		maxLength: MAX_TAG_LENGTH,
	}).filter((tag) => !EXCLUDED_TAGS.includes(tag));
	return {
		transcript: typeof record.transcript === "string" ? record.transcript.trim() : "",
		titles,
		tags,
	};
}
