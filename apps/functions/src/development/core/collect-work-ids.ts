/**
 * DLsite作品IDコレクター
 * 開発環境で作品IDを収集し、JSONファイルとして保存するツール
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { collectWorkIdsForDevelopment } from "../../services/dlsite/work-id-collector";
import * as logger from "../../shared/logger";

interface WorkIdCollectionResult {
	collectedAt: string;
	totalCount: number;
	pageCount: number;
	workIds: string[];
	metadata: {
		creatorName: string;
		searchUrl: string;
		environment: string;
	};
}

/**
 * 全作品IDを収集してJSONファイルに保存
 */
export async function collectAndSaveWorkIds(): Promise<void> {
	logger.info("🔍 作品ID収集を開始します...");

	try {
		// 共有サービスを使用して作品IDを収集
		const result = await collectWorkIdsForDevelopment();

		// 結果をJSONとして保存
		const outputData: WorkIdCollectionResult = {
			collectedAt: new Date().toISOString(),
			totalCount: result.totalCount,
			pageCount: result.pageCount,
			workIds: result.workIds,
			metadata: result.metadata,
		};

		// JSONファイルとして保存
		const outputPath = join(__dirname, "../../assets/dlsite-work-ids.json");
		writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

		logger.info(`✅ 作品ID収集完了: ${result.workIds.length}件`);
		logger.info(`📁 保存先: ${outputPath}`);
	} catch (error) {
		logger.error("作品ID収集中にエラーが発生しました:", error);
		throw error;
	}
}

// 直接実行された場合
if (require.main === module) {
	collectAndSaveWorkIds()
		.then(() => {
			logger.info("✨ 処理が完了しました");
			process.exit(0);
		})
		.catch((error) => {
			logger.error("❌ エラーが発生しました:", error);
			process.exit(1);
		});
}
