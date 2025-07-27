/**
 * Entity V2 Migration Service
 *
 * Service for migrating existing data to the new Entity V2 architecture.
 * Supports both dry-run and actual migration modes with comprehensive reporting.
 */

import { AudioButton, Video } from "@suzumina.click/shared-types";
import firestore, { Timestamp } from "../../infrastructure/database/firestore";
import * as logger from "../../shared/logger";
import type { MigrationReport, MigrationResult } from "./types";

/**
 * Migration options
 */
export interface MigrationOptions {
	dryRun: boolean;
	batchSize: number;
	collections: {
		videos?: boolean;
		audioButtons?: boolean;
	};
	maxDocuments?: number;
}

/**
 * Entity V2 Migration Service
 */
export class EntityMigrationService {
	constructor(private db = firestore) {}

	/**
	 * Run the migration
	 */
	async migrate(options: MigrationOptions): Promise<MigrationReport> {
		const report: MigrationReport = {
			startTime: new Date(),
			endTime: new Date(),
			dryRun: options.dryRun,
			collections: {
				videos: {
					total: 0,
					migrated: 0,
					failed: 0,
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

		try {
			logger.info("Entity V2 migration started", { options });

			// Migrate videos
			if (options.collections.videos) {
				await this.migrateVideos(options, report);
			}

			// Migrate audio buttons
			if (options.collections.audioButtons) {
				await this.migrateAudioButtons(options, report);
			}

			report.endTime = new Date();
			logger.info("Entity V2 migration completed", { report });

			return report;
		} catch (error) {
			logger.error("Migration failed", error);
			throw error;
		}
	}

	/**
	 * Migrate videos collection
	 */
	private async migrateVideos(options: MigrationOptions, report: MigrationReport): Promise<void> {
		logger.info("Starting video migration");

		const collection = this.db.collection("videos");
		let query = collection.orderBy("__name__").limit(options.batchSize);

		if (options.maxDocuments) {
			query = query.limit(options.maxDocuments);
		}

		let lastDoc: FirebaseFirestore.DocumentSnapshot | undefined;
		let processedCount = 0;

		while (true) {
			// Get batch of documents
			const snapshot = lastDoc ? await query.startAfter(lastDoc).get() : await query.get();

			if (snapshot.empty) {
				break;
			}

			// Process batch
			const batch = options.dryRun ? null : this.db.batch();
			const results = await Promise.allSettled(
				snapshot.docs.map(async (doc) => {
					try {
						const result = await this.migrateVideoDocument(doc, options.dryRun);
						if (result.migrated && batch) {
							batch.set(doc.ref, result.data, { merge: true });
						}
						return result;
					} catch (error) {
						return {
							migrated: false,
							error: error instanceof Error ? error.message : "Unknown error",
						};
					}
				}),
			);

			// Commit batch if not dry run
			if (batch) {
				await batch.commit();
			}

			// Update report
			for (const result of results) {
				report.collections.videos.total++;
				if (result.status === "fulfilled") {
					const value = result.value as MigrationResult;
					if (value.migrated) {
						report.collections.videos.migrated++;
					} else if (value.skipped) {
						report.collections.videos.skipped++;
					} else {
						report.collections.videos.failed++;
						if (value.error) {
							report.collections.videos.errors.push(value.error);
						}
					}
				} else {
					report.collections.videos.failed++;
					report.collections.videos.errors.push(result.reason);
				}
			}

			// Check if we've reached the limit
			processedCount += snapshot.docs.length;
			if (options.maxDocuments && processedCount >= options.maxDocuments) {
				break;
			}

			// Move to next batch
			lastDoc = snapshot.docs[snapshot.docs.length - 1];

			// Log progress
			logger.info(`Processed ${processedCount} videos`, {
				migrated: report.collections.videos.migrated,
				failed: report.collections.videos.failed,
				skipped: report.collections.videos.skipped,
			});
		}
	}

	/**
	 * Migrate a single video document
	 */
	private async migrateVideoDocument(
		doc: FirebaseFirestore.DocumentSnapshot,
		dryRun: boolean,
	): Promise<MigrationResult> {
		const data = doc.data();
		if (!data) {
			return { migrated: false, error: "Document has no data" };
		}

		// Check if already migrated
		if (data._v2Migration) {
			return { migrated: false, skipped: true, reason: "Already migrated" };
		}

		try {
			// Validate that we can create V2 entity from the data
			// Using fromFirestoreData for validation
			const firestoreData = {
				videoId: data.videoId || doc.id,
				title: data.title || "",
				description: data.description || "",
				channelId: data.channelId || "",
				channelTitle: data.channelTitle || "",
				publishedAt: data.publishedAt || new Date(),
				thumbnailUrl:
					data.thumbnailUrl || `https://img.youtube.com/vi/${data.videoId || doc.id}/hqdefault.jpg`,
				lastFetchedAt: data.lastFetchedAt || new Date(),
			};

			// Try to create V2 entity to validate data
			Video.fromFirestoreData(firestoreData);

			// Prepare migration data
			const migrationData = {
				_v2Migration: {
					migratedAt: Timestamp.now(),
					version: "2.0.0",
					dryRun,
				},
			};

			return {
				migrated: true,
				data: migrationData,
			};
		} catch (error) {
			return {
				migrated: false,
				error: `Failed to create V2 entity: ${error instanceof Error ? error.message : "Unknown error"}`,
			};
		}
	}

	/**
	 * Migrate audio buttons collection
	 */
	private async migrateAudioButtons(
		options: MigrationOptions,
		report: MigrationReport,
	): Promise<void> {
		logger.info("Starting audio button migration");

		const collection = this.db.collection("audioButtons");
		let query = collection.orderBy("__name__").limit(options.batchSize);

		if (options.maxDocuments) {
			query = query.limit(options.maxDocuments);
		}

		let lastDoc: FirebaseFirestore.DocumentSnapshot | undefined;
		let processedCount = 0;

		while (true) {
			// Get batch of documents
			const snapshot = lastDoc ? await query.startAfter(lastDoc).get() : await query.get();

			if (snapshot.empty) {
				break;
			}

			// Process batch
			const batch = options.dryRun ? null : this.db.batch();
			const results = await Promise.allSettled(
				snapshot.docs.map(async (doc) => {
					try {
						const result = await this.migrateAudioButtonDocument(doc, options.dryRun);
						if (result.migrated && batch) {
							batch.set(doc.ref, result.data, { merge: true });
						}
						return result;
					} catch (error) {
						return {
							migrated: false,
							error: error instanceof Error ? error.message : "Unknown error",
						};
					}
				}),
			);

			// Commit batch if not dry run
			if (batch) {
				await batch.commit();
			}

			// Update report
			for (const result of results) {
				report.collections.audioButtons.total++;
				if (result.status === "fulfilled") {
					const value = result.value as MigrationResult;
					if (value.migrated) {
						report.collections.audioButtons.migrated++;
					} else if (value.skipped) {
						report.collections.audioButtons.skipped++;
					} else {
						report.collections.audioButtons.failed++;
						if (value.error) {
							report.collections.audioButtons.errors.push(value.error);
						}
					}
				} else {
					report.collections.audioButtons.failed++;
					report.collections.audioButtons.errors.push(result.reason);
				}
			}

			// Check if we've reached the limit
			processedCount += snapshot.docs.length;
			if (options.maxDocuments && processedCount >= options.maxDocuments) {
				break;
			}

			// Move to next batch
			lastDoc = snapshot.docs[snapshot.docs.length - 1];

			// Log progress
			logger.info(`Processed ${processedCount} audio buttons`, {
				migrated: report.collections.audioButtons.migrated,
				failed: report.collections.audioButtons.failed,
				skipped: report.collections.audioButtons.skipped,
			});
		}
	}

	/**
	 * Migrate a single audio button document
	 */
	private async migrateAudioButtonDocument(
		doc: FirebaseFirestore.DocumentSnapshot,
		dryRun: boolean,
	): Promise<MigrationResult> {
		const data = doc.data();
		if (!data) {
			return { migrated: false, error: "Document has no data" };
		}

		// Check if already migrated
		if (data._v2Migration) {
			return { migrated: false, skipped: true, reason: "Already migrated" };
		}

		try {
			// Prepare data for V2 entity
			const audioButtonData = {
				id: doc.id,
				title: data.text || "", // Map text to title
				description: data.description || "",
				tags: data.tags || [],
				sourceVideoId: data.videoId || "",
				sourceVideoTitle: data.videoTitle || "",
				startTime: data.startTime || 0,
				endTime: data.endTime || 0,
				createdBy: data.createdBy || "system",
				createdByName: data.createdByName || "System",
				isPublic: data.isPublic !== false,
				playCount: data.playCount || 0,
				likeCount: data.likeCount || 0,
				dislikeCount: data.dislikeCount || 0,
				favoriteCount: data.favoriteCount || 0,
				createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
				updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
			};

			// Try to create entity to validate data
			AudioButton.fromFirestoreData({
				id: audioButtonData.id,
				title: audioButtonData.title,
				description: audioButtonData.description,
				tags: audioButtonData.tags,
				sourceVideoId: audioButtonData.sourceVideoId,
				sourceVideoTitle: audioButtonData.sourceVideoTitle,
				sourceVideoThumbnailUrl: undefined,
				startTime: audioButtonData.startTime,
				endTime: audioButtonData.endTime,
				createdBy: audioButtonData.createdBy,
				createdByName: audioButtonData.createdByName,
				isPublic: audioButtonData.isPublic,
				playCount: audioButtonData.playCount,
				likeCount: audioButtonData.likeCount,
				dislikeCount: audioButtonData.dislikeCount,
				favoriteCount: audioButtonData.favoriteCount,
				createdAt: new Date(audioButtonData.createdAt),
				updatedAt: new Date(audioButtonData.updatedAt),
			});

			// Prepare migration data
			const migrationData = {
				_v2Migration: {
					migratedAt: Timestamp.now(),
					version: "2.0.0",
					dryRun,
				},
			};

			return {
				migrated: true,
				data: migrationData,
			};
		} catch (error) {
			return {
				migrated: false,
				error: `Failed to create V2 entity: ${error instanceof Error ? error.message : "Unknown error"}`,
			};
		}
	}
}
