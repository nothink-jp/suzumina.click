import type { AudioButton, AudioButtonDocument } from "@suzumina.click/shared-types";
import { getFirestore } from "@/lib/firestore";
import { fetchAndConvertButtons } from "../utils/audio-button-converters";
import { applyFilters, applySorting } from "./audio-button-filters";

/** 一覧表示に要るフィールドだけを読む（AudioButtonDocument のうち一覧で使うもの） */
export const AUDIO_BUTTON_LIST_FIELDS = [
	"buttonText",
	"tags",
	"videoId",
	"videoTitle",
	"videoThumbnailUrl",
	"startTime",
	"endTime",
	"duration",
	"creatorId",
	"creatorName",
	"isPublic",
	"stats",
	"createdAt",
	"updatedAt",
] as const satisfies readonly (keyof AudioButtonDocument)[];

/**
 * 新しい順の公開音声ボタンを limit 件と、公開ボタンの総数を取得（サーバー専用）
 *
 * 一覧 Server Action（getAudioButtonsList）は limit を上限で切り詰めるため、それを超える件数が要る
 * サーバー側の用途（/buttons のグループビュー）はこちらを使う。"use server" ではないので
 * クライアントからは呼べない（SPR-378）。クエリの形は getAudioButtonsList の素の一覧と同じ。
 * 名前の似た getRecentAudioButtons（app/buttons/actions.ts）は Server Action で、上限 100 がかかる
 */
export async function getRecentPublicAudioButtons(
	limit: number,
): Promise<{ audioButtons: AudioButton[]; totalCount: number }> {
	const firestore = getFirestore();
	const [countSnapshot, audioButtons] = await Promise.all([
		applyFilters(firestore.collection("audioButtons")).count().get(),
		fetchAndConvertButtons(
			applySorting(
				applyFilters(firestore.collection("audioButtons").select(...AUDIO_BUTTON_LIST_FIELDS)),
				"newest",
			).limit(limit),
		),
	]);
	return { audioButtons, totalCount: countSnapshot.data().count };
}
