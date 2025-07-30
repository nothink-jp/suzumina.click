/**
 * Circle entity conversion utilities
 *
 * CircleDocumentとCirclePlainObject間の変換ユーティリティ
 */

import type { CirclePlainObject } from "../plain-objects/circle-plain";
import type { CircleDocument } from "../types/firestore/circle";

/**
 * CircleDocumentをCirclePlainObjectに変換
 *
 * Firestoreから取得したサークルデータをClient Componentで
 * 使用可能な形式に変換します。
 *
 * @param data Firestoreのサークルデータ
 * @returns プレーンオブジェクト形式のサークルデータ、変換失敗時はnull
 *
 * @example
 * ```typescript
 * // Server Component内
 * const circleDoc = await firestore.collection('circles').doc(circleId).get();
 * const circleData = circleDoc.data() as CircleDocument;
 * const plainCircle = convertToCirclePlainObject(circleData);
 *
 * // Client Componentに渡す
 * return <CircleDetail circle={plainCircle} />;
 * ```
 */
export function convertToCirclePlainObject(
	data: CircleDocument | null | undefined,
): CirclePlainObject | null {
	if (!data) {
		return null;
	}

	// Timestampオブジェクトの変換処理
	const toISOString = (timestamp: unknown): string | null => {
		if (!timestamp) return null;
		// Firestore Timestampの場合
		if (timestamp && typeof timestamp === "object" && "toDate" in timestamp) {
			const timestampObj = timestamp as { toDate: () => Date };
			if (typeof timestampObj.toDate === "function") {
				return timestampObj.toDate().toISOString();
			}
		}
		// すでにDate型の場合
		if (timestamp instanceof Date) {
			return timestamp.toISOString();
		}
		// 文字列の場合はそのまま返す
		if (typeof timestamp === "string") {
			return timestamp;
		}
		return null;
	};

	return {
		circleId: data.circleId,
		name: data.name,
		nameEn: data.nameEn,
		workCount: data.workIds ? data.workIds.length : 0,
		createdAt: toISOString(data.createdAt),
		updatedAt: toISOString(data.updatedAt),
	};
}

/**
 * CircleDocumentの配列をCirclePlainObjectの配列に変換
 *
 * @param dataArray Firestoreのサークルデータ配列
 * @returns プレーンオブジェクトの配列（変換失敗したものは除外）
 */
export function convertToCirclePlainObjects(dataArray: CircleDocument[]): CirclePlainObject[] {
	return dataArray
		.map((data) => convertToCirclePlainObject(data))
		.filter((circle): circle is CirclePlainObject => circle !== null);
}

/**
 * オブジェクトがCirclePlainObjectかどうかをチェック
 *
 * @param obj チェック対象のオブジェクト
 * @returns CirclePlainObjectの場合true
 */
export function isCirclePlainObject(obj: unknown): obj is CirclePlainObject {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"circleId" in obj &&
		"name" in obj &&
		"workCount" in obj &&
		typeof (obj as Record<string, unknown>).circleId === "string" &&
		typeof (obj as Record<string, unknown>).name === "string" &&
		typeof (obj as Record<string, unknown>).workCount === "number"
	);
}
