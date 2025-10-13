"use server";

import { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";

/**
 * ネストされたオブジェクトから値を取得
 * @example getNestedValue({ stats: { count: 5 } }, "stats.count") => 5
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
	return path.split(".").reduce<unknown>((current, key) => {
		if (typeof current === "object" && current !== null) {
			return (current as Record<string, unknown>)[key];
		}
		return undefined;
	}, obj);
}

/**
 * Firestoreドキュメントのカウンターフィールドを原子的に更新する汎用関数
 *
 * @example
 * ```typescript
 * // いいね数を増やす
 * await updateCounter("audioButtons", buttonId, "stats.likeCount", 1);
 *
 * // いいね数を減らす（最小値0）
 * await updateCounter("audioButtons", buttonId, "stats.likeCount", -1, { min: 0 });
 *
 * // 在庫数を減らす（最小値0、最大値100）
 * await updateCounter("products", productId, "stock", -1, { min: 0, max: 100 });
 * ```
 */
export async function updateCounter(
	collection: string,
	docId: string,
	fieldPath: string,
	increment: number,
	options?: {
		/** 最小値（デフォルト: 制限なし） */
		min?: number;
		/** 最大値（デフォルト: 制限なし） */
		max?: number;
		/** 更新時にタイムスタンプを自動更新するか（デフォルト: true） */
		updateTimestamp?: boolean;
		/** タイムスタンプフィールド名（デフォルト: "updatedAt"） */
		timestampField?: string;
	},
): Promise<{ success: boolean; error?: string; newValue?: number }> {
	const { min, max, updateTimestamp = true, timestampField = "updatedAt" } = options || {};

	try {
		const firestore = getFirestore();
		const docRef = firestore.collection(collection).doc(docId);

		const result = await firestore.runTransaction(async (transaction) => {
			const doc = await transaction.get(docRef);

			if (!doc.exists) {
				throw new Error("ドキュメントが見つかりません");
			}

			const currentData = doc.data();
			if (!currentData) {
				throw new Error("データが無効です");
			}

			// 現在値を取得（ネストされたパスに対応）
			const currentValueRaw = getNestedValue(currentData, fieldPath);
			const currentValue = typeof currentValueRaw === "number" ? currentValueRaw : 0;
			let newValue = currentValue + increment;

			// 最小値・最大値の制約を適用
			if (min !== undefined) {
				newValue = Math.max(min, newValue);
			}
			if (max !== undefined) {
				newValue = Math.min(max, newValue);
			}

			// 更新データを構築
			const updates: Record<string, unknown> = {
				[fieldPath]: newValue,
			};

			if (updateTimestamp) {
				updates[timestampField] = new Date().toISOString();
			}

			transaction.update(docRef, updates);

			return newValue;
		});

		return { success: true, newValue: result };
	} catch (error) {
		logger.error("カウンター更新エラー", {
			collection,
			docId,
			fieldPath,
			increment,
			error: error instanceof Error ? error.message : String(error),
		});

		return {
			success: false,
			error: "カウンターの更新に失敗しました",
		};
	}
}
