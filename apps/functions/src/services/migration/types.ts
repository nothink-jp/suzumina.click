/**
 * Migration Types
 *
 * Type definitions for the Entity V2 migration service.
 */

/**
 * Migration result for a single document
 */
export interface MigrationResult {
	migrated: boolean;
	skipped?: boolean;
	reason?: string;
	error?: string;
	data?: Record<string, unknown>;
}

/**
 * Collection migration statistics
 */
export interface CollectionStats {
	total: number;
	migrated: number;
	failed: number;
	skipped: number;
	errors: string[];
}

/**
 * Migration report
 */
export interface MigrationReport {
	startTime: Date;
	endTime: Date;
	dryRun: boolean;
	collections: {
		videos: CollectionStats;
		audioButtons: CollectionStats;
	};
}

/**
 * Dry run report entry
 */
export interface DryRunEntry {
	documentId: string;
	collection: string;
	status: "success" | "skip" | "error";
	reason?: string;
	changes?: {
		field: string;
		before: unknown;
		after: unknown;
	}[];
}

/**
 * Dry run report
 */
export interface DryRunReport {
	timestamp: Date;
	summary: MigrationReport;
	entries: DryRunEntry[];
	recommendations: string[];
}
