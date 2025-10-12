import { parseDurationToSeconds } from "@suzumina.click/shared-types";
import type { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";

/**
 * 動画が音声ボタン作成可能かチェック
 */
export async function validateVideoForAudioButton(
	videoId: string,
	firestore: ReturnType<typeof getFirestore>,
): Promise<{ valid: boolean; error?: string }> {
	const videoRef = firestore.collection("videos").doc(videoId);
	const videoDoc = await videoRef.get();

	if (!videoDoc.exists) {
		return { valid: false, error: "指定された動画が見つかりません" };
	}

	const videoData = videoDoc.data();

	// 埋め込み制限チェック
	if (videoData?.status?.embeddable === false) {
		return {
			valid: false,
			error: "この動画は埋め込みが制限されているため、音声ボタンを作成できません",
		};
	}

	// 配信アーカイブチェック
	const hasLiveStreamingDetails = videoData?.liveStreamingDetails?.actualEndTime;
	const duration = videoData?.duration;
	const isArchivedStream =
		hasLiveStreamingDetails && duration && parseDurationToSeconds(duration) > 15 * 60;

	if (!isArchivedStream && videoData?.videoType !== "archived") {
		return { valid: false, error: "音声ボタンを作成できるのは配信アーカイブのみです" };
	}

	return { valid: true };
}

/**
 * 動画のaudioButtonCountを更新
 */
export async function updateVideoButtonCount(
	videoId: string,
	firestore: ReturnType<typeof getFirestore>,
	increment = 1,
): Promise<void> {
	try {
		const videoRef = firestore.collection("videos").doc(videoId);
		const videoDoc = await videoRef.get();
		if (videoDoc.exists) {
			const videoData = videoDoc.data();
			const currentCount = videoData?.audioButtonCount || 0;
			const newCount = Math.max(0, currentCount + increment);
			await videoRef.update({
				audioButtonCount: newCount,
				hasAudioButtons: newCount > 0,
				updatedAt: new Date().toISOString(),
			});
		}
	} catch (updateError) {
		logger.warn("動画のaudioButtonCount更新エラー", {
			videoId,
			increment,
			error: updateError,
		});
	}
}
