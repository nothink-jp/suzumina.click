/**
 * DLsite作品データのFirestore操作ユーティリティ
 *
 * YouTube実装パターンに従い、DLsite作品データのFirestore保存・取得・更新を行います。
 */

import type { Query } from "@google-cloud/firestore";
import type { OptimizedFirestoreDLsiteWorkData } from "@suzumina.click/shared-types";
import firestore from "../../infrastructure/database/firestore";
import { chunkArray } from "../../shared/array-utils";
import * as logger from "../../shared/logger";
import { FAILURE_REASONS, trackMultipleFailedWorks } from "./failure-tracker";

// Note: 最適化構造では mapToFirestoreData, filterWorksForUpdate, validateWorkData は不要

// Firestore関連の定数
const DLSITE_WORKS_COLLECTION = "dlsiteWorks";

/**
 * デバッグ用作品IDログ出力
 */
function logDebugWorkIds(works: OptimizedFirestoreDLsiteWorkData[], phase: string): void {
	const debugWorkIds = ["RJ01037463", "RJ01415251", "RJ01020479"];
	debugWorkIds.forEach((workId) => {
		const work = works.find((w) => w.productId === workId);
		logger.info(`🔍 ${phase} ${workId}: ${work ? "✅ 含まれる" : "❌ 含まれない"}`, {
			workId,
			isIncluded: !!work,
			title: work?.title,
			circle: work?.circle,
		});
	});
}

/**
 * 単一チャンクのバッチ処理
 */
async function processChunk(
	chunk: OptimizedFirestoreDLsiteWorkData[],
	chunkIndex: number,
	totalChunks: number,
): Promise<void> {
	const collection = firestore.collection(DLSITE_WORKS_COLLECTION);
	const chunkBatch = firestore.batch();

	for (const work of chunk) {
		const docRef = collection.doc(work.productId);
		chunkBatch.set(docRef, work, { merge: true });
	}

	const startTime = Date.now();
	await chunkBatch.commit();
	const duration = Date.now() - startTime;

	logger.info(
		`✅ チャンク ${chunkIndex + 1}/${totalChunks} 完了: ${chunk.length}件 (${duration}ms)`,
	);
}

/**
 * チャンク処理失敗をハンドリング
 */
async function handleChunkFailure(
	chunk: OptimizedFirestoreDLsiteWorkData[],
	chunkIndex: number,
	chunkError: unknown,
): Promise<void> {
	logger.error(`❌ チャンク ${chunkIndex + 1} 失敗:`, {
		chunkIndex: chunkIndex + 1,
		chunkSize: chunk.length,
		sampleWorkIds: chunk.slice(0, 3).map((w) => w.productId),
		error:
			chunkError instanceof Error
				? {
						message: chunkError.message,
						name: chunkError.name,
					}
				: String(chunkError),
	});

	// 失敗した作品IDを追跡システムに記録
	try {
		const failures = chunk.map((work) => ({
			workId: work.productId,
			reason:
				chunkError instanceof Error && chunkError.message.includes("DEADLINE_EXCEEDED")
					? FAILURE_REASONS.TIMEOUT
					: FAILURE_REASONS.UNKNOWN,
			errorDetails: chunkError instanceof Error ? chunkError.message : String(chunkError),
		}));
		await trackMultipleFailedWorks(failures);
	} catch (trackError) {
		logger.warn("失敗追跡記録エラー:", { trackError });
	}
}

/**
 * 分割バッチ処理
 */
async function processChunkedBatch(works: OptimizedFirestoreDLsiteWorkData[]): Promise<void> {
	const chunks = chunkArray(works, 50);
	logger.info(`📦 分割バッチ処理: ${chunks.length}チャンク (50件/チャンク)`);

	let successfulChunks = 0;
	let failedChunks = 0;

	for (const [chunkIndex, chunk] of chunks.entries()) {
		try {
			await processChunk(chunk, chunkIndex, chunks.length);
			successfulChunks++;

			// チャンク間で負荷分散待機（200ms）
			if (chunkIndex < chunks.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, 200));
			}
		} catch (chunkError) {
			failedChunks++;
			await handleChunkFailure(chunk, chunkIndex, chunkError);
		}
	}

	logger.info(`📊 分割バッチ処理完了: 成功${successfulChunks}件, 失敗${failedChunks}件`);

	// 全チャンクが失敗した場合のみエラーを投げる
	if (failedChunks > 0 && successfulChunks === 0) {
		throw new Error(`全${failedChunks}チャンクが失敗しました`);
	}
}

/**
 * 単一バッチ処理
 */
async function processSingleBatch(works: OptimizedFirestoreDLsiteWorkData[]): Promise<void> {
	const batch = firestore.batch();
	const collection = firestore.collection(DLSITE_WORKS_COLLECTION);

	for (const work of works) {
		const docRef = collection.doc(work.productId);
		batch.set(docRef, work, { merge: true });
	}

	const startTime = Date.now();
	await batch.commit();
	const duration = Date.now() - startTime;
	logger.info(`✅ 単一バッチ実行完了: ${works.length}件 (${duration}ms)`);
}

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
	logDebugWorkIds(works, "Firestore保存対象");

	try {
		logger.info(`🔄 Firestoreバッチ実行開始: ${works.length}件`);

		if (works.length > 50) {
			await processChunkedBatch(works);
		} else {
			await processSingleBatch(works);
		}

		logDebugWorkIds(works, "Firestore保存完了");
		logger.info(`Firestore保存完了: ${works.length}件`);
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

// 配列分割ユーティリティは shared/array-utils.ts から import

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
