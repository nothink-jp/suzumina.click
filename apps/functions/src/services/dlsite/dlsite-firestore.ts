/**
 * DLsite作品データのFirestore操作ユーティリティ
 *
 * YouTube実装パターンに従い、DLsite作品データのFirestore保存・取得・更新を行います。
 */

import type { Query } from "@google-cloud/firestore";
import type { WorkDocument } from "@suzumina.click/shared-types";
import firestore from "../../infrastructure/database/firestore";
import { chunkArray } from "../../shared/array-utils";
import * as logger from "../../shared/logger";
import { FAILURE_REASONS, trackMultipleFailedWorks } from "./failure-tracker";

// Note: 最適化構造では mapToFirestoreData, filterWorksForUpdate, validateWorkData は不要

// Firestore関連の定数
const DLSITE_WORKS_COLLECTION = "works";

/**
 * 単一チャンクのバッチ処理
 */
async function processChunk(
	chunk: WorkDocument[],
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
	chunk: WorkDocument[],
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
async function processChunkedBatch(works: WorkDocument[]): Promise<void> {
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
async function processSingleBatch(works: WorkDocument[]): Promise<void> {
	const batch = firestore.batch();
	const collection = firestore.collection(DLSITE_WORKS_COLLECTION);

	for (const work of works) {
		const docRef = collection.doc(work.productId);
		batch.set(docRef, work, { merge: true });
	}

	await batch.commit();
	// 単一バッチ実行完了ログは省略（ログ削減）
}

// 最適化構造では未使用の関数を削除

/**
 * 作品データをFirestoreに保存 (最適化構造対応)
 */
export async function saveWorksToFirestore(works: WorkDocument[]): Promise<void> {
	if (works.length === 0) {
		logger.info("保存する作品データがありません");
		return;
	}

	logger.info(`${works.length}件の作品データをFirestoreに保存開始`);

	try {
		logger.info(`🔄 Firestoreバッチ実行開始: ${works.length}件`);

		if (works.length > 50) {
			await processChunkedBatch(works);
		} else {
			await processSingleBatch(works);
		}

		// Firestore保存完了ログは省略（ログ削減）
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
 * 既存の作品データを効率的に取得 (読み取り最適化対応)
 */
export async function getExistingWorksMap(
	productIds: string[],
): Promise<Map<string, WorkDocument>> {
	const existingWorksMap = new Map();

	if (productIds.length === 0) {
		return existingWorksMap;
	}

	try {
		const collection = firestore.collection(DLSITE_WORKS_COLLECTION);

		// 読み取り最適化: バッチサイズを30に増加（Firestore in句限界内で最大効率）
		const chunks = chunkArray(productIds, 30);

		logger.info(`既存作品データ取得開始: ${productIds.length}件を${chunks.length}チャンクで処理`);

		// 並列処理で読み取り時間を短縮
		const chunkPromises = chunks.map(async (chunk, index) => {
			const snapshot = await collection.where("productId", "in", chunk).get();

			const chunkResults = new Map<string, WorkDocument>();
			for (const doc of snapshot.docs) {
				const data = doc.data() as WorkDocument;
				chunkResults.set(data.productId, data);
			}

			logger.debug(
				`チャンク ${index + 1}/${chunks.length}: ${chunkResults.size}/${chunk.length}件が既存`,
			);
			return chunkResults;
		});

		// 全チャンクの結果を並列実行で取得
		const chunkResults = await Promise.all(chunkPromises);

		// 結果をマージ
		for (const chunkResult of chunkResults) {
			for (const [productId, data] of chunkResult) {
				existingWorksMap.set(productId, data);
			}
		}

		logger.info(
			`既存作品データ取得完了: ${existingWorksMap.size}/${productIds.length}件が既存 (読み取り数: ${chunks.length}クエリ)`,
		);
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

/**
 * 特定の作品IDが存在するかを効率的にチェック (存在確認のみ)
 */
export async function checkWorkExists(productId: string): Promise<boolean> {
	try {
		const collection = firestore.collection(DLSITE_WORKS_COLLECTION);
		const docRef = collection.doc(productId);
		const docSnapshot = await docRef.get();

		return docSnapshot.exists;
	} catch (error) {
		logger.error(`作品存在確認エラー: ${productId}`, { error });
		return false;
	}
}

/**
 * 複数の作品IDの存在確認を効率的に実行
 */
export async function checkMultipleWorksExist(productIds: string[]): Promise<Map<string, boolean>> {
	const existenceMap = new Map();

	if (productIds.length === 0) {
		return existenceMap;
	}

	try {
		const collection = firestore.collection(DLSITE_WORKS_COLLECTION);

		// バッチサイズ30で存在確認（データ取得なし）
		const chunks = chunkArray(productIds, 30);

		const chunkPromises = chunks.map(async (chunk) => {
			const snapshot = await collection.where("productId", "in", chunk).get();

			const chunkResults = new Map();
			// 全IDをfalseで初期化
			for (const id of chunk) {
				chunkResults.set(id, false);
			}
			// 存在するIDをtrueに更新
			for (const doc of snapshot.docs) {
				const data = doc.data() as WorkDocument;
				chunkResults.set(data.productId, true);
			}

			return chunkResults;
		});

		const chunkResults = await Promise.all(chunkPromises);

		// 結果をマージ
		for (const chunkResult of chunkResults) {
			for (const [productId, exists] of chunkResult) {
				existenceMap.set(productId, exists);
			}
		}

		logger.info(
			`作品存在確認完了: ${productIds.length}件中${Array.from(existenceMap.values()).filter(Boolean).length}件が既存`,
		);
	} catch (error) {
		logger.error("作品存在確認エラー:", { error, productIdCount: productIds.length });
		// エラー時は全てfalse（新規として扱う）
		for (const id of productIds) {
			existenceMap.set(id, false);
		}
	}

	return existenceMap;
}

// executeBatchInChunks関数は最適化構造では未使用のため削除

// 配列分割ユーティリティは shared/array-utils.ts から import

/**
 * 特定の作品データを取得 (最適化構造対応)
 */
export async function getWorkFromFirestore(productId: string): Promise<WorkDocument | null> {
	try {
		const doc = await firestore.collection(DLSITE_WORKS_COLLECTION).doc(productId).get();

		if (!doc.exists) {
			return null;
		}

		return doc.data() as WorkDocument;
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
}): Promise<WorkDocument[]> {
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

		const works: WorkDocument[] = [];
		for (const doc of snapshot.docs) {
			works.push(doc.data() as WorkDocument);
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
			const data = doc.data() as WorkDocument;

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
