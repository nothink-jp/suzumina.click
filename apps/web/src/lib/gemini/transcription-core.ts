/**
 * 動画の発話単位文字起こし（SPR-292）の純粋ロジック。
 * Gemini API 呼び出し本体は client.ts。ここはチャンク計算・プロンプト・応答検証のみ（テスト対象）。
 * 設計パラメータ（10分チャンク・オーバーラップ・思考上限）の根拠は SPR-291 スパイク実測。
 */

/** 発話1件（時刻は動画先頭からの絶対秒） */
export interface TranscriptUtterance {
	start: number;
	end: number;
	text: string;
	/** 歌唱区間（歌詞は書き起こさない） */
	kind?: "song";
}

/** チャンク長（秒）。10分窓で入力 ≈ 55k トークン・レイテンシ ≈ 30秒（SPR-291 実測） */
export const CHUNK_SECONDS = 600;
/**
 * チャンク末尾のオーバーラップ（秒）。境界をまたぐ発話が尻切れにならないよう
 * 生成窓は次チャンク側へ延ばし、採用は start < chunkEnd の発話に限定する
 */
export const CHUNK_OVERLAP_SECONDS = 15;
/** 発話スナップの前後パディング（デザイン 2a 確定値。境界精度 ±0.5秒の実測と整合） */
export const SNAP_PADDING_BEFORE_SECONDS = 0.15;
export const SNAP_PADDING_AFTER_SECONDS = 0.35;

const roundTenth = (value: number) => Math.round(value * 10) / 10;

/** 指定秒を含むチャンク番号 */
export function chunkIndexForTime(timeSeconds: number): number {
	return Math.max(0, Math.floor(timeSeconds / CHUNK_SECONDS));
}

/** 動画に存在する最後のチャンク番号 */
export function maxChunkIndex(videoDurationSeconds: number): number {
	if (videoDurationSeconds <= 0) return 0;
	return Math.floor((videoDurationSeconds - 1) / CHUNK_SECONDS);
}

/** チャンクの担当範囲と生成窓（オーバーラップ込み・動画長でクランプ） */
export function chunkRange(
	chunkIndex: number,
	videoDurationSeconds: number,
): {
	chunkStart: number;
	chunkEnd: number;
	requestStart: number;
	requestEnd: number;
} {
	const chunkStart = chunkIndex * CHUNK_SECONDS;
	const chunkEnd = Math.min(chunkStart + CHUNK_SECONDS, videoDurationSeconds);
	return {
		chunkStart,
		chunkEnd,
		requestStart: chunkStart,
		requestEnd: Math.min(chunkEnd + CHUNK_OVERLAP_SECONDS, videoDurationSeconds),
	};
}

/**
 * 文字起こしプロンプト。時刻はクリップ相対で受け、parse 側で絶対時刻へ変換する。
 * 歌唱の歌詞は書き起こさない（権利面の割り切り。区間として見えれば用は足りる）
 */
export function buildTranscriptionPrompt(): string {
	return `この動画クリップは日本語配信アーカイブの一部です。クリップ内の話者の発話を発話単位（一息・一文程度）で全て文字起こししてください。
- 各発話に開始・終了時刻を秒（クリップ先頭を0秒とする相対時刻・小数第1位まで）で付けること
- 聞こえたとおり正確に。BGM・効果音のみの区間は含めない
- 歌唱区間は "kind" に "song" を入れ、text は「♪」とだけ書く（歌詞は書き起こさない）
JSONで出力: {"utterances": [{"start": number, "end": number, "text": string, "kind"?: "song"}]}`;
}

const MAX_UTTERANCE_TEXT_LENGTH = 200;

/**
 * Gemini 応答を検証して絶対時刻の発話リストへ変換する。
 * 解釈不能なら null（graceful degradation。部分的に壊れた要素は捨てて続行する）
 */
export function parseTranscriptionResponse(
	raw: string,
	chunkStart: number,
	chunkEnd: number,
): TranscriptUtterance[] | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}
	const utterancesRaw = (parsed as { utterances?: unknown })?.utterances;
	if (!Array.isArray(utterancesRaw)) {
		return null;
	}

	const utterances: TranscriptUtterance[] = [];
	for (const item of utterancesRaw) {
		const candidate = item as { start?: unknown; end?: unknown; text?: unknown; kind?: unknown };
		if (
			typeof candidate.start !== "number" ||
			typeof candidate.end !== "number" ||
			typeof candidate.text !== "string" ||
			!Number.isFinite(candidate.start) ||
			!Number.isFinite(candidate.end)
		) {
			continue;
		}
		const start = roundTenth(chunkStart + candidate.start);
		const end = roundTenth(chunkStart + candidate.end);
		const text = candidate.text.trim().slice(0, MAX_UTTERANCE_TEXT_LENGTH);
		if (text.length === 0 || end <= start || start < chunkStart) {
			continue;
		}
		// オーバーラップ窓で拾った次チャンク分は捨てる（担当は start < chunkEnd の発話のみ）
		if (start >= chunkEnd) {
			continue;
		}
		utterances.push({
			start,
			end,
			text,
			...(candidate.kind === "song" ? { kind: "song" as const } : {}),
		});
	}
	utterances.sort((a, b) => a.start - b.start);
	return utterances;
}

/** 発話スナップの区間（パディング込み・動画長でクランプ） */
export function snapRangeForUtterance(
	utterance: Pick<TranscriptUtterance, "start" | "end">,
	videoDurationSeconds: number,
): { startTime: number; endTime: number } {
	const startTime = roundTenth(Math.max(0, utterance.start - SNAP_PADDING_BEFORE_SECONDS));
	const endTime = roundTenth(
		Math.min(videoDurationSeconds, utterance.end + SNAP_PADDING_AFTER_SECONDS),
	);
	return { startTime, endTime: Math.max(endTime, roundTenth(startTime + 0.1)) };
}
