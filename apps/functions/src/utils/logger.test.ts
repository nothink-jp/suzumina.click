// functions/src/utils/logger.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as logger from "./logger";

describe("logger", () => {
  // コンソール出力のモック
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // console.log をモックに置き換え
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    // テスト後にモックをリセット
    consoleSpy.mockRestore();
    vi.resetAllMocks();
  });

  it("info メソッドがINFOレベルで正しくログを出力すること", () => {
    const testMessage = "テスト情報ログ";
    logger.info(testMessage);

    // 正しいJSONフォーマットでログが出力されたか検証
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const loggedData = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(loggedData).toMatchObject({
      severity: "INFO",
      message: testMessage,
    });
  });

  it("warn メソッドがWARNINGレベルで正しくログを出力すること", () => {
    const testMessage = "テスト警告ログ";
    logger.warn(testMessage);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const loggedData = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(loggedData).toMatchObject({
      severity: "WARNING",
      message: testMessage,
    });
  });

  it("error メソッドがERRORレベルで正しくログを出力すること", () => {
    const testMessage = "テストエラーログ";
    logger.error(testMessage);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const loggedData = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(loggedData).toMatchObject({
      severity: "ERROR",
      message: testMessage,
    });
  });

  it("debug メソッドがDEBUGレベルで正しくログを出力すること", () => {
    const testMessage = "テストデバッグログ";
    logger.debug(testMessage);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const loggedData = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(loggedData).toMatchObject({
      severity: "DEBUG",
      message: testMessage,
    });
  });

  it("追加のメタデータが正しくログに含まれること", () => {
    const testMessage = "メタデータ付きログ";
    const metadata = { userId: "user123", action: "login" };
    logger.info(testMessage, metadata);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const loggedData = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(loggedData).toMatchObject({
      severity: "INFO",
      message: testMessage,
      userId: "user123",
      action: "login",
    });
  });

  it("エラーオブジェクトが正しく処理されること", () => {
    const testMessage = "エラーオブジェクト付きログ";
    const testError = new Error("テストエラー");
    logger.error(testMessage, testError);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const loggedData = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(loggedData).toMatchObject({
      severity: "ERROR",
      message: testMessage,
      error: {
        message: "テストエラー",
        name: "Error",
      },
    });
    // スタックトレースも含まれていることを確認
    expect(loggedData.error.stack).toBeDefined();
  });
});
