/**
 * dlsiteWorksコレクションの削除スクリプト
 *
 * 実行方法:
 * pnpm --filter @suzumina.click/functions tsx src/tools/cleanup-dlsiteworks-collection.ts
 *
 * 注意事項:
 * - worksコレクションへのマイグレーションが完了していることを確認してから実行すること
 * - このスクリプトは元に戻すことができない破壊的な操作です
 * - 実行前に必ずバックアップを確認すること
 */

import firestore from "../infrastructure/database/firestore";
import * as logger from "../shared/logger";

const COLLECTION_TO_DELETE = "dlsiteWorks";
const BATCH_SIZE = 400; // Firestore batch limit

async function deleteCollection(): Promise<void> {
	logger.info(`コレクション削除開始: ${COLLECTION_TO_DELETE}`);

	try {
		// 1. コレクションのドキュメント総数を確認
		const snapshot = await firestore.collection(COLLECTION_TO_DELETE).get();
		const totalDocs = snapshot.size;
		logger.info(`削除対象ドキュメント数: ${totalDocs}`);

		if (totalDocs === 0) {
			logger.info("削除対象のドキュメントが存在しません");
			return;
		}

		// 2. 最終確認
		logger.warn("⚠️  最終確認: このコレクションを削除してもよろしいですか？");
		logger.warn("この操作は元に戻すことができません！");
		logger.warn("10秒後に削除を開始します...");

		await new Promise((resolve) => setTimeout(resolve, 10000));

		// 3. バッチ処理でドキュメントを削除
		let deletedDocs = 0;
		let batch = firestore.batch();
		let batchCount = 0;

		for (const doc of snapshot.docs) {
			// サブコレクションも含めて削除
			const priceHistorySnapshot = await doc.ref.collection("priceHistory").get();
			for (const priceDoc of priceHistorySnapshot.docs) {
				batch.delete(priceDoc.ref);
				batchCount++;

				if (batchCount >= BATCH_SIZE) {
					await batch.commit();
					logger.info(`サブコレクション削除バッチコミット: ${batchCount}件`);
					batch = firestore.batch();
					batchCount = 0;
				}
			}

			// メインドキュメントを削除
			batch.delete(doc.ref);
			batchCount++;

			if (batchCount >= BATCH_SIZE) {
				await batch.commit();
				deletedDocs += batchCount;
				logger.info(
					`進捗: ${deletedDocs}件削除済み (${Math.round((deletedDocs / totalDocs) * 100)}%)`,
				);

				batch = firestore.batch();
				batchCount = 0;
			}
		}

		// 残りのドキュメントを削除
		if (batchCount > 0) {
			await batch.commit();
			deletedDocs += batchCount;
			logger.info(`進捗: ${deletedDocs}件削除済み (100%)`);
		}

		// 4. 検証: コレクションが空になったことを確認
		const verifySnapshot = await firestore.collection(COLLECTION_TO_DELETE).get();
		if (verifySnapshot.empty) {
			logger.info("✅ コレクションが正常に削除されました");
		} else {
			logger.error(`❌ ${verifySnapshot.size}件のドキュメントが残っています`);
		}
	} catch (error) {
		logger.error("削除中にエラーが発生しました:", error);
		throw error;
	}
}

// メイン処理
async function main(): Promise<void> {
	try {
		await deleteCollection();
		logger.info("🎉 削除処理が完了しました！");
		process.exit(0);
	} catch (error) {
		logger.error("エラーが発生しました:", error);
		process.exit(1);
	}
}

// スクリプト実行
if (require.main === module) {
	main().catch((error) => {
		logger.error("予期しないエラー:", error);
		process.exit(1);
	});
}
