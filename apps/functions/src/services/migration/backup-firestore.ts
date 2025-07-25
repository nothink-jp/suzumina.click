/**
 * Firestore Backup Script for Entity V2 Migration
 *
 * このスクリプトはEntity V2移行前にFirestoreのバックアップを作成します。
 * GCP Cloud Storageにエクスポートを保存します。
 */

import { execSync } from "node:child_process";

interface BackupOptions {
	projectId: string;
	bucketName: string;
	collections: string[];
	dryRun?: boolean;
}

export class FirestoreBackupService {
	constructor(private readonly options: BackupOptions) {}

	/**
	 * Firestoreバックアップの実行
	 */
	async createBackup(): Promise<{ backupPath: string; timestamp: string }> {
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const backupPath = `gs://${this.options.bucketName}/entity-v2-migration/${timestamp}`;

		console.log("🔵 Firestoreバックアップを開始します...");
		console.log(`📍 プロジェクト: ${this.options.projectId}`);
		console.log(`📍 バックアップ先: ${backupPath}`);
		console.log(`📍 対象コレクション: ${this.options.collections.join(", ")}`);

		if (this.options.dryRun) {
			console.log("⚠️  ドライランモード: 実際のバックアップは実行されません");
			return { backupPath, timestamp };
		}

		try {
			// gcloudコマンドでFirestoreエクスポート
			const command = [
				"gcloud",
				"firestore",
				"export",
				backupPath,
				`--project=${this.options.projectId}`,
				`--collection-ids=${this.options.collections.join(",")}`,
			].join(" ");

			console.log("🚀 実行コマンド:", command);

			const output = execSync(command, { encoding: "utf-8" });
			console.log("✅ バックアップが完了しました");
			console.log(output);

			// バックアップ情報の記録
			await this.recordBackupMetadata(backupPath, timestamp);

			return { backupPath, timestamp };
		} catch (error) {
			console.error("❌ バックアップに失敗しました:", error);
			throw error;
		}
	}

	/**
	 * バックアップメタデータの記録
	 */
	private async recordBackupMetadata(backupPath: string, timestamp: string): Promise<void> {
		const metadata = {
			timestamp,
			backupPath,
			collections: this.options.collections,
			purpose: "entity-v2-migration",
			createdAt: new Date().toISOString(),
		};

		// メタデータをローカルファイルに保存
		const fs = await import("node:fs/promises");
		const metadataPath = `./backup-metadata-${timestamp}.json`;

		await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
		console.log(`📝 バックアップメタデータを保存しました: ${metadataPath}`);
	}

	/**
	 * バックアップの検証
	 */
	async verifyBackup(backupPath: string): Promise<boolean> {
		console.log("🔍 バックアップの検証を開始します...");

		try {
			// バックアップの存在確認
			const command = `gsutil ls ${backupPath}`;
			const output = execSync(command, { encoding: "utf-8" });

			if (output.includes(backupPath)) {
				console.log("✅ バックアップの存在を確認しました");
				return true;
			}

			console.error("❌ バックアップが見つかりません");
			return false;
		} catch (error) {
			console.error("❌ バックアップの検証に失敗しました:", error);
			return false;
		}
	}
}

// CLIとして実行する場合
if (require.main === module) {
	const args = process.argv.slice(2);
	const dryRun = args.includes("--dry-run");

	const projectId = process.env.GOOGLE_CLOUD_PROJECT || "suzumina-click";
	const bucketName = process.env.BACKUP_BUCKET || "suzumina-click-backup";

	const backupService = new FirestoreBackupService({
		projectId,
		bucketName,
		collections: ["videos", "audioButtons"],
		dryRun,
	});

	backupService
		.createBackup()
		.then(({ backupPath, timestamp }) => {
			console.log("✨ バックアップ完了");
			console.log(`📁 バックアップパス: ${backupPath}`);
			console.log(`🕐 タイムスタンプ: ${timestamp}`);
		})
		.catch((error) => {
			console.error("💥 バックアップ失敗:", error);
			process.exit(1);
		});
}
