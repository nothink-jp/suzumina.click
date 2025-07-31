"use server";

import { auth } from "@/lib/auth";
import { getFirestore } from "@/lib/firestore";

export interface UpdateWorkData {
	title?: string;
	description?: string;
	price?: number;
	tags?: string[];
	isOnSale?: boolean;
}

export interface ActionResult {
	success: boolean;
	message: string;
	error?: string;
}

export async function updateWork(workId: string, data: UpdateWorkData): Promise<ActionResult> {
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
		const workRef = firestore.collection("works").doc(workId);

		// 作品の存在確認
		const workDoc = await workRef.get();
		if (!workDoc.exists) {
			return {
				success: false,
				message: "作品が見つかりません",
				error: "Work not found",
			};
		}

		// 更新可能なフィールドのみを抽出
		const updateData: Record<string, unknown> = {};
		if (data.title !== undefined) updateData.title = data.title;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.price !== undefined) {
			// 価格オブジェクトの現在価格のみ更新
			const currentData = workDoc.data();
			updateData.price = {
				...currentData?.price,
				current: Number(data.price),
			};
		}
		if (data.tags !== undefined) updateData.tags = data.tags;
		if (data.isOnSale !== undefined) updateData.isOnSale = Boolean(data.isOnSale);

		// 更新日時を追加
		updateData.updatedAt = new Date();

		await workRef.update(updateData);

		return {
			success: true,
			message: "作品情報を更新しました",
		};
	} catch (error) {
		return {
			success: false,
			message: "作品情報の更新に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export async function deleteWork(workId: string): Promise<ActionResult> {
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

		// 作品の存在確認
		const workRef = firestore.collection("works").doc(workId);
		const workDoc = await workRef.get();
		if (!workDoc.exists) {
			return {
				success: false,
				message: "作品が見つかりません",
				error: "Work not found",
			};
		}

		await workRef.delete();

		return {
			success: true,
			message: "作品を削除しました",
		};
	} catch (error) {
		return {
			success: false,
			message: "作品の削除に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export async function refreshAllWorksData(): Promise<ActionResult> {
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

		// Pub/Sub経由でCloud FunctionsのDLsite データ収集をトリガー
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
		const topicName = "dlsite-works-fetch-trigger";

		const message = {
			source: "admin-manual-trigger",
			timestamp: new Date().toISOString(),
			user: session.user.id,
		};

		const dataBuffer = Buffer.from(JSON.stringify(message));
		await pubsub.topic(topicName).publishMessage({ data: dataBuffer });

		return {
			success: true,
			message: "DLsite作品データの更新を開始しました",
		};
	} catch (error) {
		return {
			success: false,
			message: "作品データの更新に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
