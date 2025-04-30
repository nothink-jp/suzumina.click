// functions/src/utils/firestore.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// @google-cloud/firestore のモック
vi.mock("@google-cloud/firestore", () => {
  const mockFirestore = vi.fn();
  const mockNow = vi.fn().mockReturnValue({
    seconds: 1234567890,
    nanoseconds: 0,
    toDate: () => new Date(1234567890 * 1000),
  });
  const mockFromDate = vi.fn().mockImplementation((date) => ({
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => date,
  }));

  return {
    Firestore: mockFirestore,
    Timestamp: {
      now: mockNow,
      fromDate: mockFromDate,
    },
  };
});

// configモジュールのモック
vi.mock("../config", () => ({
  getFirestoreConfig: vi.fn(),
  isEmulatorMode: vi.fn().mockReturnValue(false),
}));

// ロガーのモック
vi.mock("./logger", () => ({
  info: vi.fn(),
  error: vi.fn(),
}));

// テストの前にモジュールをインポート
let firestoreModule: any;
let getFirestore: any;
let createFirestoreOptions: any;
let createFirestoreInstance: any;
let resetFirestoreInstance: any;
let Timestamp: any;
let mockFirestoreConstructor: any;
let mockTimestampNow: any;
let mockTimestampFromDate: any;
let mockGetFirestoreConfig: any;
let mockIsEmulatorMode: any;
let mockLoggerInfo: any;

