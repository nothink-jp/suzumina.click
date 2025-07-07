/**
 * 時系列データ用Firestore操作
 * 生データ（7日保持）と日次集計データ（永続）の管理
 */

import { FieldValue } from "@google-cloud/firestore";
import type {
	RegionalPrice,
	TimeSeriesDailyAggregate,
	TimeSeriesRawData,
} from "@suzumina.click/shared-types";
import firestore, { Timestamp } from "../../infrastructure/database/firestore";
import * as logger from "../../shared/logger";

/**
 * Firestore時系列コレクション名
 */
export const TIMESERIES_COLLECTIONS = {
	/** 生データ（7日間保持） */
	RAW_DATA: "dlsite_timeseries_raw",
	/** 日次集計データ（永続保存） */
	DAILY_AGGREGATES: "dlsite_timeseries_daily",
	/** 価格履歴チャート（キャッシュ） */
	PRICE_CHARTS: "dlsite_price_charts",
	/** ランキング履歴チャート（キャッシュ） */
	RANKING_CHARTS: "dlsite_ranking_charts",
} as const;

/**
 * 生データをFirestoreに保存
 */
export async function saveTimeSeriesRawData(data: TimeSeriesRawData): Promise<void> {
	try {
		const collection = firestore.collection(TIMESERIES_COLLECTIONS.RAW_DATA);

		// ドキュメントID: {workId}_{YYYY-MM-DD}_{HH-mm-ss}
		const docId = `${data.workId}_${data.date}_${data.time.replace(/:/g, "-")}`;

		// タイムスタンプをFirestore Timestampに変換
		const firestoreData = {
			...data,
			timestamp: Timestamp.fromDate(new Date(data.timestamp)),
			createdAt: FieldValue.serverTimestamp(),
		};

		await collection.doc(docId).set(firestoreData);

		logger.info("時系列生データ保存完了", {
			operation: "saveTimeSeriesRawData",
			workId: data.workId,
			date: data.date,
			time: data.time,
			docId,
		});
	} catch (error) {
		logger.error("時系列生データ保存エラー", {
			operation: "saveTimeSeriesRawData",
			workId: data.workId,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

/**
 * 複数の生データを一括保存
 */
export async function saveMultipleTimeSeriesRawData(dataArray: TimeSeriesRawData[]): Promise<void> {
	if (dataArray.length === 0) return;

	try {
		const batch = firestore.batch();
		const collection = firestore.collection(TIMESERIES_COLLECTIONS.RAW_DATA);

		for (const data of dataArray) {
			const docId = `${data.workId}_${data.date}_${data.time.replace(/:/g, "-")}`;
			const docRef = collection.doc(docId);

			const firestoreData = {
				...data,
				timestamp: Timestamp.fromDate(new Date(data.timestamp)),
				createdAt: FieldValue.serverTimestamp(),
			};

			batch.set(docRef, firestoreData);
		}

		await batch.commit();

		logger.info("時系列生データ一括保存完了", {
			operation: "saveMultipleTimeSeriesRawData",
			count: dataArray.length,
			workIds: [...new Set(dataArray.map((d) => d.workId))],
		});
	} catch (error) {
		logger.error("時系列生データ一括保存エラー", {
			operation: "saveMultipleTimeSeriesRawData",
			count: dataArray.length,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

/**
 * 指定日の生データを取得
 */
export async function getTimeSeriesRawDataByDate(
	workId: string,
	date: string,
): Promise<TimeSeriesRawData[]> {
	try {
		const collection = firestore.collection(TIMESERIES_COLLECTIONS.RAW_DATA);

		const snapshot = await collection
			.where("workId", "==", workId)
			.where("date", "==", date)
			.orderBy("timestamp")
			.get();

		if (snapshot.empty) {
			return [];
		}

		const rawData: TimeSeriesRawData[] = [];
		for (const doc of snapshot.docs) {
			const data = doc.data();
			// Firestore TimestampをISO文字列に変換
			const timestamp =
				data.timestamp instanceof Timestamp
					? data.timestamp.toDate().toISOString()
					: data.timestamp;

			rawData.push({
				...data,
				timestamp,
			} as TimeSeriesRawData);
		}

		return rawData;
	} catch (error) {
		logger.error("時系列生データ取得エラー", {
			operation: "getTimeSeriesRawDataByDate",
			workId,
			date,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

/**
 * 生データから日次集計データを生成
 */
function aggregateRawDataToDaily(
	rawDataArray: TimeSeriesRawData[],
): TimeSeriesDailyAggregate | null {
	if (rawDataArray.length === 0) return null;

	const firstData = rawDataArray[0];
	if (!firstData) return null;

	// 最低価格を取得（各通貨別）
	const lowestPrices: RegionalPrice = {
		JP: Math.min(...rawDataArray.map((d) => d.regionalPrices.JP).filter((p) => p > 0)),
		US: Math.min(...rawDataArray.map((d) => d.regionalPrices.US).filter((p) => p > 0)),
		EU: Math.min(...rawDataArray.map((d) => d.regionalPrices.EU).filter((p) => p > 0)),
		CN: Math.min(...rawDataArray.map((d) => d.regionalPrices.CN).filter((p) => p > 0)),
		TW: Math.min(...rawDataArray.map((d) => d.regionalPrices.TW).filter((p) => p > 0)),
		KR: Math.min(...rawDataArray.map((d) => d.regionalPrices.KR).filter((p) => p > 0)),
	};

	// 各フィールドの最大値を取得
	const maxDiscountRate = Math.max(...rawDataArray.map((d) => d.discountRate));
	const activeCampaignIds = [
		...new Set(
			rawDataArray.map((d) => d.campaignId).filter((id): id is number => id !== undefined),
		),
	];

	const salesCounts = rawDataArray
		.map((d) => d.salesCount)
		.filter((c): c is number => c !== undefined);
	const wishlistCounts = rawDataArray
		.map((d) => d.wishlistCount)
		.filter((c): c is number => c !== undefined);
	const ratingsAverage = rawDataArray
		.map((d) => d.ratingAverage)
		.filter((r): r is number => r !== undefined);
	const ratingsCounts = rawDataArray
		.map((d) => d.ratingCount)
		.filter((c): c is number => c !== undefined);

	// ランキング（数値が小さいほど上位なので最小値を取得）
	const rankDays = rawDataArray.map((d) => d.rankDay).filter((r): r is number => r !== undefined);
	const rankWeeks = rawDataArray.map((d) => d.rankWeek).filter((r): r is number => r !== undefined);
	const rankMonths = rawDataArray
		.map((d) => d.rankMonth)
		.filter((r): r is number => r !== undefined);

	// タイムスタンプの最初と最後
	const timestamps = rawDataArray.map((d) => d.time).sort();

	return {
		workId: firstData.workId,
		date: firstData.date,
		lowestPrices,
		maxDiscountRate,
		activeCampaignIds,
		maxSalesCount: salesCounts.length > 0 ? Math.max(...salesCounts) : undefined,
		maxWishlistCount: wishlistCounts.length > 0 ? Math.max(...wishlistCounts) : undefined,
		bestRankDay: rankDays.length > 0 ? Math.min(...rankDays) : undefined,
		bestRankWeek: rankWeeks.length > 0 ? Math.min(...rankWeeks) : undefined,
		bestRankMonth: rankMonths.length > 0 ? Math.min(...rankMonths) : undefined,
		maxRatingAverage: ratingsAverage.length > 0 ? Math.max(...ratingsAverage) : undefined,
		maxRatingCount: ratingsCounts.length > 0 ? Math.max(...ratingsCounts) : undefined,
		dataPointCount: rawDataArray.length,
		firstCaptureTime: timestamps[0] || "",
		lastCaptureTime: timestamps[timestamps.length - 1] || "",
	};
}

/**
 * 指定日の生データから日次集計データを生成・保存
 */
export async function generateAndSaveDailyAggregate(workId: string, date: string): Promise<void> {
	try {
		// 1. 生データを取得
		const rawData = await getTimeSeriesRawDataByDate(workId, date);
		if (rawData.length === 0) {
			logger.warn("日次集計用の生データが見つかりません", {
				operation: "generateAndSaveDailyAggregate",
				workId,
				date,
			});
			return;
		}

		// 2. 日次集計データを生成
		const aggregate = aggregateRawDataToDaily(rawData);
		if (!aggregate) {
			logger.error("日次集計データの生成に失敗", {
				operation: "generateAndSaveDailyAggregate",
				workId,
				date,
			});
			return;
		}

		// 3. Firestoreに保存
		const collection = firestore.collection(TIMESERIES_COLLECTIONS.DAILY_AGGREGATES);
		const docId = `${workId}_${date}`;

		const firestoreData = {
			...aggregate,
			createdAt: FieldValue.serverTimestamp(),
			updatedAt: FieldValue.serverTimestamp(),
		};

		await collection.doc(docId).set(firestoreData, { merge: true });

		logger.info("日次集計データ保存完了", {
			operation: "generateAndSaveDailyAggregate",
			workId,
			date,
			dataPointCount: aggregate.dataPointCount,
			docId,
		});
	} catch (error) {
		logger.error("日次集計データ生成・保存エラー", {
			operation: "generateAndSaveDailyAggregate",
			workId,
			date,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

/**
 * 7日前より古い生データを削除
 */
export async function deleteExpiredRawData(): Promise<number> {
	try {
		const collection = firestore.collection(TIMESERIES_COLLECTIONS.RAW_DATA);

		// 7日前の日付を計算
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
		const cutoffTimestamp = Timestamp.fromDate(sevenDaysAgo);

		// 古いデータを検索
		const snapshot = await collection
			.where("timestamp", "<", cutoffTimestamp)
			.limit(500) // バッチ削除のため制限
			.get();

		if (snapshot.empty) {
			return 0;
		}

		// バッチ削除
		const batch = firestore.batch();
		for (const doc of snapshot.docs) {
			batch.delete(doc.ref);
		}

		await batch.commit();

		logger.info("期限切れ生データ削除完了", {
			operation: "deleteExpiredRawData",
			deletedCount: snapshot.size,
			cutoffDate: sevenDaysAgo.toISOString().split("T")[0],
		});

		return snapshot.size;
	} catch (error) {
		logger.error("期限切れ生データ削除エラー", {
			operation: "deleteExpiredRawData",
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

/**
 * 指定作品の日次集計データを期間指定で取得
 */
export async function getDailyAggregates(
	workId: string,
	startDate: string,
	endDate: string,
): Promise<TimeSeriesDailyAggregate[]> {
	try {
		const collection = firestore.collection(TIMESERIES_COLLECTIONS.DAILY_AGGREGATES);

		const snapshot = await collection
			.where("workId", "==", workId)
			.where("date", ">=", startDate)
			.where("date", "<=", endDate)
			.orderBy("date")
			.get();

		if (snapshot.empty) {
			return [];
		}

		return snapshot.docs.map((doc) => doc.data() as TimeSeriesDailyAggregate);
	} catch (error) {
		logger.error("日次集計データ取得エラー", {
			operation: "getDailyAggregates",
			workId,
			startDate,
			endDate,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

/**
 * 全作品の過去N日分の日次集計データを一括処理
 */
export async function batchProcessDailyAggregates(days = 1): Promise<void> {
	try {
		const rawCollection = firestore.collection(TIMESERIES_COLLECTIONS.RAW_DATA);

		// 処理対象の日付を生成
		const targetDates: string[] = [];
		for (let i = 0; i < days; i++) {
			const date = new Date();
			date.setDate(date.getDate() - i);
			targetDates.push(date.toISOString().split("T")[0] || "");
		}

		// 各日付の作品IDを取得
		const workIdsByDate = new Map<string, Set<string>>();

		for (const date of targetDates) {
			const snapshot = await rawCollection.where("date", "==", date).select("workId").get();

			const workIds = new Set<string>();
			for (const doc of snapshot.docs) {
				const data = doc.data();
				if (data.workId && typeof data.workId === "string") {
					workIds.add(data.workId);
				}
			}

			workIdsByDate.set(date, workIds);
		}

		// 各作品・日付の組み合わせで日次集計を実行
		let processedCount = 0;
		for (const [date, workIds] of workIdsByDate.entries()) {
			for (const workId of workIds) {
				await generateAndSaveDailyAggregate(workId, date);
				processedCount++;
			}
		}

		logger.info("日次集計一括処理完了", {
			operation: "batchProcessDailyAggregates",
			days,
			targetDates,
			processedCount,
		});
	} catch (error) {
		logger.error("日次集計一括処理エラー", {
			operation: "batchProcessDailyAggregates",
			days,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}
