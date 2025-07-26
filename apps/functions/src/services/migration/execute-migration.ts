/**
 * Entity V2 Production Migration Executor
 *
 * 本番環境でのEntity V2移行を安全に実行するためのスクリプト
 * バックアップ、ドライラン、段階的移行、検証を統合的に管理します
 */

import { FirestoreBackupService } from "./backup-firestore";
import { DryRunReportGenerator } from "./dry-run-report";
import { EntityMigrationService } from "./entity-migration";
import { MigrationRollbackService } from "./rollback-v2-migration";
import { MigrationValidationService } from "./validate-v2-migration";

interface MigrationPlan {
	phase: "prepare" | "dry-run" | "backup" | "migrate" | "validate" | "rollback";
	collections?: string[];
	maxDocuments?: number;
	skipBackup?: boolean;
	skipDryRun?: boolean;
}

export class ProductionMigrationExecutor {
	private readonly projectId: string;
	private readonly bucketName: string;
	private backupPath?: string;
	private migrationTimestamp?: string;

	constructor() {
		this.projectId = process.env.GOOGLE_CLOUD_PROJECT || "suzumina-click";
		this.bucketName = process.env.BACKUP_BUCKET || "suzumina-click-backup";
	}

	/**
	 * 移行計画の実行
	 */
	async execute(plan: MigrationPlan): Promise<void> {
		console.log("🚀 Entity V2 本番移行を開始します");
		console.log(`📍 フェーズ: ${plan.phase}`);
		console.log(`📍 プロジェクト: ${this.projectId}`);

		try {
			switch (plan.phase) {
				case "prepare":
					await this.prepare();
					break;
				case "dry-run":
					await this.dryRun(plan);
					break;
				case "backup":
					await this.backup(plan);
					break;
				case "migrate":
					await this.migrate(plan);
					break;
				case "validate":
					await this.validate(plan);
					break;
				case "rollback":
					await this.rollback(plan);
					break;
				default:
					throw new Error(`不明なフェーズ: ${plan.phase}`);
			}
		} catch (error) {
			console.error("❌ 移行中にエラーが発生しました:", error);
			throw error;
		}
	}

	/**
	 * 準備フェーズ
	 */
	private async prepare(): Promise<void> {
		console.log("\n📋 準備フェーズ");
		console.log("=".repeat(50));

		// 環境変数の確認
		console.log("1️⃣ 環境変数の確認");
		const requiredEnvVars = ["GOOGLE_CLOUD_PROJECT", "GOOGLE_APPLICATION_CREDENTIALS"];
		const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

		if (missingVars.length > 0) {
			throw new Error(`必要な環境変数が設定されていません: ${missingVars.join(", ")}`);
		}

		// gcloudの認証確認
		console.log("2️⃣ gcloud認証の確認");
		const { execSync } = await import("node:child_process");
		try {
			execSync("gcloud auth list", { stdio: "ignore" });
			console.log("✅ gcloud認証OK");
		} catch {
			throw new Error("gcloudが認証されていません。'gcloud auth login'を実行してください");
		}

		// バックアップバケットの確認
		console.log("3️⃣ バックアップバケットの確認");
		try {
			execSync(`gsutil ls gs://${this.bucketName}`, { stdio: "ignore" });
			console.log("✅ バックアップバケットOK");
		} catch {
			console.warn(`⚠️  バケット ${this.bucketName} にアクセスできません`);
		}

		console.log("\n✅ 準備完了！");
	}

	/**
	 * ドライランフェーズ
	 */
	private async dryRun(plan: MigrationPlan): Promise<void> {
		console.log("\n🔍 ドライランフェーズ");
		console.log("=".repeat(50));

		const migrationService = new EntityMigrationService();

		const collections = plan.collections || ["videos", "audioButtons"];
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const reportPath = `dry-run-report-${timestamp}.txt`;

		console.log(`📊 レポート出力先: ${reportPath}`);

		const allStats = [];
		for (const collection of collections) {
			const collectionConfig = {
				videos: collection === "videos",
				audioButtons: collection === "audioButtons",
			};
			const report = await migrationService.migrate({
				collections: collectionConfig,
				dryRun: true,
				batchSize: 100,
				maxDocuments: plan.maxDocuments,
			});
			const stats =
				collection === "videos" ? report.collections.videos : report.collections.audioButtons;
			allStats.push({ collection, stats });
		}

		// レポート生成
		const reportGenerator = new DryRunReportGenerator();
		const migrationReport = {
			startTime: new Date(),
			endTime: new Date(),
			dryRun: true,
			collections: {
				videos: allStats.find((s) => s.collection === "videos")?.stats || {
					total: 0,
					migrated: 0,
					failed: 0,
					skipped: 0,
					errors: [],
				},
				audioButtons: allStats.find((s) => s.collection === "audioButtons")?.stats || {
					total: 0,
					migrated: 0,
					failed: 0,
					skipped: 0,
					errors: [],
				},
			},
		};
		const dryRunReport = await reportGenerator.generateReport(migrationReport);

		const fs = await import("node:fs/promises");
		await fs.writeFile(
			reportPath,
			dryRunReport.summary + "\n\n" + dryRunReport.recommendations.join("\n"),
		);

		console.log("\n✅ ドライラン完了！");
		console.log(`📄 詳細レポート: ${reportPath}`);

		// エラー率の確認
		const totalErrors = allStats.reduce((sum, { stats }) => sum + (stats?.failed || 0), 0);
		const totalDocs = allStats.reduce((sum, { stats }) => sum + (stats?.total || 0), 0);
		const errorRate = totalDocs > 0 ? (totalErrors / totalDocs) * 100 : 0;

		console.log(`\n📊 エラー率: ${errorRate.toFixed(2)}%`);
		if (errorRate > 1) {
			console.warn("⚠️  エラー率が1%を超えています。移行前に問題を解決してください。");
		}
	}