describe("firestore", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // モジュールのキャッシュをリセット
    vi.resetModules();

    // スパイを設定
    const googleFirestore = await import("@google-cloud/firestore");
    mockFirestoreConstructor = vi.spyOn(googleFirestore, "Firestore");
    mockTimestampNow = vi.spyOn(googleFirestore.Timestamp, "now");
    mockTimestampFromDate = vi.spyOn(googleFirestore.Timestamp, "fromDate");

    // configのmockをインポート
    const config = await import("../config");
    mockGetFirestoreConfig = vi.spyOn(config, "getFirestoreConfig");
    mockIsEmulatorMode = vi.spyOn(config, "isEmulatorMode");

    // loggerのmockをインポート
    const logger = await import("./logger");
    mockLoggerInfo = vi.spyOn(logger, "info");

    // テスト対象モジュールをインポート
    const importedModule = await import("./firestore");
    firestoreModule = importedModule.default;
    getFirestore = importedModule.getFirestore;
    createFirestoreOptions = importedModule.createFirestoreOptions;
    createFirestoreInstance = importedModule.createFirestoreInstance;
    resetFirestoreInstance = importedModule.resetFirestoreInstance;
    Timestamp = importedModule.Timestamp;
  });

  describe("getFirestore", () => {
    it("シングルトンとして動作し、初回呼び出し時のみFirestoreインスタンスを作成すること", () => {
      // 1回目の呼び出し
      const instance1 = getFirestore();
      expect(mockFirestoreConstructor).toHaveBeenCalledTimes(1);

      // 2回目の呼び出し
      const instance2 = getFirestore();
      expect(mockFirestoreConstructor).toHaveBeenCalledTimes(1); // 追加で呼ばれていないこと

      // 同じインスタンスが返されること
      expect(instance1).toBe(instance2);
    });

    it("デフォルトエクスポートとgetFirestore()が同じインスタンスを返すこと", () => {
      const defaultInstance = firestoreModule;
      const getFirestoreInstance = getFirestore();

      expect(defaultInstance).toBe(getFirestoreInstance);
    });

    it("resetFirestoreInstance()の後に呼び出すと新しいインスタンスが作成されること", () => {
      // 1回目の呼び出し
      const instance1 = getFirestore();
      expect(mockFirestoreConstructor).toHaveBeenCalledTimes(1);

      // インスタンスをリセット
      resetFirestoreInstance();

      // リセット後の呼び出し
      const instance2 = getFirestore();
      expect(mockFirestoreConstructor).toHaveBeenCalledTimes(2); // 新たにインスタンスが作成されること

      // 異なるインスタンスが返されること
      expect(instance1).not.toBe(instance2);
    });
  });

  describe("createFirestoreOptions", () => {
    // 各テスト実行前にモックをリセット
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("エミュレータモードではない場合、undefinedを返すこと", () => {
      // モックの設定
      mockIsEmulatorMode.mockReturnValue(false);
      mockGetFirestoreConfig.mockReturnValue({});

      // 関数を実行
      const options = createFirestoreOptions();

      // アサーション
      expect(options).toBeUndefined();
      // ロガー呼び出しのアサーション（エミュレータモード時のみ呼ばれるべき）
      expect(mockLoggerInfo).not.toHaveBeenCalledWith(
        expect.stringContaining("Firestoreエミュレータに接続します"),
      );
    });

    it("エミュレータモードかつuseEmulator=trueの場合、ホストとポートが設定されたオプションを返すこと", () => {
      // モックの設定
      mockIsEmulatorMode.mockReturnValue(true);
      mockGetFirestoreConfig.mockReturnValue({
        useEmulator: true,
        host: "localhost",
        port: 8080,
      });

      // 関数を実行
      const options = createFirestoreOptions();

      // アサーション
      expect(options).toEqual({
        host: "localhost",
        port: 8080,
      });
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        "Firestoreエミュレータに接続します: localhost:8080",
      );
    });

    it("エミュレータモードでもuseEmulator=falseの場合、undefinedを返すこと", () => {
      // モックの設定
      mockIsEmulatorMode.mockReturnValue(true);
      mockGetFirestoreConfig.mockReturnValue({
        useEmulator: false,
      });

      // 関数を実行
      const options = createFirestoreOptions();

      // アサーション
      expect(options).toBeUndefined();
      // ロガー呼び出しのアサーション（エミュレータモード＆useEmulator=trueの場合のみ呼ばれるべき）
      expect(mockLoggerInfo).not.toHaveBeenCalledWith(
        expect.stringContaining("Firestoreエミュレータに接続します"),
      );
    });
  });

  describe("createFirestoreInstance", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("createFirestoreOptionsの結果をFirestoreコンストラクタに渡すこと", () => {
      // エミュレータモードのテストケース
      mockIsEmulatorMode.mockReturnValue(true);
      mockGetFirestoreConfig.mockReturnValue({
        useEmulator: true,
        host: "localhost",
        port: 8080,
      });

      createFirestoreInstance();

      expect(mockFirestoreConstructor).toHaveBeenCalledWith({
        host: "localhost",
        port: 8080,
      });
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        "Firestoreクライアントが初期化されました",
      );
    });

    it("非エミュレータモードの場合、オプションなしでFirestoreを初期化すること", () => {
      mockIsEmulatorMode.mockReturnValue(false);
      mockGetFirestoreConfig.mockReturnValue({});

      createFirestoreInstance();

      expect(mockFirestoreConstructor).toHaveBeenCalledWith(undefined);
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        "Firestoreクライアントが初期化されました",
      );
    });
  });

  describe("Timestamp", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("Timestamp.nowがFirestoreのTimestamp.nowを正しくラップすること", () => {
      const timestamp = Timestamp.now();

      expect(mockTimestampNow).toHaveBeenCalledTimes(1);
      expect(timestamp).toEqual(
        expect.objectContaining({
          seconds: 1234567890,
          nanoseconds: 0,
        }),
      );
    });

    it("Timestamp.fromDateがFirestoreのTimestamp.fromDateを正しくラップすること", () => {
      const testDate = new Date(2023, 1, 1);

      const timestamp = Timestamp.fromDate(testDate);

      expect(mockTimestampFromDate).toHaveBeenCalledWith(testDate);
      expect(timestamp).toEqual(
        expect.objectContaining({
          seconds: Math.floor(testDate.getTime() / 1000),
          nanoseconds: 0,
        }),
      );
    });
  });
});
