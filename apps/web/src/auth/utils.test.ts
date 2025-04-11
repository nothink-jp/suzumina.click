import "@/../tests/setup";
import { afterEach, describe, expect, it } from "bun:test";
import { getRequiredEnvVar, isProductionRuntime } from "./utils";

describe("環境変数ユーティリティ", () => {
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

    it("本番環境で必須の環境変数が未設定の場合はエラーをスロー", () => {
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

    it("本番環境で値が空文字列でも値として受け入れる", () => {
      process.env = {
        ...process.env,
        NODE_ENV: "production",
        EMPTY_VAR: "",
      };
      expect(getRequiredEnvVar("EMPTY_VAR")).toBe("");
    });

    it("テスト環境では開発環境と同様に扱う", () => {
      process.env = {
        ...process.env,
        NODE_ENV: "test",
      };
      expect(getRequiredEnvVar("MISSING_VAR")).toBe("");
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
