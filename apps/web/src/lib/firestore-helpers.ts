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
 * ネストされたオブジェクトに値を設定
 * @example setNestedValue({ stats: {} }, "stats.count", 5) => { stats: { count: 5 } }
 */
function _setNestedValue(
	obj: Record<string, unknown>,
	path: string,
	value: unknown,
): Record<string, unknown> {
	const keys = path.split(".");
	const result = { ...obj };
	let current: Record<string, unknown> = result;

	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i];
		if (!key) continue;
		if (!current[key] || typeof current[key] !== "object") {
			current[key] = {};
		}
		current = current[key] as Record<string, unknown>;
	}

	const lastKey = keys[keys.length - 1];
	if (lastKey) {
		current[lastKey] = value;
	}
	return result;
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

/**
 * 複数のカウンターを一括で更新
 *
 * @example
 * ```typescript
 * await batchUpdateCounters("audioButtons", buttonId, [
 *   { field: "stats.playCount", increment: 1 },
 *   { field: "stats.totalDuration", increment: 30 }
 * ]);
 * ```
 */
export async function batchUpdateCounters(
	collection: string,
	docId: string,
	updates: Array<{
		field: string;
		increment: number;
		min?: number;
		max?: number;
	}>,
	options?: {
		updateTimestamp?: boolean;
		timestampField?: string;
	},
): Promise<{ success: boolean; error?: string; newValues?: Record<string, number> }> {
	const { updateTimestamp = true, timestampField = "updatedAt" } = options || {};

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

			// Helper function to calculate new value with constraints
			const calculateNewValue = (
				currentRaw: unknown,
				increment: number,
				min?: number,
				max?: number,
			): number => {
				const current = typeof currentRaw === "number" ? currentRaw : 0;
				let newVal = current + increment;
				if (min !== undefined) newVal = Math.max(min, newVal);
				if (max !== undefined) newVal = Math.min(max, newVal);
				return newVal;
			};

			const newValues: Record<string, number> = {};
			const updateData: Record<string, unknown> = {};

			// 各カウンターの更新を計算
			for (const update of updates) {
				const currentValueRaw = getNestedValue(currentData, update.field);
				const newValue = calculateNewValue(
					currentValueRaw,
					update.increment,
					update.min,
					update.max,
				);
				updateData[update.field] = newValue;
				newValues[update.field] = newValue;
			}

			// タイムスタンプを追加
			if (updateTimestamp) {
				updateData[timestampField] = new Date().toISOString();
			}

			transaction.update(docRef, updateData);

			return newValues;
		});

		return { success: true, newValues: result };
	} catch (error) {
		logger.error("複数カウンター更新エラー", {
			collection,
			docId,
			updates,
			error: error instanceof Error ? error.message : String(error),
		});

		return {
			success: false,
			error: "カウンターの更新に失敗しました",
		};
	}
}

/**
 * ドキュメントの存在チェック
 */
export async function documentExists(collection: string, docId: string): Promise<boolean> {
	try {
		const firestore = getFirestore();
		const doc = await firestore.collection(collection).doc(docId).get();
		return doc.exists;
	} catch (error) {
		logger.error("ドキュメント存在チェックエラー", {
			collection,
			docId,
			error: error instanceof Error ? error.message : String(error),
		});
		return false;
	}
}

/**
 * バッチ処理用ヘルパー（500件制限対応）
 *
 * @example
 * ```typescript
 * await processBatch(docs, 500, async (batch, chunk) => {
 *   for (const doc of chunk) {
 *     batch.update(doc.ref, { processed: true });
 *   }
 * });
 * ```
 */
export async function processBatch<T>(
	items: T[],
	batchSize: number,
	processor: (batch: FirebaseFirestore.WriteBatch, chunk: T[]) => Promise<void> | void,
): Promise<{ success: boolean; processedCount: number; error?: string }> {
	try {
		const firestore = getFirestore();
		let processedCount = 0;

		for (let i = 0; i < items.length; i += batchSize) {
			const chunk = items.slice(i, Math.min(i + batchSize, items.length));
			const batch = firestore.batch();

			await processor(batch, chunk);
			await batch.commit();

			processedCount += chunk.length;

			// 大量処理時のログ
			if (processedCount % 1000 === 0 || processedCount === items.length) {
				logger.info(`バッチ処理進捗: ${processedCount}/${items.length}`);
			}
		}

		return { success: true, processedCount };
	} catch (error) {
		logger.error("バッチ処理エラー", {
			totalItems: items.length,
			error: error instanceof Error ? error.message : String(error),
		});

		return {
			success: false,
			processedCount: 0,
			error: "バッチ処理に失敗しました",
		};
	}
}

