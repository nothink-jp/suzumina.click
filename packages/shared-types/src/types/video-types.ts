/**
 * Video-related type definitions
 *
 * These types were previously part of the Video entity but are now
 * standalone types for use with VideoPlainObject.
 */

/**
 * Audio button association information
 */
export interface AudioButtonInfo {
	count: number;
	hasButtons: boolean;
}

/**
 * Live streaming information for videos
 */
export interface LiveStreamingDetails {
	scheduledStartTime?: Date | string;
	scheduledEndTime?: Date | string;
	actualStartTime?: Date | string;
	actualEndTime?: Date | string;
	concurrentViewers?: number;
}

/**
 * Privacy status for videos
 */
export type PrivacyStatus = "public" | "unlisted" | "private";

/**
 * Upload status for videos
 */
export type UploadStatus = "processed" | "failed" | "rejected" | "uploaded";
