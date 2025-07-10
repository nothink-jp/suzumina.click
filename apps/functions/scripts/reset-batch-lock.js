#!/usr/bin/env node

/**
 * DLsite統合データ収集のバッチ処理ロックを手動でリセットするスクリプト
 */

const { Firestore } = require("@google-cloud/firestore");

// Cloud Firestore初期化
const db = new Firestore();

async function resetBatchLock() {
	try {
		process.stdout.write("🔄 バッチ処理ロックをリセットしています...\n");

		const metadataRef = db.collection("dlsiteMetadata").doc("unified_data_collection_metadata");

		// 現在のメタデータを取得
		const doc = await metadataRef.get();
		if (!doc.exists) {
			process.stdout.write("❌ メタデータが存在しません\n");
			return;
		}

		const currentData = doc.data();
		process.stdout.write(
			`現在のメタデータ: ${JSON.stringify(
				{
					isInProgress: currentData.isInProgress,
					batchProcessingMode: currentData.batchProcessingMode,
					currentBatch: currentData.currentBatch,
					totalBatches: currentData.totalBatches,
					lastFetchedAt: currentData.lastFetchedAt?.toDate(),
					lastError: currentData.lastError,
				},
				null,
				2,
			)}\n`,
		);

		// ロックをリセット
		await metadataRef.update({
			isInProgress: false,
			batchProcessingMode: false,
			currentBatch: Firestore.FieldValue.delete(),
			totalBatches: Firestore.FieldValue.delete(),
			allWorkIds: Firestore.FieldValue.delete(),
			completedBatches: Firestore.FieldValue.delete(),
			currentBatchStartTime: Firestore.FieldValue.delete(),
			lastError: Firestore.FieldValue.delete(),
			lastFetchedAt: Firestore.Timestamp.now(),
		});

		process.stdout.write("✅ バッチ処理ロックをリセットしました\n");
	} catch (error) {
		process.stderr.write(`❌ エラーが発生しました: ${error}\n`);
	}
}

// スクリプト実行
resetBatchLock()
	.then(() => {
		process.stdout.write("🎉 スクリプト実行完了\n");
		process.exit(0);
	})
	.catch((error) => {
		process.stderr.write(`💥 スクリプトエラー: ${error}\n`);
		process.exit(1);
	});
