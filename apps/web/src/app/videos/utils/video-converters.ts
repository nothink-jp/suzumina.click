import type { DocumentSnapshot } from "@google-cloud/firestore";
import {
	type FirestoreServerVideoData,
	type VideoPlainObject,
	videoTransformers,
} from "@suzumina.click/shared-types";
import * as logger from "@/lib/logger";

/**
 * Firestore Timestampを変換するヘルパー関数
 */
function convertTimestamp(value: unknown): Date | string | undefined {
	if (value && typeof value === "object" && "toDate" in value) {
		return (value as { toDate(): Date }).toDate();
	}
	return value as Date | string | undefined;
}

/**
 * FirestoreデータをVideoに変換
 */
export function convertToVideo(doc: DocumentSnapshot): VideoPlainObject | null {
	try {
		const data = doc.data() as FirestoreServerVideoData;

		// Firestore Timestampを変換
		const normalizedData = {
			...data,
			id: data.videoId || doc.id, // videoIdフィールドを優先、なければドキュメントID
			videoId: data.videoId || doc.id, // videoIdフィールドを優先
			publishedAt: convertTimestamp(data.publishedAt),
			lastFetchedAt: convertTimestamp(data.lastFetchedAt),
			liveStreamingDetails: data.liveStreamingDetails
				? {
						...data.liveStreamingDetails,
						scheduledStartTime: convertTimestamp(data.liveStreamingDetails.scheduledStartTime),
						scheduledEndTime: convertTimestamp(data.liveStreamingDetails.scheduledEndTime),
						actualStartTime: convertTimestamp(data.liveStreamingDetails.actualStartTime),
						actualEndTime: convertTimestamp(data.liveStreamingDetails.actualEndTime),
					}
				: undefined,
		};

		// VideoPlainObjectに変換
		return videoTransformers.fromFirestore(normalizedData);
	} catch (error) {
		logger.error("Video変換エラー", {
			videoId: doc.id,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}
