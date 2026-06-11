"use server";

import type {
	CircleDocument,
	CirclePlainObject,
	WorkDocument,
	WorkPlainObject,
} from "@suzumina.click/shared-types";
import { convertToCirclePlainObject, isValidCircleId } from "@suzumina.click/shared-types";
import { compareWorks, searchWorks } from "@/lib/circle-creator-works";
import { getFirestore } from "@/lib/firestore";
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

		// まずサークル情報を取得してサークル名を確認
		const circleDoc = await firestore.collection("circles").doc(circleId).get();
		if (!circleDoc.exists) {
			return { works: [], totalCount: 0 };
		}

		const circleData = circleDoc.data() as CircleDocument;
		const circleName = circleData.name;

		// 全作品を取得してクライアント側でフィルタリング
		const allWorksSnapshot = await firestore.collection("works").get();

		const allMatchingWorks = allWorksSnapshot.docs
			.map((doc) => {
				const data = doc.data();
				return {
					...data,
					id: doc.id,
				} as WorkDocument;
			})
			.filter((work) => {
				// circleId が一致するか、circleId がない場合はサークル名で一致判定
				return work.circleId === circleId || work.circle === circleName;
			});

		// WorkPlainObjectに変換（work-converters の正本を共用）
		const convertedWorks = convertWorksToPlainObjects(allMatchingWorks);

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
