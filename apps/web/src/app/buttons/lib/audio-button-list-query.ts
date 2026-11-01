import type { AudioButton } from "@suzumina.click/shared-types";
import { loadAllPublicAudioButtons } from "../audio-buttons-source";
import { sortAudioButtons } from "./audio-button-filters";

/**
 * 新しい順の公開音声ボタンを limit 件と、公開ボタンの総数を取得（サーバー専用）
 *
 * 一覧 Server Action（getAudioButtonsList）は limit を上限で切り詰めるため、それを超える件数が要る
 * サーバー側の用途（/buttons のグループビュー）はこちらを使う。"use server" ではないので
 * クライアントからは呼べない（SPR-378）。読み取り元は一覧と同じ全件キャッシュ
 * （loadAllPublicAudioButtons）で、鮮度も一覧と揃う（SPR-349）。
 * 名前の似た getRecentAudioButtons（app/buttons/actions.ts）は Server Action で、上限 100 がかかる
 */
export async function getRecentPublicAudioButtons(
	limit: number,
): Promise<{ audioButtons: AudioButton[]; totalCount: number }> {
	const newest = sortAudioButtons(await loadAllPublicAudioButtons(), "newest");
	return { audioButtons: newest.slice(0, limit), totalCount: newest.length };
}
