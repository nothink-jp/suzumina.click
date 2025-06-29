import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFirestore } from "@/lib/firestore";

// 作品情報更新
export async function PUT(request: NextRequest, { params }: { params: { workId: string } }) {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { workId } = params;
		const body = await request.json();

		const firestore = getFirestore();
		const workRef = firestore.collection("dlsiteWorks").doc(workId);

		// 作品の存在確認
		const workDoc = await workRef.get();
		if (!workDoc.exists) {
			return NextResponse.json({ error: "Work not found" }, { status: 404 });
		}

		// 更新可能なフィールドのみを抽出
		const updateData: Record<string, unknown> = {};
		if (body.title !== undefined) updateData.title = body.title;
		if (body.description !== undefined) updateData.description = body.description;
		if (body.price !== undefined) updateData.price = Number(body.price);
		if (body.tags !== undefined) updateData.tags = body.tags;
		if (body.isOnSale !== undefined) updateData.isOnSale = Boolean(body.isOnSale);

		// 更新日時を追加
		updateData.lastUpdated = new Date();

		await workRef.update(updateData);

		return NextResponse.json({
			success: true,
			message: "作品情報を更新しました",
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: "作品情報の更新に失敗しました",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

// 作品削除
export async function DELETE(_request: NextRequest, { params }: { params: { workId: string } }) {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { workId } = params;
		const firestore = getFirestore();

		// 作品の存在確認
		const workRef = firestore.collection("dlsiteWorks").doc(workId);
		const workDoc = await workRef.get();
		if (!workDoc.exists) {
			return NextResponse.json({ error: "Work not found" }, { status: 404 });
		}

		// 作品削除
		await workRef.delete();

		return NextResponse.json({
			success: true,
			message: "作品を削除しました",
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: "作品の削除に失敗しました",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
