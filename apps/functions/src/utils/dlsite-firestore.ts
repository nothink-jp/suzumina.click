/**
 * DLsite作品データのFirestore操作ユーティリティ
 *
 * YouTube実装パターンに従い、DLsite作品データのFirestore保存・取得・更新を行います。
 */

import type { CollectionReference, Query, WriteBatch } from "@google-cloud/firestore";
import type {
	DLsiteWorkBase,
	FirestoreDLsiteWorkData,
	PriceHistory,
	RankingInfo,
	SalesHistory,
} from "@suzumina.click/shared-types";
import { filterWorksForUpdate, mapToFirestoreData, validateWorkData } from "./dlsite-mapper";
import firestore from "./firestore";
import * as logger from "./logger";

// Firestore関連の定数
const DLSITE_WORKS_COLLECTION = "dlsiteWorks";
const PRICE_HISTORY_COLLECTION = "priceHistory";
const SALES_HISTORY_COLLECTION = "salesHistory";

/**
 * 新規作品をバッチに追加
 */
function addCreateOperationsToBatch(
	batch: WriteBatch,
	collection: CollectionReference,
	toCreate: DLsiteWorkBase[],
): number {
	let operationCount = 0;

	for (const work of toCreate) {
		const { isValid, warnings } = validateWorkData(work);

		if (!isValid) {
			logger.warn(`作品${work.productId}はデータ品質チェックに失敗したためスキップ:`, { warnings });
			continue;
		}

		if (warnings.length > 0) {
			logger.warn(`作品${work.productId}にデータ品質の警告:`, { warnings });
		}

		const firestoreData = mapToFirestoreData(work);
		const docRef = collection.doc(work.productId);
		batch.set(docRef, firestoreData);
		operationCount++;
	}

	return operationCount;
}

/**
 * 更新作品をバッチに追加
 */
function addUpdateOperationsToBatch(
	batch: WriteBatch,
	collection: CollectionReference,
	toUpdate: Array<{ new: DLsiteWorkBase; existing: FirestoreDLsiteWorkData }>,
): number {
	let operationCount = 0;

	for (const { new: newWork, existing } of toUpdate) {
		const { isValid, warnings } = validateWorkData(newWork);

		if (!isValid) {
			logger.warn(`作品${newWork.productId}はデータ品質チェックに失敗したためスキップ:`, {
				warnings,
			});
			continue;
		}

		if (warnings.length > 0) {
			logger.warn(`作品${newWork.productId}にデータ品質の警告:`, { warnings });
		}

		const firestoreData = mapToFirestoreData(newWork, existing);
		const docRef = collection.doc(newWork.productId);
		batch.update(docRef, firestoreData);
		operationCount++;
	}

	return operationCount;
}

/**
 * バッチ操作を実行
 */
async function executeBatchOperations(
	batch: WriteBatch,
	operationCount: number,
	toCreate: DLsiteWorkBase[],
	toUpdate: Array<{ new: DLsiteWorkBase; existing: FirestoreDLsiteWorkData }>,
	collection: CollectionReference,
	unchanged: DLsiteWorkBase[],
): Promise<void> {
	if (operationCount === 0) {
		logger.info("Firestoreに保存すべき変更がありません");
		return;
	}

	if (operationCount > 500) {
		// 500件を超える場合は分割して実行
		await executeBatchInChunks(toCreate, toUpdate, collection);
	} else {
		await batch.commit();
	}

	logger.info("Firestore保存完了:", {
		created: toCreate.length,
		updated: toUpdate.length,
		unchanged: unchanged.length,
		totalOperations: operationCount,
	});
}

/**
 * 作品データをFirestoreに保存
 */
