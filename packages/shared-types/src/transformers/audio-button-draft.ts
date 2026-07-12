/**
 * AudioButtonDraft Transformers
 *
 * Firestore document ⇄ プレーンオブジェクトの変換（RSC 境界の誤り訂正符号層）。
 * shared-types は Firestore SDK 非依存のため、Timestamp は toDate ダックタイピングで扱う。
 */

import {
	type AudioButtonDraft,
	type AudioButtonDraftDocument,
	calculateDraftSuggestedStartTime,
} from "../types/audio-button-draft";

/**
 * Firestore Timestamp / Date / ISO string を ISO string に正規化する。
 * 不正値は epoch（1970-01-01T00:00:00.000Z）ではなく空文字を避けるため現在時刻でなく
 * そのまま String() する（沈黙のデータ捏造をしない）。
 */
function toIsoString(value: unknown): string {
	if (value && typeof value === "object" && "toDate" in value) {
		return (value as { toDate(): Date }).toDate().toISOString();
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	return String(value ?? "");
}

function fromFirestore(id: string, doc: AudioButtonDraftDocument): AudioButtonDraft {
	return {
		id,
		videoId: doc.videoId,
		videoTitle: doc.videoTitle,
		playerTime: doc.playerTime,
		markedAt: toIsoString(doc.markedAt),
		createdAt: toIsoString(doc.createdAt),
		suggestedStartTime: calculateDraftSuggestedStartTime(doc.playerTime),
	};
}

export const audioButtonDraftTransformers = {
	fromFirestore,
};