	/**
	 * バックアップフェーズ
	 */
	private async backup(plan: MigrationPlan): Promise<void> {
		if (plan.skipBackup) {
			console.log("⚠️  バックアップをスキップします");
			return;
		}

		console.log("\n💾 バックアップフェーズ");
		console.log("=".repeat(50));

		const backupService = new FirestoreBackupService({
			projectId: this.projectId,
			bucketName: this.bucketName,
			collections: plan.collections || ["videos", "audioButtons"],
		});

		const { backupPath, timestamp } = await backupService.createBackup();
		this.backupPath = backupPath;
		this.migrationTimestamp = timestamp;

		// バックアップの検証
		const verified = await backupService.verifyBackup(backupPath);
		if (!verified) {
			throw new Error("バックアップの検証に失敗しました");
		}

		console.log("\n✅ バックアップ完了！");
	}

	/**
	 * 移行フェーズ
	 */
	private async migrate(plan: MigrationPlan): Promise<void> {
		console.log("\n🔄 移行フェーズ");
		console.log("=".repeat(50));

		if (!plan.skipDryRun) {
			console.log("⚠️  移行前にドライランを実行することを推奨します");
			console.log("続行するには5秒お待ちください...");
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}

		const migrationService = new EntityMigrationService();

		const collections = plan.collections || ["videos", "audioButtons"];
		const allStats = [];

		for (const collection of collections) {
			console.log(`\n📂 ${collection} の移行を開始します...`);
			const collectionConfig = {
				videos: collection === "videos",
				audioButtons: collection === "audioButtons",
			};
			const report = await migrationService.migrate({
				collections: collectionConfig,
				dryRun: false,
				batchSize: 100,
				maxDocuments: plan.maxDocuments,
			});
			const stats =
				collection === "videos" ? report.collections.videos : report.collections.audioButtons;
			allStats.push({ collection, stats });

			console.log(`✅ ${collection} の移行完了`);
			console.log(`   処理済み: ${stats.migrated}`);
			console.log(`   スキップ: ${stats.skipped}`);
			console.log(`   失敗: ${stats.failed}`);
		}

		// 移行結果の保存
		const resultsPath = `migration-results-${this.migrationTimestamp || new Date().toISOString()}.json`;
		const fs = await import("node:fs/promises");
		await fs.writeFile(resultsPath, JSON.stringify(allStats, null, 2));

		console.log("\n✅ 移行完了！");
		console.log(`📄 結果ファイル: ${resultsPath}`);
	}

	/**
	 * 検証フェーズ
	 */
	private async validate(plan: MigrationPlan): Promise<void> {
		console.log("\n✔️ 検証フェーズ");
		console.log("=".repeat(50));

		const validationService = new MigrationValidationService({
			collections: plan.collections || ["videos", "audioButtons"],
			sampleSize: 10,
		});

		const results = await validationService.validate();

		console.log("\n✅ 検証完了！");
		if (results.allValid) {
			console.log("🎉 すべての検証に合格しました");
		} else {
			console.error("❌ 一部の検証に失敗しました");
			console.log("詳細は検証レポートを確認してください");
		}
	}

	/**
	 * ロールバックフェーズ
	 */
	private async rollback(plan: MigrationPlan): Promise<void> {
		console.log("\n⏪ ロールバックフェーズ");
		console.log("=".repeat(50));

		const rollbackService = new MigrationRollbackService({
			collections: plan.collections || ["videos", "audioButtons"],
			batchSize: 100,
			restoreFromBackup: this.backupPath
				? {
						backupPath: this.backupPath,
						projectId: this.projectId,
					}
				: undefined,
		});

		await rollbackService.rollback();
		const verified = await rollbackService.verify();

		if (verified) {
			console.log("\n✅ ロールバック完了！");
		} else {
			console.error("\n❌ ロールバックの検証に失敗しました");
		}
	}
}

// CLIとして実行する場合
if (require.main === module) {
	const args = process.argv.slice(2);
	const phase = args[0] as MigrationPlan["phase"];

	if (!phase) {
		console.error("使用方法: node execute-migration.js <phase> [options]");
		console.error("フェーズ: prepare, dry-run, backup, migrate, validate, rollback");
		process.exit(1);
	}

	const plan: MigrationPlan = {
		phase,
		maxDocuments: args.includes("--max-documents")
			? Number.parseInt(args[args.indexOf("--max-documents") + 1] || "0", 10)
			: undefined,
		skipBackup: args.includes("--skip-backup"),
		skipDryRun: args.includes("--skip-dry-run"),
	};

	const executor = new ProductionMigrationExecutor();
	executor
		.execute(plan)
		.then(() => {
			console.log("\n✨ 処理が正常に完了しました");
		})
		.catch((error) => {
			console.error("\n💥 処理中にエラーが発生しました:", error);
			process.exit(1);
		});
}