export async function saveWorksToFirestore(works: DLsiteWorkBase[]): Promise<void> {
	if (works.length === 0) {
		logger.info("保存する作品データがありません");
		return;
	}

	logger.info(`${works.length}件の作品データをFirestoreに保存開始`);

	try {
		// 既存データを取得
		const existingWorksMap = await getExistingWorksMap(works.map((w) => w.productId));

		// 更新が必要な作品を判定
		const { toCreate, toUpdate, unchanged } = filterWorksForUpdate(works, existingWorksMap);

		// バッチ処理の準備
		const batch = firestore.batch();
		const collection = firestore.collection(DLSITE_WORKS_COLLECTION);

		// バッチ操作を追加
		const createCount = addCreateOperationsToBatch(batch, collection, toCreate);
		const updateCount = addUpdateOperationsToBatch(batch, collection, toUpdate);
		const totalOperationCount = createCount + updateCount;

		// バッチ実行
		await executeBatchOperations(
			batch,
			totalOperationCount,
			toCreate,
			toUpdate,
			collection,
			unchanged,
		);
	} catch (error) {
		logger.error("Firestore保存中にエラーが発生:", {
			error,
			workCount: works.length,
		});
		throw new Error("作品データのFirestore保存に失敗");
	}
}

/**
 * 既存の作品データを取得
 */
export async function getExistingWorksMap(
	productIds: string[],
): Promise<Map<string, FirestoreDLsiteWorkData>> {
	const existingWorksMap = new Map<string, FirestoreDLsiteWorkData>();

	if (productIds.length === 0) {
		return existingWorksMap;
	}

	try {
		const collection = firestore.collection(DLSITE_WORKS_COLLECTION);

		// Firestoreのin句制限（10件）を考慮して分割取得
		const chunks = chunkArray(productIds, 10);

		for (const chunk of chunks) {
			const snapshot = await collection.where("productId", "in", chunk).get();

			for (const doc of snapshot.docs) {
				const data = doc.data() as FirestoreDLsiteWorkData;
				existingWorksMap.set(data.productId, data);
			}
		}

		logger.info(`既存作品データを取得: ${existingWorksMap.size}件`);
	} catch (error) {
		logger.error("既存作品データの取得に失敗:", { error, productIds });
		// エラーが発生しても処理は継続（全て新規作成として扱う）
	}

	return existingWorksMap;
}

/**
 * 大量のバッチ操作を分割して実行
 */
async function executeBatchInChunks(
	toCreate: DLsiteWorkBase[],
	toUpdate: Array<{ new: DLsiteWorkBase; existing: FirestoreDLsiteWorkData }>,
	collection: CollectionReference,
): Promise<void> {
	const BATCH_SIZE = 500;

	// 作成操作
	const createChunks = chunkArray(toCreate, BATCH_SIZE);
	for (const chunk of createChunks) {
		const batch = firestore.batch();

		for (const work of chunk) {
			const firestoreData = mapToFirestoreData(work);
			const docRef = collection.doc(work.productId);
			batch.set(docRef, firestoreData);
		}

		await batch.commit();
		logger.info(`作成バッチ実行完了: ${chunk.length}件`);
	}

	// 更新操作
	const updateChunks = chunkArray(toUpdate, BATCH_SIZE);
	for (const chunk of updateChunks) {
		const batch = firestore.batch();

		for (const { new: newWork, existing } of chunk) {
			const firestoreData = mapToFirestoreData(newWork, existing);
			const docRef = collection.doc(newWork.productId);
			batch.update(docRef, firestoreData);
		}

		await batch.commit();
		logger.info(`更新バッチ実行完了: ${chunk.length}件`);
	}
}

/**
 * 配列を指定されたサイズのチャンクに分割
 */
function chunkArray<T>(array: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size));
	}
	return chunks;
}

/**
 * 特定の作品データを取得
 */
export async function getWorkFromFirestore(
	productId: string,
): Promise<FirestoreDLsiteWorkData | null> {
	try {
		const doc = await firestore.collection(DLSITE_WORKS_COLLECTION).doc(productId).get();

		if (!doc.exists) {
			return null;
		}

		return doc.data() as FirestoreDLsiteWorkData;
	} catch (error) {
		logger.error(`作品データの取得に失敗: ${productId}`, { error });
		throw new Error(`作品データの取得に失敗: ${productId}`);
	}
}

/**
 * 作品データの検索
 */
