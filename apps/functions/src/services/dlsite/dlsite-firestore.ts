/**
 * DLsite作品データのFirestore操作ユーティリティ
 *
 * YouTube実装パターンに従い、DLsite作品データのFirestore保存・取得・更新を行います。
 */

import type { Query } from "@google-cloud/firestore";
import type { OptimizedFirestoreDLsiteWorkData, PriceHistory } from "@suzumina.click/shared-types";
import firestore from "../../infrastructure/database/firestore";
import * as logger from "../../shared/logger";

// Note: 最適化構造では mapToFirestoreData, filterWorksForUpdate, validateWorkData は不要

// Firestore関連の定数
const DLSITE_WORKS_COLLECTION = "dlsiteWorks";
const PRICE_HISTORY_COLLECTION = "priceHistory";

// 最適化構造では未使用の関数を削除

/**
 * 作品データをFirestoreに保存 (最適化構造対応)
 */
export async function saveWorksToFirestore(
	works: OptimizedFirestoreDLsiteWorkData[],
): Promise<void> {
	if (works.length === 0) {
		logger.info("保存する作品データがありません");
		return;
	}

	logger.info(`${works.length}件の作品データをFirestoreに保存開始`);

	// デバッグ: 特定作品IDの保存対象確認
	const debugWorkIds = ["RJ01037463", "RJ01415251", "RJ01020479"];
	debugWorkIds.forEach((workId) => {
		const work = works.find((w) => w.productId === workId);
		logger.info(`🔍 Firestore保存対象 ${workId}: ${work ? "✅ 含まれる" : "❌ 含まれない"}`, {
			workId,
			isIncluded: !!work,
			title: work?.title,
			circle: work?.circle,
		});
	});

	try {
		// バッチ処理の準備
		const batch = firestore.batch();
		const collection = firestore.collection(DLSITE_WORKS_COLLECTION);

		// 最適化構造データは既にFirestore形式なので直接保存
		let operationCount = 0;
		for (const work of works) {
			const docRef = collection.doc(work.productId);
			batch.set(docRef, work, { merge: true }); // マージオプションで部分更新対応
			operationCount++;

			// デバッグ: 特定作品IDの保存操作確認
			if (debugWorkIds.includes(work.productId)) {
				logger.info(`🔍 Firestore操作追加 ${work.productId}:`, {
					workId: work.productId,
					title: work.title,
					docPath: `${DLSITE_WORKS_COLLECTION}/${work.productId}`,
					operationCount,
				});
			}
		}

		// バッチ実行
		if (operationCount > 0) {
			logger.info(`🔄 Firestoreバッチ実行開始: ${operationCount}件`);

			if (operationCount > 500) {
				// 500件を超える場合は分割処理
				const chunks = chunkArray(works, 500);
				logger.info(`📦 大量データ分割処理: ${chunks.length}チャンク`);

				for (const [chunkIndex, chunk] of chunks.entries()) {
					const chunkBatch = firestore.batch();
					for (const work of chunk) {
						const docRef = collection.doc(work.productId);
						chunkBatch.set(docRef, work, { merge: true });
					}
					await chunkBatch.commit();
					logger.info(`✅ チャンク ${chunkIndex + 1}/${chunks.length} 完了: ${chunk.length}件`);
				}
			} else {
				await batch.commit();
				logger.info(`✅ 単一バッチ実行完了: ${operationCount}件`);
			}

			// デバッグ: 特定作品IDの保存完了確認
			debugWorkIds.forEach((workId) => {
				const work = works.find((w) => w.productId === workId);
				if (work) {
					logger.info(`🔍 Firestore保存完了 ${workId}: ✅ 成功`, {
						workId,
						title: work.title,
					});
				}
			});
		}

		logger.info(`Firestore保存完了: ${operationCount}件`);
	} catch (error) {
		logger.error("Firestore保存中にエラーが発生:", {
			error:
				error instanceof Error
					? {
							message: error.message,
							stack: error.stack,
							name: error.name,
						}
					: String(error),
			workCount: works.length,
			sampleWorkIds: works.slice(0, 3).map((w) => w.productId),
		});
		throw new Error(
			`作品データのFirestore保存に失敗: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * 既存の作品データを取得 (最適化構造対応)
 */
export async function getExistingWorksMap(
	productIds: string[],
): Promise<Map<string, OptimizedFirestoreDLsiteWorkData>> {
	const existingWorksMap = new Map<string, OptimizedFirestoreDLsiteWorkData>();

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
				const data = doc.data() as OptimizedFirestoreDLsiteWorkData;
				existingWorksMap.set(data.productId, data);
			}
		}

		logger.info(`既存作品データを取得: ${existingWorksMap.size}件`);
	} catch (error) {
		logger.error("既存作品データの取得に失敗:", {
			error:
				error instanceof Error
					? {
							message: error.message,
							stack: error.stack,
							name: error.name,
						}
					: String(error),
			productIds: productIds.slice(0, 5),
			productIdCount: productIds.length,
		});
		// エラーが発生しても処理は継続（全て新規作成として扱う）
	}

	return existingWorksMap;
}

// executeBatchInChunks関数は最適化構造では未使用のため削除

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
 * 特定の作品データを取得 (最適化構造対応)
 */
export async function getWorkFromFirestore(
	productId: string,
): Promise<OptimizedFirestoreDLsiteWorkData | null> {
	try {
		const doc = await firestore.collection(DLSITE_WORKS_COLLECTION).doc(productId).get();

		if (!doc.exists) {
			return null;
		}

		return doc.data() as OptimizedFirestoreDLsiteWorkData;
	} catch (error) {
		logger.error(`作品データの取得に失敗: ${productId}`, { error });
		throw new Error(`作品データの取得に失敗: ${productId}`);
	}
}

/**
 * 作品データの検索 (最適化構造対応)
 */
export async function searchWorksFromFirestore(options: {
	circle?: string;
	category?: string;
	limit?: number;
	orderBy?: "createdAt" | "updatedAt" | "price.current";
	orderDirection?: "asc" | "desc";
}): Promise<OptimizedFirestoreDLsiteWorkData[]> {
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

		const works: OptimizedFirestoreDLsiteWorkData[] = [];
		for (const doc of snapshot.docs) {
			works.push(doc.data() as OptimizedFirestoreDLsiteWorkData);
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
			const data = doc.data() as OptimizedFirestoreDLsiteWorkData;

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
