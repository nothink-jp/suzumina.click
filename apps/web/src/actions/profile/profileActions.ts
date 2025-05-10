/**
 * プロファイル関連のアクション関数
 *
 * プロファイル更新などのAPIアクションをまとめたファイル
 */

import type { UserProfileFormData } from "@/lib/users/types";

/**
 * ユーザープロファイルを更新する関数
 * @param profileData 更新するプロファイル情報
 * @returns 更新結果
 */
export async function updateProfile(profileData: UserProfileFormData) {
  console.log(
    "プロファイル更新APIがモックとして呼び出されました:",
    profileData,
  );

  // 検証のためのダミーチェック
  if (!profileData.siteDisplayName) {
    return {
      success: false,
      message: "表示名は必須です",
    };
  }

  // 実際のAPI呼び出しをシミュレート（1秒の遅延）
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 成功レスポンスを返す
  return {
    success: true,
    message: "プロファイル情報が更新されました",
  };
}
