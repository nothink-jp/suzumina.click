/**
 * メタデータリセットツール
 *
 * 「前回の統合データ収集処理が完了していません」エラーを解決するため、
 * isInProgressフラグをリセットします
 */

import firestore from "../infrastructure/database/firestore";
import * as logger from "../shared/logger";

const UNIFIED_METADATA_DOC_ID = "unified_data_collection_metadata";
const METADATA_COLLECTION = "dlsiteMetadata";

/**
 * メタデータの状態をリセット
 */
async function resetMetadataState(): Promise<void> {
	try {
		console.log("🔄 メタデータ状態リセット開始...");

		// 現在の状態を確認
		const metadataRef = firestore.collection(METADATA_COLLECTION).doc(UNIFIED_METADATA_DOC_ID);
		const metadataDoc = await metadataRef.get();

		if (!metadataDoc.exists) {
			console.log("❌ メタデータドキュメントが存在しません");
			return;
		}

		const currentMetadata = metadataDoc.data();
		console.log("📋 現在のメタデータ状態:", {
			isInProgress: currentMetadata?.isInProgress,
			lastFetchedAt: currentMetadata?.lastFetchedAt?.toDate(),
			lastError: currentMetadata?.lastError,
			totalWorks: currentMetadata?.totalWorks,
			processedWorks: currentMetadata?.processedWorks,
		});

		// isInProgressフラグをリセット
		await metadataRef.update({
			isInProgress: false,
			lastError: null,
			currentBatch: null,
		});

		console.log("✅ メタデータ状態リセット完了");
		console.log("🚀 次回の統合データ収集処理が実行可能になりました");
	} catch (error) {
		console.error("❌ メタデータリセットエラー:", error);
		throw error;
	}
}

/**
 * メタデータの詳細情報表示
 */
async function showMetadataDetails(): Promise<void> {
	try {
		console.log("\n📊 メタデータ詳細情報:");

		const metadataRef = firestore.collection(METADATA_COLLECTION).doc(UNIFIED_METADATA_DOC_ID);
		const metadataDoc = await metadataRef.get();

		if (!metadataDoc.exists) {
			console.log("❌ メタデータドキュメントが存在しません");
			return;
		}

		const metadata = metadataDoc.data();
		console.log("📋 統合データ収集メタデータ:");
		console.log(`  isInProgress: ${metadata?.isInProgress}`);
		console.log(`  lastFetchedAt: ${metadata?.lastFetchedAt?.toDate() || "N/A"}`);
		console.log(
			`  lastSuccessfulCompleteFetch: ${metadata?.lastSuccessfulCompleteFetch?.toDate() || "N/A"}`,
		);
		console.log(`  totalWorks: ${metadata?.totalWorks || "N/A"}`);
		console.log(`  processedWorks: ${metadata?.processedWorks || "N/A"}`);
		console.log(`  basicDataUpdated: ${metadata?.basicDataUpdated || "N/A"}`);
		console.log(`  timeSeriesCollected: ${metadata?.timeSeriesCollected || "N/A"}`);
		console.log(`  unionTotalIds: ${metadata?.unionTotalIds || "N/A"}`);
		console.log(`  regionOnlyIds: ${metadata?.regionOnlyIds || "N/A"}`);
		console.log(`  assetOnlyIds: ${metadata?.assetOnlyIds || "N/A"}`);
		console.log(`  regionDifferenceDetected: ${metadata?.regionDifferenceDetected || "N/A"}`);
		console.log(`  lastError: ${metadata?.lastError || "N/A"}`);
		console.log(`  unifiedSystemStarted: ${metadata?.unifiedSystemStarted?.toDate() || "N/A"}`);
	} catch (error) {
		console.error("❌ メタデータ詳細表示エラー:", error);
	}
}

/**
 * メイン実行関数
 */
async function main(): Promise<void> {
	try {
		console.log("🛠️  DLsite統合データ収集メタデータリセットツール");

		// 現在の状態を表示
		await showMetadataDetails();

		// 状態をリセット
		await resetMetadataState();

		// リセット後の状態を確認
		await showMetadataDetails();
	} catch (error) {
		console.error("❌ メイン処理エラー:", error);
		process.exit(1);
	}
}

// スクリプト実行
if (require.main === module) {
	main().catch(console.error);
}
