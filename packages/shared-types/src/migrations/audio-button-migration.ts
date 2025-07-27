/**
 * AudioButton Migration Helper
 *
 * Provides utilities for migrating between legacy AudioButton format and AudioButton Entity.
 * Supports both individual and batch migrations with validation and error handling.
 */

import { AudioButton } from "../entities/audio-button";
import type { AudioButtonPlainObject } from "../plain-objects/audio-button-plain";

// Type alias for legacy audio button format (for migration purposes)
type LegacyAudioButton = AudioButtonPlainObject;

/**
 * Migration result for a single audio button
 */
export interface AudioButtonMigrationResult {
	/** Successfully migrated entity */
	entity?: AudioButton;
	/** Original audio button data */
	original: LegacyAudioButton;
	/** Error if migration failed */
	error?: Error;
	/** Whether migration was successful */
	success: boolean;
}

/**
 * Batch migration result
 */
export interface AudioButtonBatchMigrationResult {
	/** Successfully migrated entities */
	entities: AudioButton[];
	/** Failed migrations with details */
	failures: AudioButtonMigrationResult[];
	/** Total number of items processed */
	totalProcessed: number;
	/** Number of successful migrations */
	successCount: number;
	/** Number of failed migrations */
	failureCount: number;
}

/**
 * Validates required fields for audio button migration
 */
function validateRequiredFields(audioButton: LegacyAudioButton): void {
	if (!audioButton.id || !audioButton.title || !audioButton.sourceVideoId) {
		throw new Error(
			`Missing required fields: ${[
				!audioButton.id && "id",
				!audioButton.title && "title",
				!audioButton.sourceVideoId && "sourceVideoId",
			]
				.filter(Boolean)
				.join(", ")}`,
		);
	}
}

/**
 * Migrates a single AudioButton to AudioButton
 *
 * @param audioButton - Legacy audio button to migrate
 * @returns Migration result with entity or error
 */
export function migrateAudioButton(audioButton: LegacyAudioButton): AudioButtonMigrationResult {
	try {
		// Validate required fields
		validateRequiredFields(audioButton);

		// Use the AudioButton.fromFirestoreData method
		const entity = AudioButton.fromFirestoreData({
			id: audioButton.id,
			title: audioButton.title,
			description: audioButton.description,
			tags: audioButton.tags || [],
			sourceVideoId: audioButton.sourceVideoId,
			sourceVideoTitle: audioButton.sourceVideoTitle || "",
			sourceVideoThumbnailUrl: audioButton.sourceVideoThumbnailUrl || "",
			startTime: audioButton.startTime,
			endTime: audioButton.endTime || audioButton.startTime,
			createdBy: audioButton.createdBy,
			createdByName: audioButton.createdByName,
			isPublic: audioButton.isPublic ?? true,
			playCount: audioButton.playCount || 0,
			likeCount: audioButton.likeCount || 0,
			dislikeCount: audioButton.dislikeCount || 0,
			favoriteCount: audioButton.favoriteCount || 0,
			createdAt: audioButton.createdAt,
			updatedAt: audioButton.updatedAt || audioButton.createdAt,
		});

		// Validate the migrated entity
		if (!entity || !entity.isValid()) {
			throw new Error(
				`Migrated entity validation failed: ${entity?.getValidationErrors().join(", ") || "entity is null"}`,
			);
		}

		return {
			entity,
			original: audioButton,
			success: true,
		};
	} catch (error) {
		return {
			original: audioButton,
			error: error instanceof Error ? error : new Error("Unknown error"),
			success: false,
		};
	}
}

/**
 * Migrates multiple AudioButtons to AudioButton in batch
 *
 * @param audioButtons - Array of legacy audio buttons to migrate
 * @returns Batch migration result with statistics
 */
export function migrateAudioButtonBatch(
	audioButtons: LegacyAudioButton[],
): AudioButtonBatchMigrationResult {
	const entities: AudioButton[] = [];
	const failures: AudioButtonMigrationResult[] = [];

	for (const audioButton of audioButtons) {
		const result = migrateAudioButton(audioButton);
		if (result.success && result.entity) {
			entities.push(result.entity);
		} else {
			failures.push(result);
		}
	}

	return {
		entities,
		failures,
		totalProcessed: audioButtons.length,
		successCount: entities.length,
		failureCount: failures.length,
	};
}

/**
 * Validates if an AudioButton can be migrated
 *
 * @param audioButton - Audio button to validate
 * @returns Validation result with specific errors if any
 */
export function validateAudioButtonForMigration(audioButton: LegacyAudioButton): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Check required fields
	if (!audioButton.id) errors.push("Missing required field: id");
	if (!audioButton.title) errors.push("Missing required field: title");
	if (!audioButton.sourceVideoId) errors.push("Missing required field: sourceVideoId");
	if (!audioButton.createdBy) errors.push("Missing required field: createdBy");
	if (!audioButton.createdByName) errors.push("Missing required field: createdByName");
	if (!audioButton.createdAt) errors.push("Missing required field: createdAt");

	// Validate data types
	if (typeof audioButton.startTime !== "number" || audioButton.startTime < 0) {
		errors.push("Invalid startTime: must be a non-negative number");
	}
	if (
		audioButton.endTime !== undefined &&
		(typeof audioButton.endTime !== "number" || audioButton.endTime < 0)
	) {
		errors.push("Invalid endTime: must be a non-negative number");
	}
	if (audioButton.endTime !== undefined && audioButton.startTime >= audioButton.endTime) {
		errors.push("Invalid time range: startTime must be less than endTime");
	}

	// Validate arrays
	if (audioButton.tags && !Array.isArray(audioButton.tags)) {
		errors.push("Invalid tags: must be an array");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Creates a migration report for batch operations
 *
 * @param result - Batch migration result
 * @returns Formatted report string
 */
export function createMigrationReport(result: AudioButtonBatchMigrationResult): string {
	const lines: string[] = [
		"=== AudioButton Migration Report ===",
		`Total Processed: ${result.totalProcessed}`,
		`Successful: ${result.successCount} (${
			result.totalProcessed > 0
				? ((result.successCount / result.totalProcessed) * 100).toFixed(1)
				: 0
		}%)`,
		`Failed: ${result.failureCount} (${
			result.totalProcessed > 0
				? ((result.failureCount / result.totalProcessed) * 100).toFixed(1)
				: 0
		}%)`,
	];

	if (result.failureCount > 0) {
		lines.push("\n=== Failure Details ===");
		for (const failure of result.failures.slice(0, 10)) {
			lines.push(`- ${failure.original.id}: ${failure.error?.message || "Unknown error"}`);
		}
		if (result.failures.length > 10) {
			lines.push(`... and ${result.failures.length - 10} more failures`);
		}
	}

	return lines.join("\n");
}
