import "@/../tests/setup"; // ルートからの実行を考慮したパスに変更
import { afterEach, describe, expect, it } from "bun:test";
import { getRequiredEnvVar, isBuildTime, isProductionRuntime } from "./utils";

describe("認証システムの環境変数ハンドリング", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv }; // 環境変数を元に戻す
  });

  describe("getRequiredEnvVar", () => {
    it("開発環境で値が存在する場合はその値を返す", () => {
      process.env = {
        ...process.env,
        NODE_ENV: "development",
        TEST_VAR: "test-value",
      };
      expect(getRequiredEnvVar("TEST_VAR")).toBe("test-value");
    });

    it("ビルド時はダミー値を返す", () => {
      process.env = {
        ...process.env,
        NEXT_PHASE: "phase-production-build",
        NODE_ENV: "production",
      };
      expect(getRequiredEnvVar("MISSING_VAR")).toBe("dummy-MISSING_VAR");
    });

    it("本番環境で値が未設定の場合はエラーをスロー", () => {
      process.env = {
        ...process.env,
        NODE_ENV: "production",
        MISSING_VAR: undefined,
      }; // undefinedを代入
      expect(() => getRequiredEnvVar("MISSING_VAR")).toThrow(
        "Configuration Error: MISSING_VAR is not defined",
      );
    });

    it("開発環境で値が未設定の場合は空文字列を返す", () => {
      process.env = {
        ...process.env,
        NODE_ENV: "development",
        MISSING_VAR: undefined,
      }; // undefinedを代入
      expect(getRequiredEnvVar("MISSING_VAR")).toBe("");
    });
  });

  describe("isBuildTime", () => {
    it("NEXT_PHASEがphase-production-buildの場合にtrueを返す", () => {
      process.env = { ...process.env, NEXT_PHASE: "phase-production-build" };
      expect(isBuildTime()).toBe(true);
    });

    it("NEXT_PHASEが設定されていない場合にfalseを返す", () => {
      process.env = { ...process.env, NEXT_PHASE: undefined }; // undefinedを代入
      expect(isBuildTime()).toBe(false);
    });
  });

  describe("isProductionRuntime", () => {
    it("NODE_ENVがproductionでビルド時でない場合にtrueを返す", () => {
      process.env = {
        ...process.env,
        NODE_ENV: "production",
        NEXT_PHASE: undefined,
      }; // undefinedを代入
      expect(isProductionRuntime()).toBe(true);
    });

    it("NODE_ENVがdevelopmentの場合にfalseを返す", () => {
      process.env = { ...process.env, NODE_ENV: "development" };
      expect(isProductionRuntime()).toBe(false);
    });

    it("ビルド時にfalseを返す", () => {
      process.env = {
        ...process.env,
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-build",
      };
      expect(isProductionRuntime()).toBe(false);
    });
  });
});
