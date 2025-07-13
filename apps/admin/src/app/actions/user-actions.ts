"use server";

import { auth } from "@/lib/auth";
import { getFirestore } from "@/lib/firestore";

export interface UpdateUserData {
	role?: string;
	isActive?: boolean;
}

export interface ActionResult {
	success: boolean;
	message: string;
	error?: string;
}

export async function updateUser(userId: string, data: UpdateUserData): Promise<ActionResult> {
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
		const userRef = firestore.collection("users").doc(userId);

		// ユーザーの存在確認
		const userDoc = await userRef.get();
		if (!userDoc.exists) {
			return {
				success: false,
				message: "ユーザーが見つかりません",
				error: "User not found",
			};
		}

		// 更新可能なフィールドのみを抽出
		const updateData: Record<string, unknown> = {};
		if (data.role !== undefined) updateData.role = data.role;
		if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

		// 更新日時を追加
		updateData.updatedAt = new Date();

		await userRef.update(updateData);

		return {
			success: true,
			message: "ユーザー情報を更新しました",
		};
	} catch (error) {
		return {
			success: false,
			message: "ユーザー情報の更新に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export async function deleteUser(userId: string): Promise<ActionResult> {
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

		// ユーザーの存在確認
		const userRef = firestore.collection("users").doc(userId);
		const userDoc = await userRef.get();
		if (!userDoc.exists) {
			return {
				success: false,
				message: "ユーザーが見つかりません",
				error: "User not found",
			};
		}

		// 実際にはユーザーを非アクティブ化（完全削除はしない）
		await userRef.update({
			isActive: false,
			updatedAt: new Date(),
		});

		return {
			success: true,
			message: "ユーザーを非アクティブ化しました",
		};
	} catch (error) {
		return {
			success: false,
			message: "ユーザーの削除に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
