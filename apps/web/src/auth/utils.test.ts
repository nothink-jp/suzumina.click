import { beforeEach, describe, expect, it } from "bun:test";
import { getRequiredEnvVar, ConfigurationError } from "./utils";

describe("認証システムの環境変数ハンドリング", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // 各テストの前に環境変数をリセット
    process.env = { ...originalEnv };
  });

  describe("getRequiredEnvVar", () => {
    it("開発環境で値が存在する場合はその値を返す", () => {
      // 準備
      process.env = {
        ...process.env,
        NODE_ENV: "development",
        TEST_VAR: "test-value",
      };

      // 実行
      const result = getRequiredEnvVar("TEST_VAR");

      // 検証
      expect(result).toBe("test-value");
    });

    it("ビルド時はダミー値を返す", () => {
      // 準備
      process.env = {
        ...process.env,
        NEXT_PHASE: "phase-production-build",
      };

      // 実行
      const result = getRequiredEnvVar("TEST_VAR");

      // 検証
      expect(result).toBe("dummy-TEST_VAR");
    });

    it("本番環境で値が未設定の場合はエラーをスロー", () => {
      // 準備
      process.env = {
        ...process.env,
        NODE_ENV: "production",
      };

      // 実行と検証
      expect(() => getRequiredEnvVar("TEST_VAR")).toThrow(ConfigurationError);
    });
  });
});