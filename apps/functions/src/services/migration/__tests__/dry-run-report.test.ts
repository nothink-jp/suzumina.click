/**
 * Dry Run Report Generator Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { DryRunReportGenerator, formatConsoleReport } from "../dry-run-report";
import type { DryRunEntry, MigrationReport } from "../types";

// Mock fs
vi.mock("node:fs", () => ({
	promises: {
		writeFile: vi.fn(),
	},
}));

describe("DryRunReportGenerator", () => {
	let generator: DryRunReportGenerator;

	beforeEach(() => {
		vi.clearAllMocks();
		generator = new DryRunReportGenerator();
	});

	describe("addEntry", () => {
		it("should add entries to the report", () => {
			const entry: DryRunEntry = {
				documentId: "doc1",
				collection: "videos",
				status: "success",
			};

			generator.addEntry(entry);
			// Test indirectly through generateReport
		});
	});

	describe("generateReport", () => {
		it("should generate report with recommendations", async () => {
			const summary: MigrationReport = {
				startTime: new Date("2024-01-01T00:00:00Z"),
				endTime: new Date("2024-01-01T01:00:00Z"),
				dryRun: true,
				collections: {
					videos: {
						total: 10,
						migrated: 8,
						failed: 1,
						skipped: 1,
						errors: ["Validation error"],
					},
					audioButtons: {
						total: 5,
						migrated: 5,
						failed: 0,
						skipped: 0,
						errors: [],
					},
				},
			};

			// Add some entries
			generator.addEntry({
				documentId: "video1",
				collection: "videos",
				status: "success",
			});
			generator.addEntry({
				documentId: "video2",
				collection: "videos",
				status: "error",
				reason: "validation failed",
			});
			generator.addEntry({
				documentId: "video3",
				collection: "videos",
				status: "skip",
				reason: "Already migrated",
			});

			const report = await generator.generateReport(summary);

			expect(report.timestamp).toBeInstanceOf(Date);
			expect(report.summary).toEqual(summary);
			expect(report.entries).toHaveLength(3);
			expect(report.recommendations).toContain(
				"1 documents failed validation. Review and fix data before migration.",
			);
			expect(report.recommendations).toContain(
				"Some documents will be skipped (already migrated). This is expected for partial migrations.",
			);
		});

		it("should generate success recommendations when no errors", async () => {
			const summary: MigrationReport = {
				startTime: new Date(),
				endTime: new Date(),
				dryRun: true,
				collections: {
					videos: {
						total: 10,
						migrated: 10,
						failed: 0,
						skipped: 0,
						errors: [],
					},
					audioButtons: {
						total: 5,
						migrated: 5,
						failed: 0,
						skipped: 0,
						errors: [],
					},
				},
			};

			const report = await generator.generateReport(summary);

			expect(report.recommendations).toContain(
				"Migration dry run completed successfully. Safe to proceed.",
			);
		});

		it("should recommend addressing high error rate", async () => {
			const summary: MigrationReport = {
				startTime: new Date(),
				endTime: new Date(),
				dryRun: true,
				collections: {
					videos: {
						total: 10,
						migrated: 5,
						failed: 5,
						skipped: 0,
						errors: [],
					},
					audioButtons: {
						total: 0,
						migrated: 0,
						failed: 0,
						skipped: 0,
						errors: [],
					},
				},
			};

			// Add error entries
			for (let i = 0; i < 5; i++) {
				generator.addEntry({
					documentId: `video${i}`,
					collection: "videos",
					status: "error",
					reason: "validation failed",
				});
			}
			for (let i = 5; i < 10; i++) {
				generator.addEntry({
					documentId: `video${i}`,
					collection: "videos",
					status: "success",
				});
			}

			const report = await generator.generateReport(summary);

			expect(report.recommendations.some((r) => r.includes("High error rate"))).toBe(true);
		});
	});

	describe("saveReport", () => {
		it("should save formatted report to file", async () => {
			const { promises: fs } = await import("node:fs");
			const mockWriteFile = vi.mocked(fs.writeFile);

			const report = {
				timestamp: new Date("2024-01-01T00:00:00Z"),
				summary: {
					startTime: new Date("2024-01-01T00:00:00Z"),
					endTime: new Date("2024-01-01T00:30:00Z"),
					dryRun: true,
					collections: {
						videos: {
							total: 10,
							migrated: 10,
							failed: 0,
							skipped: 0,
							errors: [],
						},
						audioButtons: {
							total: 5,
							migrated: 5,
							failed: 0,
							skipped: 0,
							errors: [],
						},
					},
				},
				entries: [],
				recommendations: ["Migration dry run completed successfully. Safe to proceed."],
			};

			await generator.saveReport(report, "/tmp/report.txt");

			expect(mockWriteFile).toHaveBeenCalledWith(
				"/tmp/report.txt",
				expect.stringContaining("Entity V2 Migration Dry Run Report"),
				"utf-8",
			);
			expect(mockWriteFile).toHaveBeenCalledWith(
				"/tmp/report.txt",
				expect.stringContaining("Duration: 30m 0s"),
				"utf-8",
			);
		});
	});
});

describe("formatConsoleReport", () => {
	it("should format report for console output", () => {
		const report: MigrationReport = {
			startTime: new Date(),
			endTime: new Date(),
			dryRun: true,
			collections: {
				videos: {
					total: 100,
					migrated: 80,
					failed: 10,
					skipped: 10,
					errors: [],
				},
				audioButtons: {
					total: 50,
					migrated: 45,
					failed: 0,
					skipped: 5,
					errors: [],
				},
			},
		};

		const output = formatConsoleReport(report);

		expect(output).toContain("📊 Migration Dry Run Summary");
		expect(output).toContain("📹 Videos:");
		expect(output).toContain("Total: 100");
		expect(output).toContain("Will migrate: 80");
		expect(output).toContain("🔊 Audio Buttons:");
		expect(output).toContain("⚠️  Dry run completed with errors");
		expect(output).toContain("10 documents failed validation");
	});

	it("should show success message when no errors", () => {
		const report: MigrationReport = {
			startTime: new Date(),
			endTime: new Date(),
			dryRun: true,
			collections: {
				videos: {
					total: 100,
					migrated: 100,
					failed: 0,
					skipped: 0,
					errors: [],
				},
				audioButtons: {
					total: 50,
					migrated: 50,
					failed: 0,
					skipped: 0,
					errors: [],
				},
			},
		};

		const output = formatConsoleReport(report);

		expect(output).toContain("✅ Dry run completed successfully!");
		expect(output).toContain("150 documents will be migrated");
	});
});
