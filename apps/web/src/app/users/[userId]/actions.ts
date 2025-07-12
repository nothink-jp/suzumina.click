"use server";

import { revalidatePath } from "next/cache";
import { recalculateUserStats } from "@/lib/user-firestore";

export async function recalculateStatsAction(
	discordId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		await recalculateUserStats(discordId);
		revalidatePath(`/users/${discordId}`);
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "統計再計算に失敗しました",
		};
	}
}
