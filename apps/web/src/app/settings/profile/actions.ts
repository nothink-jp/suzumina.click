"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { updateUser } from "@/lib/user-firestore";

interface UpdateProfileData {
	isPublicProfile: boolean;
}

export async function updateUserProfile(data: UpdateProfileData) {
	try {
		const session = await auth();
		if (!session?.user?.discordId) {
			return { success: false, error: "認証が必要です" };
		}

		// Firestoreのユーザー情報を更新
		await updateUser({
			discordId: session.user.discordId,
			isPublicProfile: data.isPublicProfile,
		});

		// キャッシュを再検証
		revalidatePath(`/users/${session.user.discordId}`);
		revalidatePath("/settings");

		return { success: true };
	} catch (_error) {
		return { success: false, error: "プロフィールの更新に失敗しました" };
	}
}
