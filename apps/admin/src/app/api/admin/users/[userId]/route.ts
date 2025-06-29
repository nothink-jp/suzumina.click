import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFirestore } from "@/lib/firestore";

// ユーザー情報更新
export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { userId } = params;
		const body = await request.json();

		const firestore = getFirestore();
		const userRef = firestore.collection("users").doc(userId);

		// ユーザーの存在確認
		const userDoc = await userRef.get();
		if (!userDoc.exists) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// 自分自身の権限変更を防止
		if (userId === session.user.id) {
			return NextResponse.json({ error: "自分自身のロールは変更できません" }, { status: 400 });
		}

		// 更新可能なフィールドのみを抽出
		const updateData: Record<string, unknown> = {};
		if (body.role !== undefined) {
			// 有効なロールかチェック
			const validRoles = ["member", "moderator", "admin"];
			if (!validRoles.includes(body.role)) {
				return NextResponse.json({ error: "Invalid role" }, { status: 400 });
			}
			updateData.role = body.role;
		}
		if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);

		// 更新日時を追加
		updateData.updatedAt = new Date();

		await userRef.update(updateData);

		return NextResponse.json({
			success: true,
			message: "ユーザー情報を更新しました",
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: "ユーザー情報の更新に失敗しました",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

// ユーザー削除（非アクティブ化）
export async function DELETE(_request: NextRequest, { params }: { params: { userId: string } }) {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { userId } = params;

		// 自分自身の削除を防止
		if (userId === session.user.id) {
			return NextResponse.json({ error: "自分自身は削除できません" }, { status: 400 });
		}

		const firestore = getFirestore();
		const userRef = firestore.collection("users").doc(userId);

		// ユーザーの存在確認
		const userDoc = await userRef.get();
		if (!userDoc.exists) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// 物理削除ではなく非アクティブ化
		await userRef.update({
			isActive: false,
			deletedAt: new Date(),
		});

		return NextResponse.json({
			success: true,
			message: "ユーザーを非アクティブ化しました",
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: "ユーザーの削除に失敗しました",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
