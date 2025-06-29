import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFirestore } from "@/lib/firestore";

// 動画情報更新
export async function PUT(request: NextRequest, { params }: { params: { videoId: string } }) {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { videoId } = params;
		const body = await request.json();

		const firestore = getFirestore();
		const videoRef = firestore.collection("youtubeVideos").doc(videoId);

		// 動画の存在確認
		const videoDoc = await videoRef.get();
		if (!videoDoc.exists) {
			return NextResponse.json({ error: "Video not found" }, { status: 404 });
		}

		// 更新可能なフィールドのみを抽出
		const updateData: Record<string, unknown> = {};
		if (body.title !== undefined) updateData.title = body.title;
		if (body.description !== undefined) updateData.description = body.description;
		if (body.tags !== undefined) updateData.tags = body.tags;

		// 更新日時を追加
		updateData.lastUpdated = new Date();

		await videoRef.update(updateData);

		return NextResponse.json({
			success: true,
			message: "動画情報を更新しました",
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: "動画情報の更新に失敗しました",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

// 動画削除
export async function DELETE(_request: NextRequest, { params }: { params: { videoId: string } }) {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { videoId } = params;
		const firestore = getFirestore();

		// 動画の存在確認
		const videoRef = firestore.collection("youtubeVideos").doc(videoId);
		const videoDoc = await videoRef.get();
		if (!videoDoc.exists) {
			return NextResponse.json({ error: "Video not found" }, { status: 404 });
		}

		// 関連する音声ボタンがある場合の確認
		const audioButtonsQuery = await firestore
			.collection("audioButtons")
			.where("youtubeVideoId", "==", videoId)
			.get();

		if (!audioButtonsQuery.empty) {
			return NextResponse.json(
				{
					error: "この動画に関連する音声ボタンが存在するため削除できません",
					audioButtonsCount: audioButtonsQuery.size,
				},
				{ status: 400 },
			);
		}

		// 動画削除
		await videoRef.delete();

		return NextResponse.json({
			success: true,
			message: "動画を削除しました",
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: "動画の削除に失敗しました",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
