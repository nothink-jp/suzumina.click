import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFirestore } from "@/lib/firestore";

// お問い合わせ状態更新
export async function PUT(request: NextRequest, { params }: { params: { contactId: string } }) {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { contactId } = params;
		const body = await request.json();

		const firestore = getFirestore();
		const contactRef = firestore.collection("contacts").doc(contactId);

		// お問い合わせの存在確認
		const contactDoc = await contactRef.get();
		if (!contactDoc.exists) {
			return NextResponse.json({ error: "Contact not found" }, { status: 404 });
		}

		// 更新可能なフィールドのみを抽出
		const updateData: Record<string, unknown> = {};
		if (body.status !== undefined) {
			// 有効なステータスかチェック
			const validStatuses = ["new", "reviewing", "resolved"];
			if (!validStatuses.includes(body.status)) {
				return NextResponse.json({ error: "Invalid status" }, { status: 400 });
			}
			updateData.status = body.status;
		}
		if (body.priority !== undefined) {
			// 有効な優先度かチェック
			const validPriorities = ["low", "medium", "high"];
			if (!validPriorities.includes(body.priority)) {
				return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
			}
			updateData.priority = body.priority;
		}
		if (body.adminNote !== undefined) updateData.adminNote = body.adminNote;

		// 更新日時と担当者を追加
		updateData.updatedAt = new Date();
		updateData.handledBy = session.user.id;

		await contactRef.update(updateData);

		return NextResponse.json({
			success: true,
			message: "お問い合わせ状態を更新しました",
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: "お問い合わせ状態の更新に失敗しました",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

// お問い合わせ削除
export async function DELETE(_request: NextRequest, { params }: { params: { contactId: string } }) {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { contactId } = params;
		const firestore = getFirestore();

		// お問い合わせの存在確認
		const contactRef = firestore.collection("contacts").doc(contactId);
		const contactDoc = await contactRef.get();
		if (!contactDoc.exists) {
			return NextResponse.json({ error: "Contact not found" }, { status: 404 });
		}

		// お問い合わせ削除
		await contactRef.delete();

		return NextResponse.json({
			success: true,
			message: "お問い合わせを削除しました",
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: "お問い合わせの削除に失敗しました",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
