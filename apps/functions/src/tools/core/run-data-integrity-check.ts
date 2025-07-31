#!/usr/bin/env tsx
/**
 * データ整合性チェック手動実行スクリプト
 *
 * 使用方法:
 * pnpm check:integrity
 *
 * このスクリプトは本番環境のCloud Functionsで実行される
 * データ整合性チェック機能を手動でローカル実行するためのものです。
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import { checkDataIntegrity } from "../../endpoints/data-integrity-check";
import * as logger from "../../shared/logger";

/**
 * メイン実行関数
 */
async function main(): Promise<void> {
	try {
		logger.info("🔍 データ整合性チェック - 手動実行開始");
		logger.info("=====================================");

		// Cloud Functionsイベントを模擬
		const mockEvent: CloudEvent<unknown> = {
			specversion: "1.0",
			type: "manual.execution",
			source: "local-script",
			subject: "data-integrity-check",
			id: `manual-${Date.now()}`,
			time: new Date().toISOString(),
			datacontenttype: "application/json",
			data: {
				type: "data_integrity_check",
				description: "手動実行によるデータ整合性チェック",
			},
		};

		// データ整合性チェックを実行
		const startTime = Date.now();
		await checkDataIntegrity(mockEvent);
		const executionTime = Date.now() - startTime;

		logger.info("=====================================");
		logger.info(`✅ データ整合性チェック完了 (実行時間: ${(executionTime / 1000).toFixed(1)}秒)`);

		// 結果の確認方法を案内
		logger.info("\n📊 結果の確認:");
		logger.info("Firestoreコンソールで以下のパスを確認してください:");
		logger.info("- dlsiteMetadata/dataIntegrityCheck");
		logger.info("- dlsiteMetadata/dataIntegrityCheck/history");
	} catch (error) {
		logger.error("❌ データ整合性チェックエラー", { error });
		process.exit(1);
	}
}

// スクリプト実行
if (require.main === module) {
	main().catch((error) => {
		logger.error("Script execution error:", {
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	});
}
