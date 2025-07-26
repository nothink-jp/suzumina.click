/**
 * Migration Service Exports
 */

export { DryRunReportGenerator, formatConsoleReport } from "./dry-run-report";
export type { MigrationOptions } from "./entity-migration";
export { EntityMigrationService } from "./entity-migration";
export type {
	CollectionStats,
	DryRunEntry,
	DryRunReport,
	MigrationReport,
	MigrationResult,
} from "./types";
