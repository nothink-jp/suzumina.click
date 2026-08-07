"use server";

import type {
	CircleDocument,
	CirclePlainObject,
	WorkPlainObject,
} from "@suzumina.click/shared-types";
import { convertToCirclePlainObject, isValidCircleId } from "@suzumina.click/shared-types";
import { compareWorks, searchWorks } from "@/lib/circle-creator-works";
import { getFirestore } from "@/lib/firestore";
import { fetchWorksByIds } from "../../works/utils/fetch-works-by-ids";
import { convertWorksToPlainObjects } from "../../works/utils/work-converters";

/**
 * サークル情報を取得
 * @param circleId サークルID
 * @returns サークル情報、存在しない場合はnull
 */
export async function getCircleInfo(circleId: string): Promise<CirclePlainObject | null> {
	// 入力検証
	if (!isValidCircleId(circleId)) {
		return null;
	}

	try {
		const firestore = getFirestore();
		const circleDoc = await firestore.collection("circles").doc(circleId).get();

		if (!circleDoc.exists) {
			return null;
		}

		const data = circleDoc.data() as CircleDocument;
		return convertToCirclePlainObject(data);
	} catch (_error) {
		// エラー発生時はnullを返す
		return null;
	}
}

/**
 * サークル作品リストを取得（ConfigurableList用）
 * @param params パラメータ
 * @returns 作品一覧と総件数
 */
export async function getCircleWorksList(params: {
	circleId: string;
	page?: number;
	limit?: number;
	sort?: string;
	search?: string;
}): Promise<{ works: WorkPlainObject[]; totalCount: number; filteredCount?: number }> {
	const { circleId, page = 1, limit = 12, sort = "newest", search } = params;

	// 入力検証
	if (!isValidCircleId(circleId)) {
		return { works: [], totalCount: 0 };
	}

	try {
		const firestore = getFirestore();

		const circleDoc = await firestore.collection("circles").doc(circleId).get();
		if (!circleDoc.exists) {
			return { works: [], totalCount: 0 };
		}

		const circleData = circleDoc.data() as CircleDocument;

		// サークル所属作品の正本は circles/{id}.workIds。
		// 書き手は DLsite 取り込み（2h毎に arrayUnion・circle-firestore.ts）で、
		// checkDataIntegrity（週次）が重複除去と欠落補填を事後修復する。
		// 読み取り側はこの配列を引き当てるだけにし、所属条件を read 時に再計算しない。
		//
		// 旧実装は works を全件取得して `circleId 一致 || サークル名一致` で再導出していたため、
		// 1 リクエストあたり works 全件（実測 2,156件）を読んでいた。
		// ヘッダーの「作品数」は元から workIds.length 由来（circle-conversions.ts）で、
		// 同一ページ内で所属の正本が二重化していた状態を解消する。
		const workIds = circleData.workIds ?? [];
		const matchingWorks = await fetchWorksByIds(firestore, workIds);

		// WorkPlainObjectに変換（work-converters の正本を共用）
		const convertedWorks = convertWorksToPlainObjects(matchingWorks);

		// 検索フィルタリング（circle/creator 共通）
		const { filtered: filteredWorks, count: filteredCount } = searchWorks(convertedWorks, search);

		// ソート処理
		filteredWorks.sort((a, b) => compareWorks(a, b, sort));

		// ページネーション適用
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedWorks = filteredWorks.slice(startIndex, endIndex);

		return {
			works: paginatedWorks,
			totalCount: convertedWorks.length,
			filteredCount,
		};
	} catch (_error) {
		// エラー発生時は空配列を返す
		return { works: [], totalCount: 0 };
	}
}
