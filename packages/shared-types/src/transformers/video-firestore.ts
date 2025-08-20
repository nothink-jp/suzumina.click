/**
 * Video Firestore Transformers
 *
 * Functions for transforming between Firestore documents and VideoPlainObject.
 */

import { videoOperations } from "../operations/video";
import type { VideoComputedProperties, VideoPlainObject } from "../plain-objects/video-plain";
import type { FirestoreServerVideoData } from "../types/firestore/video";

/**
 * Transforms Firestore document to VideoPlainObject
 */
export function fromFirestore(doc: FirestoreServerVideoData): VideoPlainObject {
	// Convert timestamps to ISO strings
	const publishedAt =
		doc.publishedAt instanceof Date
			? doc.publishedAt.toISOString()
			: doc.publishedAt || new Date().toISOString();

	const lastFetchedAt =
		doc.lastFetchedAt instanceof Date
			? doc.lastFetchedAt.toISOString()
			: doc.lastFetchedAt || new Date().toISOString();

	// Convert live streaming details timestamps
	let liveStreamingDetails: VideoPlainObject["liveStreamingDetails"];
	if (doc.liveStreamingDetails) {
		liveStreamingDetails = {
			scheduledStartTime:
				doc.liveStreamingDetails.scheduledStartTime instanceof Date
					? doc.liveStreamingDetails.scheduledStartTime.toISOString()
					: (doc.liveStreamingDetails.scheduledStartTime as string | undefined),
			scheduledEndTime:
				doc.liveStreamingDetails.scheduledEndTime instanceof Date
					? doc.liveStreamingDetails.scheduledEndTime.toISOString()
					: (doc.liveStreamingDetails.scheduledEndTime as string | undefined),
			actualStartTime:
				doc.liveStreamingDetails.actualStartTime instanceof Date
					? doc.liveStreamingDetails.actualStartTime.toISOString()
					: (doc.liveStreamingDetails.actualStartTime as string | undefined),
			actualEndTime:
				doc.liveStreamingDetails.actualEndTime instanceof Date
					? doc.liveStreamingDetails.actualEndTime.toISOString()
					: (doc.liveStreamingDetails.actualEndTime as string | undefined),
			concurrentViewers: doc.liveStreamingDetails.concurrentViewers,
		};
	}

	// Create base plain object
	const plainObject: VideoPlainObject = {
		...doc,
		publishedAt: publishedAt as string,
		lastFetchedAt: lastFetchedAt as string,
		liveStreamingDetails,
		// Add computed properties
		_computed: computeProperties(doc),
	};

	return plainObject;
}

/**
 * Transforms VideoPlainObject to Firestore document format
 */
export function toFirestore(video: VideoPlainObject): FirestoreServerVideoData {
	// Convert ISO strings back to Date objects for Firestore
	const publishedAt = new Date(video.publishedAt);
	const lastFetchedAt = new Date(video.lastFetchedAt);

	// Convert live streaming details
	let liveStreamingDetails: FirestoreServerVideoData["liveStreamingDetails"];
	if (video.liveStreamingDetails) {
		liveStreamingDetails = {
			scheduledStartTime: video.liveStreamingDetails.scheduledStartTime
				? new Date(video.liveStreamingDetails.scheduledStartTime)
				: undefined,
			scheduledEndTime: video.liveStreamingDetails.scheduledEndTime
				? new Date(video.liveStreamingDetails.scheduledEndTime)
				: undefined,
			actualStartTime: video.liveStreamingDetails.actualStartTime
				? new Date(video.liveStreamingDetails.actualStartTime)
				: undefined,
			actualEndTime: video.liveStreamingDetails.actualEndTime
				? new Date(video.liveStreamingDetails.actualEndTime)
				: undefined,
			concurrentViewers: video.liveStreamingDetails.concurrentViewers,
		};
	}

	// Remove computed properties for storage
	const { _computed, ...dataWithoutComputed } = video;

	return {
		...dataWithoutComputed,
		publishedAt,
		lastFetchedAt,
		liveStreamingDetails,
	} as FirestoreServerVideoData;
}

/**
 * Computes derived properties for a video
 */
function computeProperties(
	video: FirestoreServerVideoData | VideoPlainObject,
): VideoComputedProperties {
	// Create a temporary object for operations
	const temp = video as VideoPlainObject;

	return {
		isArchived: videoOperations.isArchived(temp),
		isPremiere: videoOperations.isPremiere(temp),
		isLive: videoOperations.isLive(temp),
		isUpcoming: videoOperations.isUpcoming(temp),
		canCreateButton: videoOperations.canCreateButton(temp),
		videoType: video.videoType || "normal",
		thumbnailUrl: videoOperations.getThumbnailUrl(temp),
		youtubeUrl: videoOperations.getYouTubeUrl(temp),
	};
}

/**
 * Alias for backward compatibility
 */
export const convertToFrontendVideo = fromFirestore;

/**
 * Video Firestore transformers namespace
 */
export const videoTransformers = {
	fromFirestore,
	toFirestore,
	convertToFrontendVideo,
};