/**
 * ページネーション用のクエリヘルパー
 *
 * @example
 * ```typescript
 * const result = await paginatedQuery({
 *   collection: "audioButtons",
 *   where: [["isPublic", "==", true]],
 *   orderBy: { field: "createdAt", direction: "desc" },
 *   limit: 20,
 *   page: 2
 * });
 * ```
 */
export async function paginatedQuery<
	T extends Record<string, unknown> = Record<string, unknown>,
>(options: {
	collection: string;
	where?: Array<[string, FirebaseFirestore.WhereFilterOp, unknown]>;
	orderBy?: {
		field: string;
		direction: "asc" | "desc";
	};
	limit: number;
	page: number;
}): Promise<{
	success: boolean;
	data?: T[];
	hasMore?: boolean;
	totalCount?: number;
	error?: string;
}> {
	try {
		const firestore = getFirestore();
		let query: FirebaseFirestore.Query = firestore.collection(options.collection);

		// WHERE条件を適用
		if (options.where) {
			for (const [field, op, value] of options.where) {
				query = query.where(field, op, value);
			}
		}

		// ORDER BY を適用
		if (options.orderBy) {
			query = query.orderBy(options.orderBy.field, options.orderBy.direction);
		}

		// 総件数を取得（カウントクエリ）
		const countSnapshot = await query.count().get();
		const totalCount = countSnapshot.data().count;

		// ページネーション計算
		const offset = (options.page - 1) * options.limit;
		const hasMore = offset + options.limit < totalCount;

		// オフセットを適用してデータ取得
		if (offset > 0) {
			const offsetSnapshot = await query.limit(offset).get();
			if (offsetSnapshot.docs.length > 0) {
				const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
				query = query.startAfter(lastDoc);
			}
		}

		// データ取得
		const snapshot = await query.limit(options.limit).get();
		const data = snapshot.docs.map((doc) => {
			const docData = doc.data() as T;
			return {
				...docData,
				id: doc.id,
			} as T;
		});

		return {
			success: true,
			data,
			hasMore,
			totalCount,
		};
	} catch (error) {
		logger.error("ページネーションクエリエラー", {
			...options,
			error: error instanceof Error ? error.message : String(error),
		});

		return {
			success: false,
			error: "データの取得に失敗しました",
		};
	}
}

/**
 * 条件付き更新（楽観的ロック）
 *
 * @example
 * ```typescript
 * await conditionalUpdate(
 *   "products",
 *   productId,
 *   (data) => data.stock > 0, // 在庫がある場合のみ
 *   (data) => ({ stock: data.stock - 1 }) // 在庫を1減らす
 * );
 * ```
 */
export async function conditionalUpdate<
	T extends Record<string, unknown> = Record<string, unknown>,
>(
	collection: string,
	docId: string,
	condition: (data: T) => boolean,
	updater: (data: T) => Partial<T>,
	options?: {
		maxRetries?: number;
		updateTimestamp?: boolean;
	},
): Promise<{
	success: boolean;
	error?: string;
	conditionMet?: boolean;
}> {
	const { maxRetries = 3, updateTimestamp = true } = options || {};

	let retryCount = 0;

	while (retryCount < maxRetries) {
		try {
			const firestore = getFirestore();
			const docRef = firestore.collection(collection).doc(docId);

			const result = await firestore.runTransaction(async (transaction) => {
				const doc = await transaction.get(docRef);

				if (!doc.exists) {
					throw new Error("ドキュメントが見つかりません");
				}

				const data = doc.data() as T;

				// 条件チェック
				if (!condition(data)) {
					return { conditionMet: false };
				}

				// 更新データを生成
				const updates = updater(data);

				if (updateTimestamp) {
					(updates as Record<string, unknown>).updatedAt = new Date().toISOString();
				}

				transaction.update(docRef, updates as FirebaseFirestore.UpdateData<T>);

				return { conditionMet: true };
			});

			return {
				success: true,
				conditionMet: result.conditionMet,
			};
		} catch (error) {
			retryCount++;

			// トランザクション競合の場合はリトライ
			if (
				error instanceof Error &&
				error.message.includes("contention") &&
				retryCount < maxRetries
			) {
				await new Promise((resolve) => setTimeout(resolve, 2 ** retryCount * 100));
				continue;
			}

			logger.error("条件付き更新エラー", {
				collection,
				docId,
				retryCount,
				error: error instanceof Error ? error.message : String(error),
			});

			return {
				success: false,
				error: "更新に失敗しました",
			};
		}
	}

	return {
		success: false,
		error: "最大リトライ回数に達しました",
	};
}
