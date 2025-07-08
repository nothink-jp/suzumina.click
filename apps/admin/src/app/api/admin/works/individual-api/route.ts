import { PubSub } from "@google-cloud/pubsub";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST() {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Pub/Sub経由でIndividual Info API Function をトリガー
		const projectId = process.env.GCP_PROJECT_ID;
		if (!projectId) {
			return NextResponse.json({ error: "GCP Project ID not configured" }, { status: 500 });
		}

		const pubsub = new PubSub({ projectId });
		const topicName = "dlsite-individual-api-trigger";

		const message = {
			source: "admin-manual-trigger",
			timestamp: new Date().toISOString(),
			user: session.user.id,
			type: "individual_info_api_manual",
			description: "管理者による Individual Info API 手動実行",
		};

		const dataBuffer = Buffer.from(JSON.stringify(message));
		await pubsub.topic(topicName).publishMessage({ data: dataBuffer });

		return NextResponse.json({
			success: true,
			message: "Individual Info API による作品データの初期化を開始しました",
			estimatedTime: "約4分",
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: "Individual Info API の実行に失敗しました",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
