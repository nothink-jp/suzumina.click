"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getFirestore } from "@/lib/firestore";
import { logSecurityEvent } from "@/lib/security-logger";

type ContactStatus = "new" | "reviewing" | "resolved";

/**
 * お問い合わせのステータスを更新する
 */
export async function updateContactStatus(
	contactId: string,
	newStatus: ContactStatus,
	adminNote?: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		// 管理者権限チェック
		const session = await auth();
		if (!session?.user || session.user.role !== "admin") {
			redirect("/");
		}

		const firestore = getFirestore();
		const contactRef = firestore.collection("contacts").doc(contactId);

		// ドキュメントの存在確認
		const contactDoc = await contactRef.get();
		if (!contactDoc.exists) {
			return { success: false, error: "お問い合わせが見つかりません" };
		}

		// ステータス更新データを作成
		const updateData: Record<string, unknown> = {
			status: newStatus,
			updatedAt: new Date().toISOString(),
			lastUpdatedBy: session.user.discordId,
		};

		// 管理者メモがある場合は追加
		if (adminNote) {
			updateData.adminNote = adminNote;
		}

		// アクション履歴を追加
		const actionHistory = contactDoc.data()?.actionHistory || [];
		actionHistory.push({
			action: `status_changed_to_${newStatus}`,
			timestamp: new Date().toISOString(),
			adminId: session.user.discordId,
			adminUsername: session.user.username,
			note: adminNote || null,
		});
		updateData.actionHistory = actionHistory;

		// Firestoreを更新
		await contactRef.update(updateData);

		// セキュリティログ記録
		logSecurityEvent("admin_success_login", {
			userId: session.user.discordId,
			details: {
				action: "contact_status_update",
				contactId,
				oldStatus: contactDoc.data()?.status,
				newStatus,
				adminNote: adminNote || null,
			},
		});

		// ページを再検証してキャッシュを更新
		revalidatePath("/admin/contacts");
		revalidatePath(`/admin/contacts/${contactId}`);

		return { success: true };
	} catch (_error) {
		return {
			success: false,
			error: "ステータスの更新に失敗しました",
		};
	}
}

/**
 * お問い合わせを削除する（論理削除）
 */
export async function deleteContact(
	contactId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		// 管理者権限チェック
		const session = await auth();
		if (!session?.user || session.user.role !== "admin") {
			redirect("/");
		}

		const firestore = getFirestore();
		const contactRef = firestore.collection("contacts").doc(contactId);

		// ドキュメントの存在確認
		const contactDoc = await contactRef.get();
		if (!contactDoc.exists) {
			return { success: false, error: "お問い合わせが見つかりません" };
		}

		// 論理削除（物理削除ではなく、deletedフラグを追加）
		await contactRef.update({
			deleted: true,
			deletedAt: new Date().toISOString(),
			deletedBy: session.user.discordId,
		});

		// セキュリティログ記録
		logSecurityEvent("admin_success_login", {
			userId: session.user.discordId,
			details: {
				action: "contact_delete",
				contactId,
				subject: contactDoc.data()?.subject,
			},
		});

		// ページを再検証
		revalidatePath("/admin/contacts");

		return { success: true };
	} catch (_error) {
		return {
			success: false,
			error: "お問い合わせの削除に失敗しました",
		};
	}
}