export async function searchWorksFromFirestore(options: {
	circle?: string;
	category?: string;
	limit?: number;
	orderBy?: "createdAt" | "updatedAt" | "price.current";
	orderDirection?: "asc" | "desc";
}): Promise<FirestoreDLsiteWorkData[]> {
	try {
		let query: Query = firestore.collection(DLSITE_WORKS_COLLECTION);

		// フィルター条件
		if (options.circle) {
			query = query.where("circle", "==", options.circle);
		}

		if (options.category) {
			query = query.where("category", "==", options.category);
		}

		// ソート
		if (options.orderBy) {
			query = query.orderBy(options.orderBy, options.orderDirection || "desc");
		}

		// 件数制限
		if (options.limit) {
			query = query.limit(options.limit);
		}

		const snapshot = await query.get();

		const works: FirestoreDLsiteWorkData[] = [];
		for (const doc of snapshot.docs) {
			works.push(doc.data() as FirestoreDLsiteWorkData);
		}

		logger.info(`作品検索完了: ${works.length}件取得`);
		return works;
	} catch (error) {
		logger.error("作品検索に失敗:", { error, options });
		throw new Error("作品検索に失敗");
	}
}

/**
 * 作品データの統計情報を取得
 */
export async function getWorksStatistics(): Promise<{
	totalWorks: number;
	lastUpdated: string | null;
	categoryCounts: Record<string, number>;
}> {
	try {
		const snapshot = await firestore.collection(DLSITE_WORKS_COLLECTION).get();

		let lastUpdated: string | null = null;
		const categoryCounts: Record<string, number> = {};

		for (const doc of snapshot.docs) {
			const data = doc.data() as FirestoreDLsiteWorkData;

			// 最終更新日時を追跡
			if (!lastUpdated || data.updatedAt > lastUpdated) {
				lastUpdated = data.updatedAt;
			}

			// カテゴリ別カウント
			const category = data.category || "不明";
			categoryCounts[category] = (categoryCounts[category] || 0) + 1;
		}

		const statistics = {
			totalWorks: snapshot.size,
			lastUpdated,
			categoryCounts,
		};

		logger.info("作品統計情報を取得:", statistics);
		return statistics;
	} catch (error) {
		logger.error("作品統計情報の取得に失敗:", { error });
		throw new Error("作品統計情報の取得に失敗");
	}
}

/**
 * 価格履歴を記録
 */
export async function savePriceHistory(
	productId: string,
	priceData: {
		currentPrice: number;
		originalPrice?: number;
		discountRate?: number;
		campaignEndDate?: string;
	},
): Promise<void> {
	try {
		const now = new Date();
		const timestamp = now.toISOString();

		const priceHistory: PriceHistory = {
			date: timestamp,
			price: priceData.currentPrice,
			originalPrice: priceData.originalPrice,
			discountRate: priceData.discountRate,
			saleType:
				priceData.originalPrice && priceData.originalPrice > priceData.currentPrice
					? "discount"
					: undefined,
		};

		// priceHistory/{productId}/snapshots/{timestamp} の構造で保存
		const docRef = firestore
			.collection(PRICE_HISTORY_COLLECTION)
			.doc(productId)
			.collection("snapshots")
			.doc(timestamp.replace(/[:.]/g, "-")); // Firestoreに適したID形式

		await docRef.set(priceHistory);

		logger.debug(`価格履歴を記録: ${productId} - ¥${priceData.currentPrice}`);
	} catch (error) {
		logger.error(`価格履歴の記録に失敗 (${productId}):`, { error });
		// 価格履歴の記録失敗は作品データ保存の妨げにしない
	}
}

/**
 * 作品の価格履歴を取得
 */
export async function getPriceHistory(productId: string): Promise<PriceHistory[]> {
	try {
		const snapshot = await firestore
			.collection(PRICE_HISTORY_COLLECTION)
			.doc(productId)
			.collection("snapshots")
			.orderBy("date", "desc")
			.limit(100) // 最新100件まで
			.get();

		const history: PriceHistory[] = [];
		for (const doc of snapshot.docs) {
			const data = doc.data() as PriceHistory;
			history.push(data);
		}

		logger.debug(`価格履歴を取得: ${productId} - ${history.length}件`);
		return history;
	} catch (error) {
		logger.error(`価格履歴の取得に失敗 (${productId}):`, { error });
		return [];
	}
}

