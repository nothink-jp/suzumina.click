/**
 * プロファイルアクション関数のテスト
 *
 * プロファイル更新などのAPIアクションのテストを実装します。
 */

import type { UserProfileFormData } from "@/lib/users/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateProfile } from "./profileActions";

describe("プロファイルアクション関数", () => {
  // テスト前にコンソールをモック化
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    // タイムアウト関数をモック化
    vi.useFakeTimers();
  });

  describe("updateProfile関数", () => {
    it("正常系：有効なプロファイルデータで成功すること", async () => {
      // 有効なプロファイルデータを準備
      const validProfileData: UserProfileFormData = {
        siteDisplayName: "テストユーザー",
        bio: "これはテスト用の自己紹介です。",
        isPublic: true,
      };

      // 関数を呼び出し、遅延をスキップ
      const updatePromise = updateProfile(validProfileData);
      vi.runAllTimers(); // 1秒の遅延をスキップ

      // 結果を検証
      const result = await updatePromise;
      expect(result).toEqual({
        success: true,
        message: "プロファイル情報が更新されました",
      });
    });

    it("異常系：表示名が空の場合はエラーになること", async () => {
      // 表示名が空のプロファイルデータを準備
      const invalidProfileData: UserProfileFormData = {
        siteDisplayName: "",
        bio: "これはテスト用の自己紹介です。",
        isPublic: true,
      };

      // 関数を呼び出し
      const result = await updateProfile(invalidProfileData);

      // 結果を検証
      expect(result).toEqual({
        success: false,
        message: "表示名は必須です",
      });
    });

    it("正常系：APIが呼び出されるとコンソールにログが出力されること", async () => {
      // 有効なプロファイルデータを準備
      const profileData: UserProfileFormData = {
        siteDisplayName: "テストユーザー",
        bio: "これはテスト用の自己紹介です。",
        isPublic: true,
      };

      // 関数を呼び出し、遅延をスキップ
      const updatePromise = updateProfile(profileData);
      vi.runAllTimers();
      await updatePromise;

      // コンソールログが呼び出されたことを検証
      expect(console.log).toHaveBeenCalledWith(
        "プロファイル更新APIがモックとして呼び出されました:",
        profileData,
      );
    });
  });
});
