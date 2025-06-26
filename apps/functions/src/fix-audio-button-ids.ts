/**
 * Cloud Function: audioButtonsコレクションの空のidフィールドを修正
 *
 * 一度だけ実行する修正用関数
 * URL: https://us-central1-suzumina-click.cloudfunctions.net/fixAudioButtonIds
 */

import type { Request, Response } from "@google-cloud/functions-framework";
import firestore from "./utils/firestore";
import * as logger from "./utils/logger";

export async function fixAudioButtonIds(request: Request, response: Response) {
	// セキュリティ: 管理者のみ実行可能
	const authHeader = request.headers.authorization;
	const expectedToken = process.env.ADMIN_SECRET_TOKEN;

	if (!authHeader || !expectedToken || authHeader !== `Bearer ${expectedToken}`) {
		logger.warn("fixAudioButtonIds: 不正なアクセス試行", {
			ip: request.ip,
			userAgent: request.headers["user-agent"],
		});
		response.status(401).json({ error: "Unauthorized" });
		return;
	}

	logger.info("fixAudioButtonIds: 修正処理開始");

	try {
		const db = firestore;

		// 全ての audioButtons ドキュメントを取得
		const snapshot = await db.collection("audioButtons").get();

		if (snapshot.empty) {
			logger.info("fixAudioButtonIds: ドキュメントが見つかりませんでした");
			response.json({
				success: true,
				message: "audioButtonsコレクションにドキュメントが見つかりませんでした",
				fixed: 0,
				skipped: 0,
				total: 0,
			});
			return;
		}

		logger.info(`fixAudioButtonIds: ${snapshot.size} 件のドキュメントを確認中`);

		let fixedCount = 0;
		let skippedCount = 0;
		const results: Array<{ id: string; title: string; action: "fixed" | "skipped" }> = [];

		// バッチ処理で更新
		let batch = db.batch();
		let batchCount = 0;
		const BATCH_SIZE = 500;

		for (const doc of snapshot.docs) {
			const data = doc.data();

			// idフィールドが空文字列または存在しない場合のみ修正
			if (!data.id || data.id === "" || data.id === null) {
				logger.info(`fixAudioButtonIds: 修正対象 ${doc.id}`, {
					title: data.title || "タイトルなし",
					currentId: data.id,
				});

				// ドキュメントIDをidフィールドに設定
				batch.update(doc.ref, {
					id: doc.id,
					updatedAt: new Date().toISOString(),
				});

				results.push({
					id: doc.id,
					title: data.title || "タイトルなし",
					action: "fixed",
				});

				fixedCount++;
				batchCount++;

				// バッチサイズに達したら実行
				if (batchCount >= BATCH_SIZE) {
					logger.info(`fixAudioButtonIds: ${batchCount} 件のバッチを実行中`);
					await batch.commit();
					batch = db.batch(); // 新しいバッチを作成
					batchCount = 0;
				}
			} else {
				logger.debug(`fixAudioButtonIds: スキップ ${doc.id}`, {
					currentId: data.id,
				});

				results.push({
					id: doc.id,
					title: data.title || "タイトルなし",
					action: "skipped",
				});

				skippedCount++;
			}
		}

		// 残りのバッチを実行
		if (batchCount > 0) {
			logger.info(`fixAudioButtonIds: 最終バッチ ${batchCount} 件を実行中`);
			await batch.commit();
		}

		logger.info("fixAudioButtonIds: 修正完了", {
			fixed: fixedCount,
			skipped: skippedCount,
			total: snapshot.size,
		});

		response.json({
			success: true,
			message: "audioButtonsのIDフィールド修正が完了しました",
			fixed: fixedCount,
			skipped: skippedCount,
			total: snapshot.size,
			details: results,
		});
	} catch (error) {
		logger.error("fixAudioButtonIds: エラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		response.status(500).json({
			success: false,
			error: "内部サーバーエラーが発生しました",
			message: error instanceof Error ? error.message : String(error),
		});
	}
}
