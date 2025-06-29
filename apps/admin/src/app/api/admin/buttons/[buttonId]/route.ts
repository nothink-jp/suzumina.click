import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFirestore } from "@/lib/firestore";

// 音声ボタン情報更新
export async function PUT(request: NextRequest, { params }: { params: { buttonId: string } }) {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { buttonId } = params;
		const body = await request.json();

		const firestore = getFirestore();
		const buttonRef = firestore.collection("audioButtons").doc(buttonId);

		// 音声ボタンの存在確認
		const buttonDoc = await buttonRef.get();
		if (!buttonDoc.exists) {
			return NextResponse.json({ error: "Audio button not found" }, { status: 404 });
		}

		// 更新可能なフィールドのみを抽出
		const updateData: Record<string, unknown> = {};
		if (body.title !== undefined) updateData.title = body.title;
		if (body.startTime !== undefined) updateData.startTime = Number(body.startTime);
		if (body.endTime !== undefined) updateData.endTime = Number(body.endTime);
		if (body.isPublic !== undefined) updateData.isPublic = Boolean(body.isPublic);

		// 更新日時を追加
		updateData.updatedAt = new Date();

		await buttonRef.update(updateData);

		return NextResponse.json({
			success: true,
			message: "音声ボタン情報を更新しました",
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: "音声ボタン情報の更新に失敗しました",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

// 音声ボタン削除
export async function DELETE(_request: NextRequest, { params }: { params: { buttonId: string } }) {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { buttonId } = params;
		const firestore = getFirestore();

		// 音声ボタンの存在確認
		const buttonRef = firestore.collection("audioButtons").doc(buttonId);
		const buttonDoc = await buttonRef.get();
		if (!buttonDoc.exists) {
			return NextResponse.json({ error: "Audio button not found" }, { status: 404 });
		}

		// 関連するお気に入りも削除
		const favoritesQuery = await firestore
			.collectionGroup("favorites")
			.where("audioButtonId", "==", buttonId)
			.get();

		const batch = firestore.batch();

		// 音声ボタン削除
		batch.delete(buttonRef);

		// 関連お気に入り削除
		for (const favoriteDoc of favoritesQuery.docs) {
			batch.delete(favoriteDoc.ref);
		}

		await batch.commit();

		return NextResponse.json({
			success: true,
			message: "音声ボタンを削除しました",
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: "音声ボタンの削除に失敗しました",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
