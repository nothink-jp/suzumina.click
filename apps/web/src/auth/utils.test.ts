import "@/../tests/setup";
import { afterEach, describe, expect, it } from "bun:test";
import { getRequiredEnvVar, isProductionRuntime } from "./utils";

describe("認証システムの環境変数ハンドリング", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
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

    it("本番環境で値が未設定の場合はエラーをスロー", () => {
      process.env = {
        ...process.env,
        NODE_ENV: "production",
      };
      expect(() => getRequiredEnvVar("MISSING_VAR")).toThrow(
        "環境変数エラー: MISSING_VAR が本番環境で設定されていません",
      );
    });

    it("開発環境で値が未設定の場合は空文字列を返す", () => {
      process.env = {
        ...process.env,
        NODE_ENV: "development",
      };
      expect(getRequiredEnvVar("MISSING_VAR")).toBe("");
    });

    it("非標準の環境変数値の場合も適切に処理される", () => {
      process.env = {
        ...process.env,
        NODE_ENV: "test",
      };
      expect(getRequiredEnvVar("MISSING_VAR")).toBe("");
      expect(isProductionRuntime()).toBe(false);
    });

    it("本番環境で値が空文字列の場合はその値を返す", () => {
      process.env = {
        ...process.env,
        NODE_ENV: "production",
        EMPTY_VAR: "",
      };
      expect(getRequiredEnvVar("EMPTY_VAR")).toBe("");
    });

    it("本番環境で値が設定されている場合は正しく値を返す", () => {
      process.env = {
        ...process.env,
        NODE_ENV: "production",
        TEST_VAR: "production-value",
      };
      expect(getRequiredEnvVar("TEST_VAR")).toBe("production-value");
    });

    it("URLのような複雑な値も適切に処理される", () => {
      const testUrl = "postgresql://user:pass@localhost:5432/db";
      process.env = {
        ...process.env,
        NODE_ENV: "production",
        DATABASE_URL: testUrl,
      };
      expect(getRequiredEnvVar("DATABASE_URL")).toBe(testUrl);
    });
  });

  describe("isProductionRuntime", () => {
    it("NODE_ENVがproductionの場合にtrueを返す", () => {
      process.env = {
        ...process.env,
        NODE_ENV: "production",
      };
      expect(isProductionRuntime()).toBe(true);
    });

    it("NODE_ENVがdevelopmentの場合にfalseを返す", () => {
      process.env = {
        ...process.env,
        NODE_ENV: "development",
      };
      expect(isProductionRuntime()).toBe(false);
    });

    it("NODE_ENVがtestの場合にfalseを返す", () => {
      process.env = {
        ...process.env,
        NODE_ENV: "test",
      };
      expect(isProductionRuntime()).toBe(false);
    });
  });
});
