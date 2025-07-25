/**
 * Audio Button Mapper V2
 *
 * Maps Firestore audio button data to the new AudioButton Entity V2 domain model.
 * Provides conversion between Firestore documents and our domain entities
 * while maintaining backward compatibility with the existing system.
 */

import { AudioButtonV2 } from "@suzumina.click/shared-types";
import * as logger from "../../shared/logger";

/**
 * Firestore Audio Button data interface
 *
 * This interface represents the audio button data structure stored in Firestore.
 * It matches the FirestoreAudioButtonSchema from the shared-types package.
 */
export interface FirestoreAudioButtonData {
	// Base fields
	id: string;
	title: string;
	description?: string;
	tags?: string[];

	// YouTube reference
	sourceVideoId: string;
	sourceVideoTitle?: string;
	startTime: number;
	endTime: number;

	// Creator information
	createdBy: string;
	createdByName: string;
	isPublic?: boolean;

	// Statistics
	playCount?: number;
	likeCount?: number;
	dislikeCount?: number;
	favoriteCount?: number;

	// Timestamps
	createdAt: string;
	updatedAt: string;
}

/**
 * Mapping error for tracking failed conversions
 */
export interface AudioButtonMappingError {
	index: number;
	error: Error;
	data: FirestoreAudioButtonData;
}

/**
 * Maps Firestore audio button data to AudioButton Entity V2
 *
 * @param data - Firestore audio button document data
 * @returns AudioButtonV2 entity or null if mapping fails
 */
export function mapFirestoreToAudioButtonEntity(
	data: FirestoreAudioButtonData,
): AudioButtonV2 | null {
	try {
		// Validate required fields
		if (!data.id || !data.title || !data.sourceVideoId) {
			logger.warn("Missing required fields for AudioButton mapping", {
				id: data.id,
				hasTitle: !!data.title,
				hasVideoId: !!data.sourceVideoId,
			});
			return null;
		}

		// Use the fromLegacy method to handle the conversion
		const legacyData = {
			id: data.id,
			title: data.title,
			description: data.description,
			tags: data.tags || [],
			sourceVideoId: data.sourceVideoId,
			sourceVideoTitle: data.sourceVideoTitle,
			startTime: data.startTime || 0,
			endTime: data.endTime || data.startTime || 0,
			createdBy: data.createdBy || "unknown",
			createdByName: data.createdByName || "Unknown User",
			isPublic: data.isPublic ?? true,
			playCount: data.playCount || 0,
			likeCount: data.likeCount || 0,
			dislikeCount: data.dislikeCount || 0,
			favoriteCount: data.favoriteCount || 0,
			createdAt: data.createdAt || new Date().toISOString(),
			updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
		};

		const audioButton = AudioButtonV2.fromLegacy(legacyData);

		return audioButton;
	} catch (error) {
		logger.error("Failed to map audio button data to entity", {
			buttonId: data.id,
			error: error instanceof Error ? error.message : "Unknown error",
		});
		return null;
	}
}

/**
 * Maps multiple audio buttons to entities with error tracking
 *
 * @param buttons - Array of Firestore audio button documents
 * @returns Object containing successfully mapped entities and errors
 */
export function mapAudioButtonsWithErrors(buttons: FirestoreAudioButtonData[]): {
	entities: AudioButtonV2[];
	errors: AudioButtonMappingError[];
} {
	const entities: AudioButtonV2[] = [];
	const errors: AudioButtonMappingError[] = [];

	buttons.forEach((data, index) => {
		try {
			const entity = mapFirestoreToAudioButtonEntity(data);
			if (entity) {
				entities.push(entity);
			} else {
				errors.push({
					index,
					error: new Error("Failed to map audio button data"),
					data,
				});
			}
		} catch (error) {
			errors.push({
				index,
				error: error instanceof Error ? error : new Error("Unknown mapping error"),
				data,
			});
		}
	});

	return { entities, errors };
}

/**
 * Maps multiple audio buttons to entities
 *
 * @param buttons - Array of Firestore audio button documents
 * @returns Array of successfully mapped entities
 */
export function mapAudioButtonsToEntities(buttons: FirestoreAudioButtonData[]): AudioButtonV2[] {
	const { entities } = mapAudioButtonsWithErrors(buttons);
	return entities;
}

/**
 * Maps AudioButton Entity V2 to Firestore data
 *
 * @param entity - AudioButtonV2 entity
 * @returns Firestore-compatible data object
 */
