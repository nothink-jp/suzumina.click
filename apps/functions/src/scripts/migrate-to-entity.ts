#!/usr/bin/env node

/**
 * Entity V2 Migration CLI Script
 *
 * Usage:
 *   pnpm --filter @suzumina.click/functions migrate:v2 [options]
 *
 * Options:
 *   --dry-run         Run in dry-run mode (default: true)
 *   --collections     Collections to migrate (videos,audioButtons)
 *   --batch-size      Batch size for processing (default: 100)
 *   --max-documents   Maximum documents to process (for testing)
 *   --output          Output file for dry-run report
 */

import { resolve } from "node:path";
import {
	DryRunReportGenerator,
	EntityMigrationService,
	formatConsoleReport,
	type MigrationOptions,
} from "../services/migration";

// Parse command line arguments
function parseArgs(): MigrationOptions & { output?: string } {
	const args = process.argv.slice(2);
	const options: MigrationOptions & { output?: string } = {
		dryRun: true,
		batchSize: 100,
		collections: {
			videos: true,
			audioButtons: true,
		},
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		switch (arg) {
			case "--no-dry-run":
				options.dryRun = false;
				break;
			case "--collections":
				if (i + 1 < args.length) {
					const collections = args[++i];
					if (collections) {
						const collectionList = collections.split(",");
						options.collections = {
							videos: collectionList.includes("videos"),
							audioButtons: collectionList.includes("audioButtons"),
						};
					}
				}
				break;
			case "--batch-size":
				if (i + 1 < args.length) {
					const batchSize = args[++i];
					if (batchSize) {
						options.batchSize = Number.parseInt(batchSize, 10);
					}
				}
				break;
			case "--max-documents":
				if (i + 1 < args.length) {
					const maxDocs = args[++i];
					if (maxDocs) {
						options.maxDocuments = Number.parseInt(maxDocs, 10);
					}
				}
				break;
			case "--output":
				if (i + 1 < args.length) {
					options.output = args[++i];
				}
				break;
			case "--help":
				printHelp();
				process.exit(0);
		}
	}

	return options;
}

function printHelp(): void {
	// Using process.stdout.write to avoid console lint warning
	process.stdout.write(`
Entity V2 Migration Script

Usage:
  pnpm --filter @suzumina.click/functions migrate:v2 [options]

Options:
  --no-dry-run      Run actual migration (default: dry-run mode)
  --collections     Collections to migrate (comma-separated: videos,audioButtons)
  --batch-size      Batch size for processing (default: 100)
  --max-documents   Maximum documents to process (for testing)
  --output          Output file for dry-run report
  --help            Show this help message

Examples:
  # Dry run for all collections
  pnpm --filter @suzumina.click/functions migrate:v2

  # Dry run for videos only, save report
  pnpm --filter @suzumina.click/functions migrate:v2 --collections videos --output report.txt

  # Actual migration for audio buttons (first 100 documents)
  pnpm --filter @suzumina.click/functions migrate:v2 --no-dry-run --collections audioButtons --max-documents 100
`);
}

async function main() {
	const options = parseArgs();

	process.stdout.write("🚀 Entity V2 Migration Script\n");
	process.stdout.write(`${"─".repeat(40)}\n`);
	process.stdout.write(`Mode: ${options.dryRun ? "DRY RUN" : "ACTUAL MIGRATION"}\n`);
	process.stdout.write(
		`Collections: ${Object.entries(options.collections)
			.filter(([_, enabled]) => enabled)
			.map(([name]) => name)
			.join(", ")}\n`,
	);
	process.stdout.write(`Batch size: ${options.batchSize}\n`);
	if (options.maxDocuments) {
		process.stdout.write(`Max documents: ${options.maxDocuments}\n`);
	}
	process.stdout.write(`${"─".repeat(40)}\n`);

	if (!options.dryRun) {
		process.stdout.write("\n⚠️  WARNING: This will modify production data!\n");
		process.stdout.write("Press Ctrl+C to cancel, or wait 5 seconds to continue...\n\n");
		await new Promise((resolve) => setTimeout(resolve, 5000));
	}

	try {
		// Create migration service using the existing firestore instance
		const migrationService = new EntityMigrationService();

		// Run migration
		process.stdout.write("\nStarting migration...\n");
		const report = await migrationService.migrate(options);

		// Display results
		process.stdout.write(formatConsoleReport(report));

		// Save detailed report if requested
		if (options.output && options.dryRun) {
			const reportGenerator = new DryRunReportGenerator();
			const detailedReport = await reportGenerator.generateReport(report);
			const outputPath = resolve(process.cwd(), options.output);
			await reportGenerator.saveReport(detailedReport, outputPath);
			process.stdout.write(`\n📄 Detailed report saved to: ${outputPath}\n`);
		}

		// Exit with appropriate code
		const hasErrors = report.collections.videos.failed + report.collections.audioButtons.failed > 0;
		process.exit(hasErrors ? 1 : 0);
	} catch (error) {
		process.stderr.write(`\n❌ Migration failed: ${error}\n`);
		process.exit(1);
	}
}

// Run if called directly
if (require.main === module) {
	main().catch((error) => {
		process.stderr.write(`Unhandled error: ${error}\n`);
		process.exit(1);
	});
}
