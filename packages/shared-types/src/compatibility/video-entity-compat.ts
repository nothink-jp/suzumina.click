/**
 * Video Entity Compatibility Layer
 *
 * Provides backward compatibility for existing Video Entity usage
 * while delegating to new functional APIs.
 *
 * @deprecated Use videoOperations, videoValidators, and videoTransformers instead
 */

import type { DatabaseError } from "../core/result";
import { databaseError, err, ok, type Result } from "../core/result";
import { videoOperations } from "../operations/video";
import type { VideoPlainObject } from "../plain-objects/video-plain";
import { videoTransformers } from "../transformers/video-firestore";
import type { FirestoreServerVideoData } from "../types/firestore/video";
import { videoValidators } from "../validators/video";

/**
 * Legacy Video Entity for backward compatibility
 * @deprecated Use functional APIs instead
 */
export class Video {
	private data: VideoPlainObject;

	private constructor(data: VideoPlainObject) {
		// Deprecation notice: Video Entity is deprecated.
		// Use videoOperations, videoValidators, and videoTransformers instead.
		this.data = data;
	}

	/**
	 * Creates a Video from Firestore data
	 * @deprecated Use videoTransformers.fromFirestore() instead
	 */
	static fromFirestoreData(data: FirestoreServerVideoData): Result<Video, DatabaseError> {
		try {
			const plainObject = videoTransformers.fromFirestore(data);
			const validation = videoValidators.validateVideo(plainObject);

			if (!validation.isValid) {
				return err(databaseError(validation.errors.join(", "), "validation"));
			}

			return ok(new Video(plainObject));
		} catch (error) {
			return err(
				databaseError(error instanceof Error ? error.message : "Unknown error", "conversion"),
			);
		}
	}

	/**
	 * Converts to plain object
	 * @deprecated Use the data directly
	 */
	toPlainObject(): VideoPlainObject {
		return this.data;
	}

	/**
	 * Converts to Firestore format
	 * @deprecated Use videoTransformers.toFirestore() instead
	 */
	toFirestoreData(): FirestoreServerVideoData {
		return videoTransformers.toFirestore(this.data);
	}

	// Delegate all getters to operations
	get content() {
		return {
			videoId: { toString: () => this.data.videoId },
			publishedAt: {
				toDate: () => new Date(this.data.publishedAt),
				toISOString: () => this.data.publishedAt,
			},
			privacyStatus: this.data.status?.privacyStatus || "public",
			uploadStatus: this.data.status?.uploadStatus || "uploaded",
			embeddable: this.data.status?.embeddable || true,
			publicStatsViewable: this.data.status?.publicStatsViewable || true,
		};
	}

	get metadata() {
		return {
			title: { toString: () => this.data.title },
			description: { toString: () => this.data.description },
			duration: {
				toString: () => this.data.duration || "",
				toSeconds: () => {
					if (!this.data.duration) return 0;
					// Parse ISO 8601 duration to seconds
					const match = this.data.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
					if (!match) return 0;
					const hours = match[1] ? Number.parseInt(match[1], 10) : 0;
					const minutes = match[2] ? Number.parseInt(match[2], 10) : 0;
					const seconds = match[3] ? Number.parseInt(match[3], 10) : 0;
					return hours * 3600 + minutes * 60 + seconds;
				},
			},
			thumbnails: this.data.thumbnails,
		};
	}

	get channel() {
		return {
			channelId: { toString: () => this.data.channelId },
			channelTitle: { toString: () => this.data.channelTitle },
		};
	}

	get statistics() {
		if (!this.data.statistics) return undefined;
		return {
			viewCount: { toNumber: () => this.data.statistics?.viewCount || 0 },
			likeCount: { toNumber: () => this.data.statistics?.likeCount || 0 },
			commentCount: { toNumber: () => this.data.statistics?.commentCount || 0 },
		};
	}

	get tags() {
		return this.data.tags || { playlistTags: [], userTags: [] };
	}

	get audioButtonInfo() {
		return this.data.audioButtonInfo || { count: 0, hasButtons: false };
	}

	get liveStreamingDetails() {
		return this.data.liveStreamingDetails;
	}

	get liveBroadcastContent() {
		return this.data.liveBroadcastContent;
	}

	get videoType() {
		return this.data.videoType;
	}

	// Business logic methods delegated to operations
	isArchived(): boolean {
		return videoOperations.isArchived(this.data);
	}

	isPremiere(): boolean {
		return videoOperations.isPremiere(this.data);
	}

	isLive(): boolean {
		return videoOperations.isLive(this.data);
	}

	isUpcoming(): boolean {
		return videoOperations.isUpcoming(this.data);
	}

	canCreateButton(): boolean {
		return videoOperations.canCreateButton(this.data);
	}

	getThumbnailUrl(quality?: "default" | "medium" | "high" | "standard" | "maxres"): string {
		return videoOperations.getThumbnailUrl(this.data, quality);
	}

	getYouTubeUrl(): string {
		return videoOperations.getYouTubeUrl(this.data);
	}

	hasAudioButtons(): boolean {
		return videoOperations.hasAudioButtons(this.data);
	}
}

// Also export as VideoEntity for compatibility
export { Video as VideoEntity };
