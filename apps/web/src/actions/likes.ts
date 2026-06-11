"use server";

import { toggleReaction } from "./reaction-toggle";

/**
 * 音声ボタンのいいね状態を切り替え（正本は reaction-toggle の toggleReaction）
 */
export async function toggleLikeAction(audioButtonId: string): Promise<{
	success: boolean;
	isLiked?: boolean;
	error?: string;
}> {
	const result = await toggleReaction(audioButtonId, "like");
	return { success: result.success, isLiked: result.active, error: result.error };
}
