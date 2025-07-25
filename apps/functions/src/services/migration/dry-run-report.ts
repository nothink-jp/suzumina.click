/**
 * Dry Run Report Generator
 *
 * Generates detailed reports for migration dry runs to help administrators
 * understand what changes will be made before executing the actual migration.
 */

import { promises as fs } from "node:fs";
import type { DryRunEntry, DryRunReport, MigrationReport } from "./types";

/**
 * Dry Run Report Generator
 */
export class DryRunReportGenerator {
	private entries: DryRunEntry[] = [];

	/**
	 * Add an entry to the report
	 */
	addEntry(entry: DryRunEntry): void {
		this.entries.push(entry);
	}

	/**
	 * Generate the report
	 */
	async generateReport(summary: MigrationReport): Promise<DryRunReport> {
		const report: DryRunReport = {
			timestamp: new Date(),
			summary,
			entries: this.entries,
			recommendations: this.generateRecommendations(),
		};

		return report;
	}

	/**
	 * Save report to file
	 */
	async saveReport(report: DryRunReport, outputPath: string): Promise<void> {
		const content = this.formatReport(report);
		await fs.writeFile(outputPath, content, "utf-8");
	}

	/**
	 * Generate recommendations based on the dry run results
	 */
	private generateRecommendations(): string[] {
		const recommendations: string[] = [];

		// Count errors by type
		const errorCounts = new Map<string, number>();
		for (const entry of this.entries) {
			if (entry.status === "error" && entry.reason) {
				const count = errorCounts.get(entry.reason) || 0;
				errorCounts.set(entry.reason, count + 1);
			}
		}

		// Generate recommendations based on errors
		for (const [reason, count] of errorCounts) {
			if (reason.includes("validation")) {
				recommendations.push(
					`${count} documents failed validation. Review and fix data before migration.`,
				);
			} else if (reason.includes("missing")) {
				recommendations.push(
					`${count} documents have missing required fields. Consider data cleanup.`,
				);
			}
		}

		// General recommendations
		const errorRate =
			this.entries.length > 0
				? (this.entries.filter((e) => e.status === "error").length / this.entries.length) * 100
				: 0;

		if (errorRate > 10) {
			recommendations.push(
				`High error rate (${errorRate.toFixed(1)}%). Consider addressing issues before migration.`,
			);
		}

		if (this.entries.filter((e) => e.status === "skip").length > 0) {
			recommendations.push(
				"Some documents will be skipped (already migrated). This is expected for partial migrations.",
			);
		}

		if (recommendations.length === 0) {
			recommendations.push("Migration dry run completed successfully. Safe to proceed.");
		}

		return recommendations;
	}

	/**
	 * Format the report as a readable string
	 */
	private formatReport(report: DryRunReport): string {
		const lines: string[] = [];

		// Header
		lines.push("=".repeat(80));
		lines.push("Entity V2 Migration Dry Run Report");
		lines.push("=".repeat(80));
		lines.push("");

		// Summary
		lines.push("SUMMARY");
		lines.push("-".repeat(40));
		lines.push(`Start Time: ${report.summary.startTime.toISOString()}`);
		lines.push(`End Time: ${report.summary.endTime.toISOString()}`);
		lines.push(`Duration: ${this.calculateDuration(report.summary)}`);
		lines.push("");

		// Collection stats
		lines.push("COLLECTION STATISTICS");
		lines.push("-".repeat(40));
		this.formatCollectionStats(lines, "Videos", report.summary.collections.videos);
		lines.push("");
		this.formatCollectionStats(lines, "Audio Buttons", report.summary.collections.audioButtons);
		lines.push("");

		// Recommendations
		lines.push("RECOMMENDATIONS");
		lines.push("-".repeat(40));
		for (const recommendation of report.recommendations) {
			lines.push(`• ${recommendation}`);
		}
		lines.push("");

		// Detailed entries (first 100 errors)
		const errors = report.entries.filter((e) => e.status === "error").slice(0, 100);
		if (errors.length > 0) {
			lines.push("ERROR DETAILS (First 100)");
			lines.push("-".repeat(40));
			for (const entry of errors) {
				lines.push(`${entry.collection}/${entry.documentId}: ${entry.reason || "Unknown error"}`);
			}
			lines.push("");
		}

		// Footer
		lines.push("=".repeat(80));
		lines.push(`Report generated at: ${report.timestamp.toISOString()}`);

		return lines.join("\n");
	}

	/**
	 * Format collection statistics
	 */
	private formatCollectionStats(lines: string[], name: string, stats: any): void {
		lines.push(`${name}:`);
		lines.push(`  Total: ${stats.total}`);
		lines.push(`  Migrated: ${stats.migrated}`);
		lines.push(`  Skipped: ${stats.skipped}`);
		lines.push(`  Failed: ${stats.failed}`);
		if (stats.errors.length > 0) {
			lines.push(`  Unique Errors: ${new Set(stats.errors).size}`);
		}
	}

	/**
	 * Calculate duration
	 */
	private calculateDuration(summary: MigrationReport): string {
		const duration = summary.endTime.getTime() - summary.startTime.getTime();
		const seconds = Math.floor(duration / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
		}
		if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`;
		}
		return `${seconds}s`;
	}
}

/**
 * Create a dry run report for the console
 */
export function formatConsoleReport(report: MigrationReport): string {
	const lines: string[] = [];

	lines.push("\n📊 Migration Dry Run Summary");
	lines.push("─".repeat(40));

	// Videos
	const v = report.collections.videos;
	lines.push("\n📹 Videos:");
	lines.push(`   Total: ${v.total}`);
	lines.push(`   Will migrate: ${v.migrated}`);
	lines.push(`   Will skip: ${v.skipped}`);
	lines.push(`   Errors: ${v.failed}`);

	// Audio Buttons
	const a = report.collections.audioButtons;
	lines.push("\n🔊 Audio Buttons:");
	lines.push(`   Total: ${a.total}`);
	lines.push(`   Will migrate: ${a.migrated}`);
	lines.push(`   Will skip: ${a.skipped}`);
	lines.push(`   Errors: ${a.failed}`);

	// Overall status
	const totalErrors = v.failed + a.failed;
	const totalToMigrate = v.migrated + a.migrated;

	lines.push("\n" + "─".repeat(40));
	if (totalErrors === 0) {
		lines.push("✅ Dry run completed successfully!");
		lines.push(`   ${totalToMigrate} documents will be migrated.`);
	} else {
		lines.push("⚠️  Dry run completed with errors.");
		lines.push(`   ${totalErrors} documents failed validation.`);
		lines.push("   Review the detailed report before proceeding.");
	}

	return lines.join("\n");
}
