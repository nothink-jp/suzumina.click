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
		logger.info("メタデータ状態リセット開始", { operation: "resetMetadataState" });

		// 現在の状態を確認
		const metadataRef = firestore.collection(METADATA_COLLECTION).doc(UNIFIED_METADATA_DOC_ID);
		const metadataDoc = await metadataRef.get();

		if (!metadataDoc.exists) {
			logger.warn("メタデータドキュメントが存在しません", { operation: "resetMetadataState" });
			return;
		}

		const currentMetadata = metadataDoc.data();
		logger.info("現在のメタデータ状態", {
			operation: "resetMetadataState",
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

		logger.info("メタデータ状態リセット完了", {
			operation: "resetMetadataState",
			message: "次回の統合データ収集処理が実行可能になりました",
		});
	} catch (error) {
		logger.error("メタデータリセットエラー", {
			operation: "resetMetadataState",
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

/**
 * メタデータドキュメントの取得
 */
async function fetchMetadataDocument(): Promise<FirebaseFirestore.DocumentData | null> {
	const metadataRef = firestore.collection(METADATA_COLLECTION).doc(UNIFIED_METADATA_DOC_ID);
	const metadataDoc = await metadataRef.get();

	if (!metadataDoc.exists) {
		logger.warn("メタデータドキュメントが存在しません", { operation: "showMetadataDetails" });
		return null;
	}

	return metadataDoc.data() || null;
}

/**
 * メタデータのログ出力用オブジェクトを構築
 */
function buildMetadataLogObject(metadata: FirebaseFirestore.DocumentData): Record<string, unknown> {
	return {
		operation: "showMetadataDetails",
		isInProgress: metadata?.isInProgress,
		lastFetchedAt: metadata?.lastFetchedAt?.toDate() || "N/A",
		lastSuccessfulCompleteFetch: metadata?.lastSuccessfulCompleteFetch?.toDate() || "N/A",
		totalWorks: metadata?.totalWorks || "N/A",
		processedWorks: metadata?.processedWorks || "N/A",
		basicDataUpdated: metadata?.basicDataUpdated || "N/A",
		timeSeriesCollected: metadata?.timeSeriesCollected || "N/A",
		unionTotalIds: metadata?.unionTotalIds || "N/A",
		regionOnlyIds: metadata?.regionOnlyIds || "N/A",
		assetOnlyIds: metadata?.assetOnlyIds || "N/A",
		regionDifferenceDetected: metadata?.regionDifferenceDetected || "N/A",
		lastError: metadata?.lastError || "N/A",
		unifiedSystemStarted: metadata?.unifiedSystemStarted?.toDate() || "N/A",
	};
}

/**
 * メタデータの詳細情報表示
 */
async function showMetadataDetails(): Promise<void> {
	try {
		logger.info("メタデータ詳細情報表示開始", { operation: "showMetadataDetails" });

		const metadata = await fetchMetadataDocument();
		if (!metadata) {
			return;
		}

		const logObject = buildMetadataLogObject(metadata);
		logger.info("統合データ収集メタデータ", logObject);
	} catch (error) {
		logger.error("メタデータ詳細表示エラー", {
			operation: "showMetadataDetails",
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/**
 * メイン実行関数
 */
async function main(): Promise<void> {
	try {
		logger.info("DLsite統合データ収集メタデータリセットツール開始", { operation: "main" });

		// 現在の状態を表示
		await showMetadataDetails();

		// 状態をリセット
		await resetMetadataState();

		// リセット後の状態を確認
		await showMetadataDetails();
	} catch (error) {
		logger.error("メイン処理エラー", {
			operation: "main",
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	}
}

// 外部から呼び出し可能にするためのエクスポート
export { resetMetadataState as resetUnifiedMetadata };

// スクリプト実行
if (require.main === module) {
	main().catch((error) => {
		logger.error("スクリプト実行エラー", {
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	});
}
