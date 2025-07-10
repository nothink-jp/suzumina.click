/**
 * Firestoreから作品の年齢カテゴリ情報を確認するデバッグツール
 */

import { Firestore } from "@google-cloud/firestore";
import * as logger from "../shared/logger";

const firestore = new Firestore({
	projectId: process.env.GOOGLE_CLOUD_PROJECT || "suzumina-click",
});

async function checkAgeCategories() {
	logger.info("年齢カテゴリ確認開始", { operation: "checkAgeCategories" });

	try {
		// 最初の10件を取得
		const snapshot = await firestore.collection("dlsiteWorks").limit(10).get();

		const ageCategoryStats = new Map<string, number>();

		snapshot.forEach((doc) => {
			const data = doc.data();
			const ageRating = data.ageRating;

			logger.info("作品情報", {
				workId: doc.id,
				title: data.title,
				ageRating,
				dataSources: data.dataSources ? Object.keys(data.dataSources) : "none",
			});

			// 統計を集計
			const key = ageRating || "undefined";
			ageCategoryStats.set(key, (ageCategoryStats.get(key) || 0) + 1);
		});

		const statsArray = Array.from(ageCategoryStats.entries()).map(([ageRating, count]) => ({
			ageRating,
			count,
		}));
		logger.info("年齢カテゴリ統計（サンプル10件）", {
			operation: "checkAgeCategories",
			stats: statsArray,
		});

		// 全体の統計も取得
		const allSnapshot = await firestore.collection("dlsiteWorks").get();
		const totalStats = new Map<string, number>();

		allSnapshot.forEach((doc) => {
			const data = doc.data();
			const ageRating = data.ageRating || "undefined";
			totalStats.set(ageRating, (totalStats.get(ageRating) || 0) + 1);
		});

		const totalStatsArray = Array.from(totalStats.entries()).map(([ageRating, count]) => ({
			ageRating,
			count,
		}));
		logger.info("年齢カテゴリ統計（全作品）", {
			operation: "checkAgeCategories",
			totalStats: totalStatsArray,
			totalWorks: allSnapshot.size,
		});
	} catch (error) {
		logger.error("年齢カテゴリ確認エラー", {
			operation: "checkAgeCategories",
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

// 実行
checkAgeCategories()
	.then(() => {
		logger.info("年齢カテゴリ確認完了", { operation: "checkAgeCategories" });
		process.exit(0);
	})
	.catch((error) => {
		logger.error("スクリプト実行失敗", {
			operation: "checkAgeCategories",
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	});
