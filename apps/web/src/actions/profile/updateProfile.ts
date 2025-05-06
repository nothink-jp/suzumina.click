"use server";

import { getFirestoreAdmin } from "@/lib/firebase/admin";
import type { UserProfileFormData } from "@/lib/users/types";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { getCurrentUser } from "../auth/getCurrentUser";

// バリデーション用のスキーマ
const profileSchema = z.object({
  siteDisplayName: z
    .string()
    .min(1, "表示名を入力してください")
    .max(30, "表示名は30文字以内で入力してください"),
  bio: z
    .string()
    .max(500, "自己紹介は500文字以内で入力してください")
    .optional(),
  isPublic: z.boolean().default(true),
});

/**
 * プロフィール更新の結果を表す型
 */
export type ProfileUpdateResult = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

/**
 * サーバーサイドでユーザープロフィール情報を更新する関数
 *
 * @param formData プロフィール更新用のフォームデータ
 * @returns 更新結果
 */
export async function updateProfile(
  formData: UserProfileFormData,
): Promise<ProfileUpdateResult> {
  try {
    // 現在のユーザー情報を取得
    const currentUser = await getCurrentUser();

    // 未ログインの場合はエラー
    if (!currentUser) {
      return {
        success: false,
        message: "ログインが必要です",
      };
    }

    // バリデーションチェック
    const result = profileSchema.safeParse(formData);
    if (!result.success) {
      return {
        success: false,
        message: "入力内容に誤りがあります",
        errors: result.error.formErrors.fieldErrors,
      };
    }

    // ヘルパー関数を使用してFirestoreを初期化
    const firestore = getFirestoreAdmin();
    const userProfileRef = firestore
      .collection("userProfiles")
      .doc(currentUser.uid);
    const profile = result.data;

    // ユーザープロフィール情報が存在するか確認
    const userProfileDoc = await userProfileRef.get();

    if (userProfileDoc.exists) {
      // 既存情報の更新
      await userProfileRef.update({
        siteDisplayName: profile.siteDisplayName,
        bio: profile.bio || "",
        isPublic: profile.isPublic,
        updatedAt: Timestamp.now(),
      });
    } else {
      // 新規作成
      await userProfileRef.set({
        uid: currentUser.uid,
        siteDisplayName: profile.siteDisplayName,
        bio: profile.bio || "",
        isPublic: profile.isPublic,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }

    return {
      success: true,
      message: "プロフィールを更新しました",
    };
  } catch (error) {
    console.error("プロフィール更新に失敗しました:", error);
    return {
      success: false,
      message: "プロフィール更新に失敗しました",
    };
  }
}
