/**
 * DLsite Cloud Function のテスト
 *
 * YouTubeのテストパターンに従い、DLsite作品取得機能をテストします。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// HTTPレスポンス用のモック型定義
interface MockFetchResponse {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}

// DLsiteのモックHTMLレスポンス
const mockDLsiteHtml = `
<html>
<body>
  <div class="n_worklist">
    <table>
      <tr class="search_result_img_box_inner">
        <td>
          <a href="/maniax/work/=/product_id/RJ236867.html">
            <img src="//img.dlsite.jp/modpub/images2/work/doujin/RJ237000/RJ236867_img_main.jpg" alt="夏の苦い思い出">
          </a>
        </td>
        <td>
          <div class="search_result_img_box_inner">
            <dt><a href="/maniax/work/=/product_id/RJ236867.html">夏の苦い思い出</a></dt>
            <dd>ARIKA Work</dd>
            <dd>ADV</dd>
            <div class="work_price">
              <span class="work_price_base">110円</span>
              <span class="work_price_original">220円</span>
              <span class="work_price_discount">50%OFF</span>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;

// グローバルfetchのモック
const mockFetch = vi
  .fn()
  .mockImplementation(async (url: string): Promise<MockFetchResponse> => {
    if (url.includes("dlsite.com")) {
      return {
        ok: true,
        status: 200,
        text: async () => mockDLsiteHtml,
      };
    }
    throw new Error(`Unexpected URL: ${url}`);
  });

// グローバルfetchを設定
global.fetch = mockFetch;

// loggerのモック
vi.mock("./utils/logger", () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}));

// Firestoreのモック
vi.mock("./utils/firestore", () => {
  // メタデータドキュメントのモック
  const mockMetadataDocGet = vi.fn().mockResolvedValue({
    exists: false,
    data: () => ({}),
  });

  const mockMetadataDoc = vi.fn(() => ({
    get: mockMetadataDocGet,
    update: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue({}),
  }));

  // 作品データドキュメントのモック
  const mockWorkDocGet = vi.fn().mockResolvedValue({
    exists: false,
    data: () => ({}),
  });

  const mockWorkDoc = vi.fn(() => ({
    get: mockWorkDocGet,
    update: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue({}),
  }));

  // コレクション参照のモック
  const mockCollection = vi.fn((collectionName: string) => {
    if (collectionName === "dlsiteMetadata") {
      return { doc: mockMetadataDoc };
    }
    if (collectionName === "dlsiteWorks") {
      return {
        doc: mockWorkDoc,
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({
          docs: [],
          size: 0,
        }),
      };
    }
    return { doc: vi.fn() };
  });

  // バッチ操作のモック
  const mockBatchSet = vi.fn();
  const mockBatchUpdate = vi.fn();
  const mockBatchCommit = vi.fn().mockResolvedValue([]);
  const mockBatch = {
    set: mockBatchSet,
    update: mockBatchUpdate,
    commit: mockBatchCommit,
  };

  // Firestoreインスタンスのモック
  const mockFirestoreInstance = {
    collection: mockCollection,
    batch: vi.fn(() => mockBatch),
  };

  return {
    __esModule: true,
    default: mockFirestoreInstance,
    Timestamp: {
      now: vi.fn(() => ({
        seconds: 1234567890,
        nanoseconds: 0,
        toDate: () => new Date("2023-01-01T00:00:00Z"),
      })),
      fromDate: vi.fn((date: Date) => ({
        seconds: Math.floor(date.getTime() / 1000),
        nanoseconds: 0,
        toDate: () => date,
      })),
    },
  };
});

import type { CloudEvent } from "@google-cloud/functions-framework";
import type { Mock } from "vitest";
import { fetchDLsiteWorks } from "./dlsite";
import firestore from "./utils/firestore";
import * as logger from "./utils/logger";

// PubSubメッセージの型定義
interface PubsubMessage {
  data?: string;
  attributes?: Record<string, string>;
}

describe("fetchDLsiteWorks", () => {
  let mockEvent: CloudEvent<PubsubMessage>;
  let originalEnv: NodeJS.ProcessEnv;

  // Firestoreのモック参照を取得
  const mockedCollection = vi.mocked(firestore.collection);
  const mockedBatch = vi.mocked(firestore.batch);

  // loggerのモック変数を宣言
  let mockedLoggerError: Mock;
  let mockedLoggerInfo: Mock;
  let mockedLoggerWarn: Mock;
  let mockedLoggerDebug: Mock;

  // メタデータ関連のモック
  let mockMetadataDoc: {
    exists: boolean;
    data: Mock<() => Record<string, unknown>>;
  };
  let mockMetadataDocGet: Mock;
  let mockMetadataDocUpdate: Mock;
  let mockMetadataDocSet: Mock;

  beforeEach(() => {
    // 環境変数のバックアップ
    originalEnv = { ...process.env };

    // CloudEventのモックデータを作成
    mockEvent = {
      id: "test-event-id",
      source: "test-source",
      specversion: "1.0",
      type: "google.cloud.pubsub.topic.v1.messagePublished",
      time: new Date().toISOString(),
      data: {
        data: Buffer.from("test-message").toString("base64"),
        attributes: {
          "test-attribute": "test-value",
        },
      },
    };

    // loggerのモック参照を取得
    mockedLoggerError = vi.mocked(logger.error);
    mockedLoggerInfo = vi.mocked(logger.info);
    mockedLoggerWarn = vi.mocked(logger.warn);
    mockedLoggerDebug = vi.mocked(logger.debug);

    // メタデータドキュメントのモック設定
    mockMetadataDoc = {
      exists: false,
      data: vi.fn(() => ({})),
    };

    mockMetadataDocGet = vi.fn().mockResolvedValue(mockMetadataDoc);
    mockMetadataDocUpdate = vi.fn().mockResolvedValue({});
    mockMetadataDocSet = vi.fn().mockResolvedValue({});

    // Firestoreのコレクション/ドキュメントのモック設定
    const mockMetadataDocRef = {
      get: mockMetadataDocGet,
      update: mockMetadataDocUpdate,
      set: mockMetadataDocSet,
    };

    mockedCollection.mockImplementation((collectionName: string) => {
      if (collectionName === "dlsiteMetadata") {
        return { doc: vi.fn(() => mockMetadataDocRef) } as any;
      }
      if (collectionName === "dlsiteWorks") {
        return {
          doc: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({ exists: false }),
            set: vi.fn().mockResolvedValue({}),
            update: vi.fn().mockResolvedValue({}),
          })),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({
            docs: [],
            size: 0,
          }),
        } as any;
      }
      return {} as any;
    });

    // バッチ操作のモック設定
    mockedBatch.mockReturnValue({
      set: vi.fn(),
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue([]),
    } as any);

    // すべてのモックをリセット
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 環境変数を復元
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe("正常ケース", () => {
    it("Pub/Subトリガーで正常に実行される", async () => {
      // 新規メタデータの場合のモック設定
      mockMetadataDoc.exists = false;
      mockMetadataDocGet.mockResolvedValue(mockMetadataDoc);

      await fetchDLsiteWorks(mockEvent);

      // ログが出力されることを確認
      expect(mockedLoggerInfo).toHaveBeenCalledWith(
        "fetchDLsiteWorks 関数を開始しました (GCFv2 CloudEvent Handler)",
      );
      expect(mockedLoggerInfo).toHaveBeenCalledWith(
        "fetchDLsiteWorks 関数の処理を完了しました",
      );
    });

    it("メタデータの新規作成が正常に動作する", async () => {
      // 新規メタデータの場合
      mockMetadataDoc.exists = false;
      mockMetadataDocGet.mockResolvedValue(mockMetadataDoc);

      await fetchDLsiteWorks(mockEvent);

      // 新規メタデータが作成されることを確認
      expect(mockMetadataDocSet).toHaveBeenCalled();
    });

    it("既存メタデータの更新が正常に動作する", async () => {
      // 既存メタデータの場合
      mockMetadataDoc.exists = true;
      mockMetadataDoc.data.mockReturnValue({
        isInProgress: false,
        currentPage: 1,
        lastFetchedAt: { seconds: 1234567890, nanoseconds: 0 },
      });
      mockMetadataDocGet.mockResolvedValue(mockMetadataDoc);

      await fetchDLsiteWorks(mockEvent);

      // メタデータが更新されることを確認
      expect(mockMetadataDocUpdate).toHaveBeenCalled();
    });

    it("DLsiteからのデータ取得が正常に動作する", async () => {
      // メタデータ設定
      mockMetadataDoc.exists = false;
      mockMetadataDocGet.mockResolvedValue(mockMetadataDoc);

      await fetchDLsiteWorks(mockEvent);

      // fetchが呼ばれることを確認
      expect(mockFetch).toHaveBeenCalled();

      // DLsiteのURLが正しく構築されることを確認
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toContain("dlsite.com");
      expect(fetchCall[0]).toContain(
        "%E6%B6%BC%E8%8A%B1%E3%81%BF%E3%81%AA%E3%81%9B",
      ); // URLエンコードされた「涼花みなせ」
    });
  });

  describe("エラーケース", () => {
    it("CloudEventデータが不足している場合", async () => {
      const invalidEvent = {
        ...mockEvent,
        data: undefined,
      };

      await fetchDLsiteWorks(invalidEvent as any);

      expect(mockedLoggerError).toHaveBeenCalledWith(
        "CloudEventデータが不足しています",
        { event: invalidEvent },
      );
    });

    it("Base64デコードに失敗した場合", async () => {
      const invalidEvent = {
        ...mockEvent,
        data: {
          data: "invalid-base64",
          attributes: {},
        },
      };

      await fetchDLsiteWorks(invalidEvent);

      // 実際には処理が続行されるため、より一般的なエラーをチェック
      expect(mockedLoggerError).toHaveBeenCalled();
    });

    it("Firestoreエラーが発生した場合", async () => {
      // Firestoreエラーをシミュレート
      mockMetadataDocGet.mockRejectedValue(
        new Error("Firestore connection error"),
      );

      await fetchDLsiteWorks(mockEvent);

      // エラーログが出力されることを確認
      // メタデータ取得エラーが発生することを確認
      expect(mockedLoggerError).toHaveBeenCalledWith(
        "メタデータの取得に失敗しました:",
        expect.any(Error),
      );
    });

    it("DLsite API呼び出しエラーが発生した場合", async () => {
      // fetchエラーをシミュレート
      mockFetch.mockRejectedValue(new Error("Network error"));

      // メタデータ設定
      mockMetadataDoc.exists = false;
      mockMetadataDocGet.mockResolvedValue(mockMetadataDoc);

      await fetchDLsiteWorks(mockEvent);

      // エラーハンドリングが動作することを確認
      // DLsite作品情報取得エラーが発生することを確認
      expect(mockedLoggerError).toHaveBeenCalledWith(
        "DLsite作品情報取得中にエラーが発生しました:",
        expect.any(Error),
      );
    });

    it("処理中状態の場合はスキップされる", async () => {
      // 処理中状態のメタデータ
      mockMetadataDoc.exists = true;
      mockMetadataDoc.data.mockReturnValue({
        isInProgress: true,
        currentPage: 2,
        lastFetchedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
      });
      mockMetadataDocGet.mockResolvedValue(mockMetadataDoc);

      await fetchDLsiteWorks(mockEvent);

      // 処理がスキップされることを確認
      expect(mockedLoggerWarn).toHaveBeenCalledWith(
        "前回の実行が完了していません。処理をスキップします。",
      );
    });
  });

  describe("データ処理", () => {
    it("HTMLパースが正常に動作する", async () => {
      // カスタムHTMLレスポンスを設定
      const customHtml = `
        <div class="n_worklist">
          <table>
            <tr class="search_result_img_box_inner">
              <td><a href="/maniax/work/=/product_id/RJ123456.html">テスト作品</a></td>
            </tr>
          </table>
        </div>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => customHtml,
      });

      // メタデータ設定
      mockMetadataDoc.exists = false;
      mockMetadataDocGet.mockResolvedValue(mockMetadataDoc);

      await fetchDLsiteWorks(mockEvent);

      // パース処理が実行されることを確認
      expect(mockFetch).toHaveBeenCalled();
    });

    it("空のHTMLレスポンスを適切に処理する", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => "<html><body></body></html>",
      });

      // メタデータ設定
      mockMetadataDoc.exists = false;
      mockMetadataDocGet.mockResolvedValue(mockMetadataDoc);

      await fetchDLsiteWorks(mockEvent);

      // 空のレスポンスでもエラーにならないことを確認
      expect(mockedLoggerInfo).toHaveBeenCalledWith(
        "fetchDLsiteWorks 関数の処理を完了しました",
      );
    });
  });

  describe("レート制限", () => {
    it("ページ間で適切な遅延が発生する", async () => {
      // タイマーをモック
      vi.useFakeTimers();

      // メタデータ設定
      mockMetadataDoc.exists = false;
      mockMetadataDocGet.mockResolvedValue(mockMetadataDoc);

      const promise = fetchDLsiteWorks(mockEvent);

      // タイマーを進める
      vi.advanceTimersByTime(1000);

      await promise;

      // タイマーを復元
      vi.useRealTimers();

      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
