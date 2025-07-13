"use server";

import { auth } from "@/lib/auth";
import { getFirestore } from "@/lib/firestore";

export interface UpdateVideoData {
	title?: string;
	description?: string;
	tags?: string[];
}

export interface ActionResult {
	success: boolean;
	message: string;
	error?: string;
}

export async function updateVideo(videoId: string, data: UpdateVideoData): Promise<ActionResult> {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return {
				success: false,
				message: "認証が必要です",
				error: "Unauthorized",
			};
		}

		const firestore = getFirestore();
		const videoRef = firestore.collection("youtubeVideos").doc(videoId);

		// 動画の存在確認
		const videoDoc = await videoRef.get();
		if (!videoDoc.exists) {
			return {
				success: false,
				message: "動画が見つかりません",
				error: "Video not found",
			};
		}

		// 更新可能なフィールドのみを抽出
		const updateData: Record<string, unknown> = {};
		if (data.title !== undefined) updateData.title = data.title;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.tags !== undefined) updateData.tags = data.tags;

		// 更新日時を追加
		updateData.updatedAt = new Date();

		await videoRef.update(updateData);

		return {
			success: true,
			message: "動画情報を更新しました",
		};
	} catch (error) {
		return {
			success: false,
			message: "動画情報の更新に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export async function deleteVideo(videoId: string): Promise<ActionResult> {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return {
				success: false,
				message: "認証が必要です",
				error: "Unauthorized",
			};
		}

		const firestore = getFirestore();

		// 動画の存在確認
		const videoRef = firestore.collection("youtubeVideos").doc(videoId);
		const videoDoc = await videoRef.get();
		if (!videoDoc.exists) {
			return {
				success: false,
				message: "動画が見つかりません",
				error: "Video not found",
			};
		}

		// 関連する音声ボタンが存在する場合は削除を拒否
		const buttonsQuery = await firestore
			.collection("audioButtons")
			.where("youtubeVideoId", "==", videoId)
			.limit(1)
			.get();

		if (!buttonsQuery.empty) {
			return {
				success: false,
				message: "関連する音声ボタンがあるため削除できません",
				error: "Related audio buttons exist",
			};
		}

		await videoRef.delete();

		return {
			success: true,
			message: "動画を削除しました",
		};
	} catch (error) {
		return {
			success: false,
			message: "動画の削除に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export async function refreshVideoData(): Promise<ActionResult> {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return {
				success: false,
				message: "認証が必要です",
				error: "Unauthorized",
			};
		}

		// Pub/Sub経由でCloud FunctionsのYouTube データ収集をトリガー
		const projectId = process.env.GCP_PROJECT_ID;
		if (!projectId) {
			return {
				success: false,
				message: "GCP Project IDが設定されていません",
				error: "GCP Project ID not configured",
			};
		}

		const { PubSub } = await import("@google-cloud/pubsub");
		const pubsub = new PubSub({ projectId });
		const topicName = "youtube-video-fetch-trigger";

		const message = {
			source: "admin-manual-trigger",
			timestamp: new Date().toISOString(),
			user: session.user.id,
		};

		const dataBuffer = Buffer.from(JSON.stringify(message));
		await pubsub.topic(topicName).publishMessage({ data: dataBuffer });

		return {
			success: true,
			message: "YouTube動画データの更新を開始しました",
		};
	} catch (error) {
		return {
			success: false,
			message: "動画データの更新に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