/**
 * 販売履歴を記録
 */
export async function saveSalesHistory(
	productId: string,
	salesData: {
		salesCount?: number;
		totalDownloadCount?: number;
		rankingHistory?: RankingInfo[];
	},
): Promise<void> {
	try {
		const now = new Date();
		const timestamp = now.toISOString();

		// 販売数が存在する場合のみ記録
		if (salesData.salesCount !== undefined || salesData.totalDownloadCount !== undefined) {
			const salesHistory: SalesHistory = {
				date: timestamp,
				salesCount: salesData.salesCount || salesData.totalDownloadCount || 0,
				dailyAverage: undefined, // 後で計算可能
				rankingPosition: salesData.rankingHistory?.[0]?.rank, // 最新のランキング
			};

			// salesHistory/{productId}/snapshots/{timestamp} の構造で保存
			const docRef = firestore
				.collection(SALES_HISTORY_COLLECTION)
				.doc(productId)
				.collection("snapshots")
				.doc(timestamp.replace(/[:.]/g, "-"));

			await docRef.set(salesHistory);

			logger.debug(`販売履歴を記録: ${productId} - ${salesHistory.salesCount}本`);
		}

		// ランキング履歴も個別に記録
		if (salesData.rankingHistory && salesData.rankingHistory.length > 0) {
			const rankingPromises = salesData.rankingHistory.map(async (ranking) => {
				const rankingRef = firestore
					.collection(SALES_HISTORY_COLLECTION)
					.doc(productId)
					.collection("rankings")
					.doc(`${ranking.term}-${ranking.category}-${timestamp.replace(/[:.]/g, "-")}`);

				await rankingRef.set({
					...ranking,
					recordedAt: timestamp,
				});
			});

			await Promise.allSettled(rankingPromises);
			logger.debug(`ランキング履歴を記録: ${productId} - ${salesData.rankingHistory.length}件`);
		}
	} catch (error) {
		logger.error(`販売履歴の記録に失敗 (${productId}):`, { error });
		// 販売履歴の記録失敗は作品データ保存の妨げにしない
	}
}

/**
 * 作品の販売履歴を取得
 */
export async function getSalesHistory(productId: string): Promise<SalesHistory[]> {
	try {
		const snapshot = await firestore
			.collection(SALES_HISTORY_COLLECTION)
			.doc(productId)
			.collection("snapshots")
			.orderBy("date", "desc")
			.limit(100) // 最新100件まで
			.get();

		const history: SalesHistory[] = [];
		for (const doc of snapshot.docs) {
			const data = doc.data() as SalesHistory;
			history.push(data);
		}

		logger.debug(`販売履歴を取得: ${productId} - ${history.length}件`);
		return history;
	} catch (error) {
		logger.error(`販売履歴の取得に失敗 (${productId}):`, { error });
		return [];
	}
}

/**
 * 作品のランキング履歴を取得
 */
export async function getRankingHistory(productId: string): Promise<RankingInfo[]> {
	try {
		const snapshot = await firestore
			.collection(SALES_HISTORY_COLLECTION)
			.doc(productId)
			.collection("rankings")
			.orderBy("recordedAt", "desc")
			.limit(50) // 最新50件まで
			.get();

		const history: RankingInfo[] = [];
		for (const doc of snapshot.docs) {
			const data = doc.data();
			// recordedAtフィールドを除去してRankingInfo型に変換
			const { recordedAt: _, ...rankingData } = data;
			history.push(rankingData as RankingInfo);
		}

		logger.debug(`ランキング履歴を取得: ${productId} - ${history.length}件`);
		return history;
	} catch (error) {
		logger.error(`ランキング履歴の取得に失敗 (${productId}):`, { error });
		return [];
	}
}
