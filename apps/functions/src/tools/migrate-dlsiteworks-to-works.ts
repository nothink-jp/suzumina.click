/**
 * dlsiteWorksコレクションからworksコレクションへのマイグレーションスクリプト
 *
 * 実行方法:
 * pnpm --filter @suzumina.click/functions tsx src/tools/migrate-dlsiteworks-to-works.ts
 *
 * 注意事項:
 * - 本番環境で実行する前に必ずバックアップを取得すること
 * - ダウンタイム中に実行することを推奨
 * - 大量のFirestore読み書きオペレーションが発生するため、課金に注意
 */

import firestore from "../infrastructure/database/firestore";
import * as logger from "../shared/logger";

const SOURCE_COLLECTION = "dlsiteWorks";
const TARGET_COLLECTION = "works";
const BATCH_SIZE = 400; // Firestore batch limit
const SUBCOLLECTION_NAME = "priceHistory";

async function migrateSubcollections(sourceDocId: string, targetDocId: string): Promise<void> {
	const sourceSubcollection = firestore
		.collection(SOURCE_COLLECTION)
		.doc(sourceDocId)
		.collection(SUBCOLLECTION_NAME);

	const targetSubcollection = firestore
		.collection(TARGET_COLLECTION)
		.doc(targetDocId)
		.collection(SUBCOLLECTION_NAME);

	const snapshot = await sourceSubcollection.get();

	if (snapshot.empty) {
		return;
	}

	const batch = firestore.batch();
	let batchCount = 0;

	for (const doc of snapshot.docs) {
		const targetDocRef = targetSubcollection.doc(doc.id);
		batch.set(targetDocRef, doc.data());
		batchCount++;

		if (batchCount >= BATCH_SIZE) {
			await batch.commit();
			logger.info(`サブコレクション ${SUBCOLLECTION_NAME} のバッチコミット完了: ${batchCount}件`);
			batchCount = 0;
		}
	}

	if (batchCount > 0) {
		await batch.commit();
		logger.info(`サブコレクション ${SUBCOLLECTION_NAME} の最終バッチコミット完了: ${batchCount}件`);
	}
}

async function migrateCollection(): Promise<void> {
	logger.info(`マイグレーション開始: ${SOURCE_COLLECTION} → ${TARGET_COLLECTION}`);

	try {
		// 1. ソースコレクションのドキュメント総数を確認
		const sourceSnapshot = await firestore.collection(SOURCE_COLLECTION).get();
		const totalDocs = sourceSnapshot.size;
		logger.info(`総ドキュメント数: ${totalDocs}`);

		if (totalDocs === 0) {
			logger.warn("ソースコレクションにドキュメントが存在しません");
			return;
		}

		// 2. バッチ処理でドキュメントをコピー
		let processedDocs = 0;
		let batch = firestore.batch();
		let batchCount = 0;

		for (const doc of sourceSnapshot.docs) {
			const targetDocRef = firestore.collection(TARGET_COLLECTION).doc(doc.id);
			batch.set(targetDocRef, doc.data());
			batchCount++;

			// サブコレクションのマイグレーション
			await migrateSubcollections(doc.id, doc.id);

			if (batchCount >= BATCH_SIZE) {
				await batch.commit();
				processedDocs += batchCount;
				logger.info(
					`進捗: ${processedDocs}/${totalDocs} (${Math.round((processedDocs / totalDocs) * 100)}%)`,
				);

				batch = firestore.batch();
				batchCount = 0;
			}
		}

		// 残りのドキュメントをコミット
		if (batchCount > 0) {
			await batch.commit();
			processedDocs += batchCount;
			logger.info(`進捗: ${processedDocs}/${totalDocs} (100%)`);
		}

		logger.info("マイグレーション完了！");
		logger.info(`処理したドキュメント数: ${processedDocs}`);

		// 3. 検証: ターゲットコレクションのドキュメント数を確認
		const targetSnapshot = await firestore.collection(TARGET_COLLECTION).get();
		logger.info(`ターゲットコレクションのドキュメント数: ${targetSnapshot.size}`);

		if (sourceSnapshot.size === targetSnapshot.size) {
			logger.info("✅ ドキュメント数が一致しました");
		} else {
			logger.error("❌ ドキュメント数が一致しません！");
			logger.error(`ソース: ${sourceSnapshot.size}, ターゲット: ${targetSnapshot.size}`);
		}
	} catch (error) {
		logger.error("マイグレーション中にエラーが発生しました:", error);
		throw error;
	}
}

// メイン処理
async function main(): Promise<void> {
	try {
		// 確認プロンプト
		logger.warn("⚠️  警告: このスクリプトは本番データを変更します！");
		logger.warn(`ソース: ${SOURCE_COLLECTION}`);
		logger.warn(`ターゲット: ${TARGET_COLLECTION}`);
		logger.warn("続行しますか？ (5秒後に自動的に開始します...)");

		// 5秒間の待機時間を設ける
		await new Promise((resolve) => setTimeout(resolve, 5000));

		await migrateCollection();

		logger.info("🎉 すべての処理が完了しました！");
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
