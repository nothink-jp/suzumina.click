"use server";

import { auth } from "@/lib/auth";
import { getFirestore } from "@/lib/firestore";

export interface UpdateContactData {
	status?: "new" | "reviewing" | "resolved";
	priority?: "low" | "medium" | "high";
	adminNote?: string;
}

export interface ActionResult {
	success: boolean;
	message: string;
	error?: string;
}

export async function updateContact(
	contactId: string,
	data: UpdateContactData,
): Promise<ActionResult> {
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
		const contactRef = firestore.collection("contacts").doc(contactId);

		// お問い合わせの存在確認
		const contactDoc = await contactRef.get();
		if (!contactDoc.exists) {
			return {
				success: false,
				message: "お問い合わせが見つかりません",
				error: "Contact not found",
			};
		}

		// 更新可能なフィールドのみを抽出
		const updateData: Record<string, unknown> = {};
		if (data.status !== undefined) updateData.status = data.status;
		if (data.priority !== undefined) updateData.priority = data.priority;
		if (data.adminNote !== undefined) updateData.adminNote = data.adminNote;

		// 更新日時を追加
		updateData.updatedAt = new Date();

		await contactRef.update(updateData);

		return {
			success: true,
			message: "お問い合わせ情報を更新しました",
		};
	} catch (error) {
		return {
			success: false,
			message: "お問い合わせ情報の更新に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export async function deleteContact(contactId: string): Promise<ActionResult> {
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

		// お問い合わせの存在確認
		const contactRef = firestore.collection("contacts").doc(contactId);
		const contactDoc = await contactRef.get();
		if (!contactDoc.exists) {
			return {
				success: false,
				message: "お問い合わせが見つかりません",
				error: "Contact not found",
			};
		}

		await contactRef.delete();

		return {
			success: true,
			message: "お問い合わせを削除しました",
		};
	} catch (error) {
		return {
			success: false,
			message: "お問い合わせの削除に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