export function mapAudioButtonEntityToFirestore(entity: AudioButtonV2): FirestoreAudioButtonData {
	const legacy = entity.toLegacy();

	return {
		id: legacy.id,
		title: legacy.title,
		description: legacy.description,
		tags: legacy.tags,
		sourceVideoId: legacy.sourceVideoId,
		sourceVideoTitle: legacy.sourceVideoTitle,
		startTime: legacy.startTime,
		endTime: legacy.endTime,
		createdBy: legacy.createdBy,
		createdByName: legacy.createdByName,
		isPublic: legacy.isPublic,
		playCount: legacy.playCount,
		likeCount: legacy.likeCount,
		dislikeCount: legacy.dislikeCount,
		favoriteCount: legacy.favoriteCount,
		createdAt: legacy.createdAt,
		updatedAt: legacy.updatedAt,
	};
}

/**
 * Firestore converter for AudioButton Entity V2
 *
 * Provides type-safe conversion between Firestore documents and AudioButton entities
 * Note: Using inline type to avoid firebase-admin dependency
 */
export const audioButtonV2Converter = {
	toFirestore(audioButton: AudioButtonV2): FirestoreAudioButtonData {
		return mapAudioButtonEntityToFirestore(audioButton);
	},

	fromFirestore(snapshot: any, options: any): AudioButtonV2 | null {
		const data = snapshot.data(options) as FirestoreAudioButtonData;

		// Ensure ID is set from document ID if not present in data
		if (!data.id) {
			data.id = snapshot.id;
		}

		const entity = mapFirestoreToAudioButtonEntity(data);
		if (!entity) {
			logger.error("Failed to convert Firestore document to AudioButton entity", {
				documentId: snapshot.id,
			});
			// Return a minimal entity to prevent null reference errors
			// This should be handled properly by the calling code
			throw new Error(`Failed to convert document ${snapshot.id} to AudioButton entity`);
		}

		return entity;
	},
};

/**
 * Helper function to validate and clean audio button data before mapping
 *
 * @param data - Raw Firestore data
 * @returns Cleaned and validated data
 */
export function validateAndCleanAudioButtonData(
	data: Partial<FirestoreAudioButtonData>,
): FirestoreAudioButtonData | null {
	// Ensure required fields
	if (!data.id || !data.title || !data.sourceVideoId) {
		return null;
	}

	// Clean and validate timestamps
	const now = new Date().toISOString();
	const createdAt = data.createdAt || now;
	const updatedAt = data.updatedAt || createdAt;

	// Ensure start/end times are valid
	const startTime = Math.max(0, data.startTime || 0);
	const endTime = Math.max(startTime, data.endTime || startTime);

	return {
		id: data.id,
		title: data.title.trim(),
		description: data.description?.trim(),
		tags: Array.isArray(data.tags) ? data.tags.filter((tag) => tag && tag.trim()) : [],
		sourceVideoId: data.sourceVideoId,
		sourceVideoTitle: data.sourceVideoTitle?.trim(),
		startTime,
		endTime,
		createdBy: data.createdBy || "unknown",
		createdByName: data.createdByName || "Unknown User",
		isPublic: data.isPublic ?? true,
		playCount: Math.max(0, data.playCount || 0),
		likeCount: Math.max(0, data.likeCount || 0),
		dislikeCount: Math.max(0, data.dislikeCount || 0),
		favoriteCount: Math.max(0, data.favoriteCount || 0),
		createdAt,
		updatedAt,
	};
}

/**
 * Performance monitoring helper for batch operations
 */
export class AudioButtonMapperPerformance {
	private startTime: number;
	private itemCount: number;

	constructor() {
		this.startTime = Date.now();
		this.itemCount = 0;
	}

	start(count: number): void {
		this.startTime = Date.now();
		this.itemCount = count;
	}

	end(): { duration: number; itemsPerSecond: number } {
		const duration = Date.now() - this.startTime;
		const itemsPerSecond = this.itemCount > 0 ? (this.itemCount / duration) * 1000 : 0;

		return {
			duration,
			itemsPerSecond,
		};
	}

	log(operation: string): void {
		const { duration, itemsPerSecond } = this.end();
		logger.info(`AudioButton mapping performance: ${operation}`, {
			duration: `${duration}ms`,
			itemCount: this.itemCount,
			itemsPerSecond: Math.round(itemsPerSecond),
		});
	}
}
