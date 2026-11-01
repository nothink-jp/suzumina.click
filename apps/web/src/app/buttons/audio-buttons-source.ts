import type { AudioButton } from "@suzumina.click/shared-types";
import { cacheLife, cacheTag } from "next/cache";
import { getFirestore } from "@/lib/firestore";
import { applyFilters } from "./lib/audio-button-filters";
import { AUDIO_BUTTON_LIST_FIELDS } from "./lib/audio-button-list-query";
import { fetchAndConvertButtons } from "./utils/audio-button-converters";

/** 公開音声ボタン全件キャッシュのタグ。書き込み系 Server Action が updateTag で失効させる */
export const PUBLIC_AUDIO_BUTTONS_TAG = "public-audio-buttons";

/**
 * 公開音声ボタン一覧の読み取り正本（SPR-349）。
 *
 * 旧実装は素の一覧を `.limit(offset).get()` → `startAfter` のオフセット・エミュレーションで
 * ページ送りしており、読み捨て分も課金されるため 1 リクエストの read が page 番号に比例していた。
 * タグ/検索経路は全件を毎リクエスト読んでいた（キャッシュ無し）。
 *
 * 構造は `creators/creators-source.ts` と同じ。キャッシュ境界を**引数を取らない全件取得**だけに絞り、
 * 動画・タグ・検索の絞り込み、並べ替え、ページ送りは外側の純粋な導出にする（引数をキーにすると
 * 組み合わせの数だけ全件スキャンが走る＝SPR-311）。
 *
 * 鮮度: `use cache` はインスタンスローカルなので、updateTag で失効するのは書き込みを処理した
 * インスタンスだけ。他インスタンスでは cacheLife("hours") か世代交代まで古い一覧（再生数・
 * 非公開化/削除の反映遅れを含む）が出うる。詳細ページ（getAudioButtonById）は都度読むので
 * 非公開・削除済みのボタンを開いても中身は出ない。
 *
 * 取得失敗は throw して伝播させる（空配列をキャッシュに載せない）。
 * 戻り値はキャッシュ共有されうるので、呼び出し側は破壊的に並べ替えない。
 */
export async function loadAllPublicAudioButtons(): Promise<AudioButton[]> {
	"use cache";
	cacheLife("hours");
	cacheTag(PUBLIC_AUDIO_BUTTONS_TAG);

	const firestore = getFirestore();
	return fetchAndConvertButtons(
		applyFilters(firestore.collection("audioButtons").select(...AUDIO_BUTTON_LIST_FIELDS)),
	);
}
