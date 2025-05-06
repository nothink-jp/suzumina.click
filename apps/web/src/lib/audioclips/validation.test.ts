/**
 * 音声クリップ検証機能のテスト
 *
 * 時間範囲の重複チェックや時間フォーマット機能をテストします
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAudioClipsByVideo } from "./api";
import type { AudioClip } from "./types";
import {
  checkTimeRangeOverlap,
  formatTime,
  getVideoTimeRanges,
} from "./validation";

// APIモックの作成
vi.mock("./api", () => ({
  getAudioClipsByVideo: vi.fn(),
}));

describe("validation機能", () => {
  // テストごとにモックをリセット
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("checkTimeRangeOverlap関数", () => {
    // モックデータ：既存の音声クリップ
    const mockClips: AudioClip[] = [
      {
        id: "clip1",
        videoId: "video123",
        userId: "user1",
        title: "クリップ1",
        startTime: 10,
        endTime: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublic: true,
      },
      {
        id: "clip2",
        videoId: "video123",
        userId: "user1",
        title: "クリップ2",
        startTime: 30,
        endTime: 40,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublic: true,
      },
    ];

    it("重複しない時間範囲がある場合、重複なしと判定", async () => {
      // モック：クリップリスト取得関数
      vi.mocked(getAudioClipsByVideo).mockResolvedValue({
        clips: mockClips,
        cursor: null,
      });

      // 重複しない範囲を指定してテスト
      const result = await checkTimeRangeOverlap("video123", 22, 28, undefined);

      // 期待するAPIコール引数の検証
      expect(getAudioClipsByVideo).toHaveBeenCalledWith({
        videoId: "video123",
        limit: 1000,
        includePrivate: true,
      });

      // 結果の検証
      expect(result.isOverlapping).toBe(false);
      expect(result.overlappingClips).toHaveLength(0);
    });

    it("時間範囲が既存クリップと重複する場合（ケース1：既存範囲内にすべて含まれる）", async () => {
      // モック：クリップリスト取得関数
      vi.mocked(getAudioClipsByVideo).mockResolvedValue({
        clips: mockClips,
        cursor: null,
      });

      // 既存クリップ（10-20）の範囲内の値でテスト
      const result = await checkTimeRangeOverlap("video123", 12, 18, undefined);

      // 結果の検証
      expect(result.isOverlapping).toBe(true);
      expect(result.overlappingClips).toHaveLength(1);
      expect(result.overlappingClips[0].id).toBe("clip1");
    });

    it("時間範囲が既存クリップと重複する場合（ケース2：既存範囲を完全に含む）", async () => {
      // モック：クリップリスト取得関数
      vi.mocked(getAudioClipsByVideo).mockResolvedValue({
        clips: mockClips,
        cursor: null,
      });

      // 既存クリップ（10-20）を含む範囲でテスト
      const result = await checkTimeRangeOverlap("video123", 5, 25, undefined);

      // 結果の検証
      expect(result.isOverlapping).toBe(true);
      expect(result.overlappingClips).toHaveLength(1);
      expect(result.overlappingClips[0].id).toBe("clip1");
    });

    it("時間範囲が既存クリップと重複する場合（ケース3：開始点が既存範囲内）", async () => {
      // モック：クリップリスト取得関数
      vi.mocked(getAudioClipsByVideo).mockResolvedValue({
        clips: mockClips,
        cursor: null,
      });

      // 開始点が既存クリップ（10-20）の範囲内でテスト
      const result = await checkTimeRangeOverlap("video123", 15, 25, undefined);

      // 結果の検証
      expect(result.isOverlapping).toBe(true);
      expect(result.overlappingClips).toHaveLength(1);
      expect(result.overlappingClips[0].id).toBe("clip1");
    });

    it("時間範囲が既存クリップと重複する場合（ケース4：終了点が既存範囲内）", async () => {
      // モック：クリップリスト取得関数
      vi.mocked(getAudioClipsByVideo).mockResolvedValue({
        clips: mockClips,
        cursor: null,
      });

      // 終了点が既存クリップ（10-20）の範囲内でテスト
      const result = await checkTimeRangeOverlap("video123", 5, 15, undefined);

      // 結果の検証
      expect(result.isOverlapping).toBe(true);
      expect(result.overlappingClips).toHaveLength(1);
      expect(result.overlappingClips[0].id).toBe("clip1");
    });

    it("複数のクリップと重複する場合の判定", async () => {
      // モック：クリップリスト取得関数（複数クリップを含む）
      vi.mocked(getAudioClipsByVideo).mockResolvedValue({
        clips: [
          ...mockClips,
          {
            id: "clip3",
            videoId: "video123",
            userId: "user1",
            title: "クリップ3",
            startTime: 50,
            endTime: 60,
            createdAt: new Date(),
            updatedAt: new Date(),
            isPublic: true,
          },
        ],
        cursor: null,
      });

      // 複数のクリップにまたがる範囲でテスト
      const result = await checkTimeRangeOverlap("video123", 15, 55, undefined);

      // 結果の検証
      expect(result.isOverlapping).toBe(true);
      expect(result.overlappingClips).toHaveLength(3);
      expect(result.overlappingClips.map((clip) => clip.id)).toContain("clip1");
      expect(result.overlappingClips.map((clip) => clip.id)).toContain("clip2");
      expect(result.overlappingClips.map((clip) => clip.id)).toContain("clip3");
    });

    it("除外クリップIDを指定した場合、そのクリップは重複チェックから除外される", async () => {
      // モック：クリップリスト取得関数
      vi.mocked(getAudioClipsByVideo).mockResolvedValue({
        clips: mockClips,
        cursor: null,
      });

      // 除外IDを指定して、同じ時間範囲のテスト
      const result = await checkTimeRangeOverlap("video123", 10, 20, "clip1");

      // 結果の検証（clip1は除外されるため重複なし）
      expect(result.isOverlapping).toBe(false);
      expect(result.overlappingClips).toHaveLength(0);
    });

    it("API呼び出しでエラーが発生した場合の処理", async () => {
      // モック：API呼び出しでエラー
      vi.mocked(getAudioClipsByVideo).mockRejectedValue(
        new Error("API呼び出し失敗"),
      );

      // エラー処理のテスト
      await expect(
        checkTimeRangeOverlap("video123", 10, 20, undefined),
      ).rejects.toThrow("API呼び出し失敗");
    });
  });

  describe("getVideoTimeRanges関数", () => {
    it("正しい時間範囲リストが返されること", async () => {
      // モック：クリップリスト取得関数
      vi.mocked(getAudioClipsByVideo).mockResolvedValue({
        clips: [
          {
            id: "clip1",
            videoId: "video123",
            userId: "user1",
            title: "クリップ1",
            startTime: 10,
            endTime: 20,
            createdAt: new Date(),
            updatedAt: new Date(),
            isPublic: true,
          },
          {
            id: "clip2",
            videoId: "video123",
            userId: "user1",
            title: "クリップ2",
            startTime: 30,
            endTime: 40,
            createdAt: new Date(),
            updatedAt: new Date(),
            isPublic: true,
          },
        ],
        cursor: null,
      });

      // 時間範囲リストの取得
      const result = await getVideoTimeRanges("video123");

      // 期待するAPIコール引数の検証
      expect(getAudioClipsByVideo).toHaveBeenCalledWith({
        videoId: "video123",
        limit: 1000,
        includePrivate: true,
      });

      // 結果の検証
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        start: 10,
        end: 20,
        clipId: "clip1",
        title: "クリップ1",
      });
      expect(result[1]).toEqual({
        start: 30,
        end: 40,
        clipId: "clip2",
        title: "クリップ2",
      });
    });

    it("クリップが存在しない場合は空配列を返すこと", async () => {
      // モック：クリップなし
      vi.mocked(getAudioClipsByVideo).mockResolvedValue({
        clips: [],
        cursor: null,
      });

      // 時間範囲リストの取得
      const result = await getVideoTimeRanges("video123");

      // 結果の検証
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });
  });

  describe("formatTime関数", () => {
    it("秒数を正しい「分:秒」形式にフォーマットすること", () => {
      // 様々なケースをテスト
      expect(formatTime(0)).toBe("0:00");
      expect(formatTime(5)).toBe("0:05");
      expect(formatTime(59)).toBe("0:59");
      expect(formatTime(60)).toBe("1:00");
      expect(formatTime(65)).toBe("1:05");
      expect(formatTime(125)).toBe("2:05");
      expect(formatTime(3661)).toBe("61:01"); // 1時間1分1秒 = 61分1秒
    });

    it("小数点以下は切り捨てること", () => {
      expect(formatTime(5.9)).toBe("0:05");
      expect(formatTime(59.999)).toBe("0:59");
      expect(formatTime(60.1)).toBe("1:00");
    });
  });
});
