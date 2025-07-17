/**
 * ユーザータグ関連のサーバーアクション
 * VIDEO_TAGS_DESIGN.md Phase 2準拠
 */

"use server";

import { auth } from "@/auth";
import { updateVideoUserTags } from "@/lib/video-firestore";

/**
 * ユーザータグ更新の入力型
 */
export interface UpdateUserTagsInput {
	videoId: string;
	userTags: string[];
}

/**
 * ユーザータグ更新のレスポンス型
 */
export interface UpdateUserTagsResponse {
	success: boolean;
	userTags?: string[];
	error?: string;
}

/**
 * 動画のユーザータグを更新
 * 認証済みユーザーのみ実行可能
 *
 * @param input - 更新対象の動画IDとユーザータグ配列
 * @returns 更新結果とエラー情報
 */
export async function updateUserTagsAction(
	input: UpdateUserTagsInput,
): Promise<UpdateUserTagsResponse> {
	try {
		// 認証チェック
		const session = await auth();
		if (!session?.user?.discordId) {
			return { success: false, error: "ログインが必要です" };
		}

		// 入力値検証
		if (!input.videoId) {
			return { success: false, error: "動画IDが必要です" };
		}

		// タグ数制限チェック（最大15個）
		if (input.userTags.length > 15) {
			return { success: false, error: "ユーザータグは最大15個まで設定できます" };
		}

		// タグ文字数制限チェック（各タグ30文字以内）
		for (const tag of input.userTags) {
			if (tag.length === 0) {
				return { success: false, error: "空のタグは設定できません" };
			}
			if (tag.length > 30) {
				return { success: false, error: "各タグは30文字以内で設定してください" };
			}
		}

		// 重複タグチェック
		const uniqueTags = [...new Set(input.userTags)];
		if (uniqueTags.length !== input.userTags.length) {
			return { success: false, error: "重複するタグは設定できません" };
		}

		// Firestoreでユーザータグ更新
		const result = await updateVideoUserTags(input.videoId, uniqueTags);

		if (result.success) {
			return {
				success: true,
				userTags: result.userTags,
			};
		}
		return {
			success: false,
			error: result.error || "ユーザータグの更新に失敗しました",
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "ユーザータグの更新に失敗しました",
		};
	}
}
