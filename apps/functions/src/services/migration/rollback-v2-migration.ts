/**
 * Entity V2 Migration Rollback Script
 *
 * このスクリプトはEntity V2移行をロールバックします。
 * _v2Migrationフィールドの削除、またはバックアップからの復元を行います。
 */

import { execSync } from "node:child_process";
import { getFirestore } from "../../infrastructure/database/firestore";

const FieldValue = {
	delete: () => "DELETE_FIELD" as any,
};

interface RollbackOptions {
	collections: string[];
	batchSize?: number;
	dryRun?: boolean;
	restoreFromBackup?: {
		backupPath: string;
		projectId: string;
	};
}

export class MigrationRollbackService {
	private readonly firestore = getFirestore();

	constructor(private readonly options: RollbackOptions) {
		this.options.batchSize = this.options.batchSize || 100;
	}

	/**
	 * ロールバックの実行
	 */
	async rollback(): Promise<void> {
		console.log("🔵 Entity V2移行のロールバックを開始します...");
		console.log(`📍 対象コレクション: ${this.options.collections.join(", ")}`);
		console.log(`📍 バッチサイズ: ${this.options.batchSize}`);
		console.log(`📍 ドライラン: ${this.options.dryRun ? "はい" : "いいえ"}`);

		if (this.options.restoreFromBackup) {
			await this.restoreFromBackup();
		} else {
			await this.rollbackMigrationFields();
		}
	}

	/**
	 * _v2Migrationフィールドの削除によるロールバック
	 */
	private async rollbackMigrationFields(): Promise<void> {
		const stats = {
			total: 0,
			processed: 0,
			failed: 0,
		};

		for (const collectionName of this.options.collections) {
			console.log(`\n📂 コレクション: ${collectionName}`);

			try {
				const collection = this.firestore.collection(collectionName);

				// _v2Migrationフィールドを持つドキュメントを取得
				const query = collection.where("_v2Migration", "!=", null);
				const snapshot = await query.get();

				stats.total += snapshot.size;
				console.log(`📊 対象ドキュメント数: ${snapshot.size}`);

				if (snapshot.empty) {
					console.log("✅ ロールバック対象のドキュメントはありません");
					continue;
				}

				// バッチ処理でフィールドを削除
				const docs = snapshot.docs;
				for (let i = 0; i < docs.length; i += this.options.batchSize!) {
					const batch = this.firestore.batch();
					const batchDocs = docs.slice(i, i + this.options.batchSize!);

					for (const doc of batchDocs) {
						if (this.options.dryRun) {
							console.log(`🔍 [DRY-RUN] ${doc.id} から _v2Migration を削除します`);
						} else {
							batch.update(doc.ref, {
								_v2Migration: FieldValue.delete(),
							});
						}
					}

					if (!this.options.dryRun) {
						try {
							await batch.commit();
							stats.processed += batchDocs.length;
							console.log(`✅ ${batchDocs.length}件のドキュメントをロールバックしました`);
						} catch (error) {
							stats.failed += batchDocs.length;
							console.error("❌ バッチ処理に失敗しました:", error);
						}
					} else {
						stats.processed += batchDocs.length;
					}

					// 進捗表示
					const progress = Math.round((stats.processed / stats.total) * 100);
					console.log(`📈 進捗: ${progress}% (${stats.processed}/${stats.total})`);
				}
			} catch (error) {
				console.error(`❌ コレクション ${collectionName} の処理中にエラーが発生しました:`, error);
			}
		}

		// 統計情報の表示
		console.log("\n📊 ロールバック統計:");
		console.log(`   総ドキュメント数: ${stats.total}`);
		console.log(`   処理済み: ${stats.processed}`);
		console.log(`   失敗: ${stats.failed}`);

		if (stats.failed > 0) {
			throw new Error(`${stats.failed}件のドキュメントのロールバックに失敗しました`);
		}
	}

	/**
	 * バックアップからの復元
	 */
	private async restoreFromBackup(): Promise<void> {
		if (!this.options.restoreFromBackup) {
			throw new Error("バックアップ情報が指定されていません");
		}

		const { backupPath, projectId } = this.options.restoreFromBackup;

		console.log("🔵 バックアップからの復元を開始します...");
		console.log(`📍 バックアップパス: ${backupPath}`);
		console.log(`📍 プロジェクトID: ${projectId}`);

		if (this.options.dryRun) {
			console.log("⚠️  ドライランモード: 実際の復元は実行されません");
			return;
		}

		// 確認プロンプト
		console.log("\n⚠️  警告: この操作は現在のデータを上書きします!");
		console.log("続行するには5秒お待ちください...");
		await new Promise((resolve) => setTimeout(resolve, 5000));

		try {
			const command = ["gcloud", "firestore", "import", backupPath, `--project=${projectId}`].join(
				" ",
			);

			console.log("🚀 実行コマンド:", command);

			const output = execSync(command, { encoding: "utf-8" });
			console.log("✅ 復元が完了しました");
			console.log(output);
		} catch (error) {
			console.error("❌ 復元に失敗しました:", error);
			throw error;
		}
	}

	/**
	 * ロールバック後の検証
	 */
	async verify(): Promise<boolean> {
		console.log("\n🔍 ロールバックの検証を開始します...");

		let hasV2Migration = false;

		for (const collectionName of this.options.collections) {
			const collection = this.firestore.collection(collectionName);
			const query = collection.where("_v2Migration", "!=", null).limit(1);
			const snapshot = await query.get();

			if (!snapshot.empty) {
				hasV2Migration = true;
				console.error(`❌ ${collectionName} に _v2Migration フィールドが残っています`);
			} else {
				console.log(`✅ ${collectionName} は正常にロールバックされました`);
			}
		}

		return !hasV2Migration;
	}
}

// CLIとして実行する場合
if (require.main === module) {
	const args = process.argv.slice(2);
	const dryRun = args.includes("--dry-run");
	const restoreBackup = args.includes("--restore-backup");

	let backupPath: string | undefined;
	if (restoreBackup) {
		const backupIndex = args.indexOf("--backup-path");
		if (backupIndex === -1 || !args[backupIndex + 1]) {
			console.error("❌ --restore-backup を使用する場合は --backup-path が必要です");
			process.exit(1);
		}
		backupPath = args[backupIndex + 1];
	}

	const rollbackService = new MigrationRollbackService({
		collections: ["videos", "audioButtons"],
		batchSize: 100,
		dryRun,
		restoreFromBackup: restoreBackup
			? {
					backupPath: backupPath!,
					projectId: process.env.GOOGLE_CLOUD_PROJECT || "suzumina-click",
				}
			: undefined,
	});

	rollbackService
		.rollback()
		.then(() => rollbackService.verify())
		.then((success) => {
			if (success) {
				console.log("✨ ロールバックが正常に完了しました");
			} else {
				console.error("⚠️  ロールバックは完了しましたが、検証に失敗しました");
				process.exit(1);
			}
		})
		.catch((error) => {
			console.error("💥 ロールバック失敗:", error);
			process.exit(1);
		});
}
