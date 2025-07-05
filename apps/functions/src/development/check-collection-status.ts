#!/usr/bin/env tsx

/**
 * DLsite収集状況をチェックするデバッグツール
 *
 * 使用方法:
 * pnpm tsx src/development/check-collection-status.ts
 */

import firestore from "../infrastructure/database/firestore";
import {
	checkCollectionCompleteness,
	generateQualityReport,
	getCurrentProgress,
} from "../services/dlsite/collection-monitor";
import * as logger from "../shared/logger";

async function checkCollectionStatus() {
	try {
		console.log("=== DLsite Collection Status Check ===\n");

		// 1. 現在の進捗状況を取得
		console.log("1. 現在の収集進捗:");
		const progress = await getCurrentProgress();
		if (progress) {
			console.log(`  - 期待作品数: ${progress.totalExpected}件`);
			console.log(`  - 収集済み: ${progress.totalCollected}件`);
			console.log(`  - 完全性: ${progress.completeness.toFixed(1)}%`);
			console.log(`  - 最終ページ: ${progress.lastPage}`);
			console.log(
				`  - 失敗ページ: ${progress.failedPages.length > 0 ? progress.failedPages.join(", ") : "なし"}`,
			);
			console.log(`  - 最終更新: ${progress.lastUpdated}\n`);
		} else {
			console.log("  進捗データが見つかりません\n");
		}

		// 2. 完全性チェック
		console.log("2. 完全性チェック:");
		const completenessCheck = await checkCollectionCompleteness();
		console.log(`  - 完了状態: ${completenessCheck.isComplete ? "✅ 完了" : "❌ 未完了"}`);
		if (completenessCheck.issues.length > 0) {
			console.log("  - 問題点:");
			completenessCheck.issues.forEach((issue) => {
				console.log(`    - ${issue}`);
			});
		}
		console.log();

		// 3. 品質レポート
		console.log("3. 品質レポート:");
		const qualityReport = await generateQualityReport();
		console.log(`  - 品質スコア: ${qualityReport.qualityScore}/100`);
		console.log("  - 推奨事項:");
		qualityReport.recommendations.forEach((rec) => {
			console.log(`    - ${rec}`);
		});
		console.log();

		// 4. Firestoreの実際の作品数を確認
		console.log("4. Firestoreの実データ:");
		// dlsiteWorksコレクションを確認（正しいコレクション名）
		const worksCollection = firestore.collection("dlsiteWorks");
		const snapshot = await worksCollection.count().get();
		const actualCount = snapshot.data().count;
		console.log(`  - 実際の作品数: ${actualCount}件`);

		// 欠損分析
		if (progress && actualCount < progress.totalExpected) {
			const missing = progress.totalExpected - actualCount;
			const missingPercent = (missing / progress.totalExpected) * 100;
			console.log(`  - 欠損作品数: ${missing}件 (${missingPercent.toFixed(1)}%)`);
		}

		// 5. 最近収集された作品をサンプリング
		console.log("\n5. 最近収集された作品（最新5件）:");
		const recentWorks = await worksCollection.orderBy("lastFetchedAt", "desc").limit(5).get();

		recentWorks.forEach((doc) => {
			const work = doc.data();
			console.log(`  - ${work.productId}: ${work.title} (${work.lastFetchedAt})`);
		});

		// 6. 特定の失敗パターンを調査
		if (progress && progress.failedPages.length > 0) {
			console.log("\n6. 失敗ページの詳細:");
			for (const page of progress.failedPages.slice(0, 5)) {
				console.log(`  - ページ ${page}: 再試行が必要`);
			}
		}

		// 7. データ収集の推奨アクション
		console.log("\n7. 推奨アクション:");
		if (actualCount < 1015) {
			console.log("  ⚠️  データ欠損が検出されました。以下の対策を検討してください:");
			console.log("     1. URL構築方法の確認（フィルターが原因の可能性）");
			console.log("     2. ページネーション処理の検証");
			console.log("     3. 失敗ページの再処理");
			console.log("     4. レート制限の確認");
		}
	} catch (error) {
		console.error("エラーが発生しました:", error);
		process.exit(1);
	} finally {
		// Firestoreの接続を終了
		await firestore.terminate();
		process.exit(0);
	}
}

// 実行
checkCollectionStatus();
