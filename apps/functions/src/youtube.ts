import type { CloudEvent } from "@google-cloud/functions-framework";
import { google } from "googleapis";
import type { youtube_v3 } from "googleapis";
import { SUZUKA_MINASE_CHANNEL_ID, type YouTubeVideoData } from "./common";
import firestore, { Timestamp } from "./utils/firestore";
// functions/src/youtube.ts
import * as logger from "./utils/logger";

// YouTube API初期化時のチェック
(function initializeYoutubeModule() {
  // 環境変数のチェック
  if (!process.env.YOUTUBE_API_KEY) {
    logger.warn("環境変数 YOUTUBE_API_KEY が設定されていません");
  }
})();

// YouTube API クォータ制限関連の定数
const MAX_VIDEOS_PER_BATCH = 50; // YouTube APIの最大結果数
const QUOTA_EXCEEDED_CODE = 403; // クォータ超過エラーコード
const MAX_RETRY_ATTEMPTS = 3; // リトライ回数
const RETRY_DELAY_MS = 5000; // リトライ間隔（ミリ秒）

// メタデータ保存用のドキュメントID
const METADATA_DOC_ID = "fetch_metadata";

// Firestore関連の定数
const VIDEOS_COLLECTION = "videos";
const METADATA_COLLECTION = "youtubeMetadata";
const MAX_FIRESTORE_BATCH_SIZE = 500; // Firestoreのバッチ書き込み上限

// 実行制限関連の定数
const MAX_PAGES_PER_EXECUTION = 3; // 1回の実行での最大ページ数

// メタデータの型定義
interface FetchMetadata {
  lastFetchedAt: Timestamp;
  nextPageToken?: string;
  isInProgress: boolean;
  lastError?: string;
  lastSuccessfulCompleteFetch?: Timestamp;
}

/**
 * 処理結果の型定義
 *
 * @interface FetchResult
 * @property {number} videoCount - 取得した動画数
 * @property {string} [error] - エラーメッセージ（エラー発生時のみ）
 */
interface FetchResult {
  videoCount: number;
  error?: string;
}

/**
 * YouTube API エラーの型定義
 */
interface YouTubeApiError {
  code?: number;
  message?: string;
}

/**
 * Pub/SubメッセージのPubsubMessage型定義
 */
interface PubsubMessage {
  data?: string;
  attributes?: Record<string, string>;
}

/**
 * 指定された時間だけ待機する関数
 *
 * @param ms - 待機するミリ秒
 * @returns Promise<void>
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * リトライ機能付きのYouTube API呼び出し関数
 *
 * @param apiCall - YouTube API呼び出し関数
 * @param attempts - 最大リトライ回数
 * @returns Promise<T> - API呼び出し結果
 */
async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  attempts: number = MAX_RETRY_ATTEMPTS,
): Promise<T> {
  try {
    return await apiCall();
  } catch (error: unknown) {
    // クォータ超過エラーまたはリトライ回数超過の場合は例外をスロー
    const apiError = error as YouTubeApiError;
    if (apiError.code === QUOTA_EXCEEDED_CODE || attempts <= 1) {
      throw error;
    }

    // リトライ処理
    logger.warn(
      `API呼び出しに失敗しました。${RETRY_DELAY_MS}ms後に再試行します。残りリトライ回数: ${attempts - 1}`,
    );
    await sleep(RETRY_DELAY_MS);
    return retryApiCall(apiCall, attempts - 1);
  }
}

/**
 * メタデータの取得または初期化
 *
 * @returns Promise<FetchMetadata> - 取得または初期化されたメタデータ
 */
async function getOrCreateMetadata(): Promise<FetchMetadata> {
  const metadataRef = firestore
    .collection(METADATA_COLLECTION)
    .doc(METADATA_DOC_ID);
  const doc = await metadataRef.get();

  if (doc.exists) {
    return doc.data() as FetchMetadata;
  }
  // 初期メタデータの作成
  const initialMetadata: FetchMetadata = {
    lastFetchedAt: Timestamp.now(),
    isInProgress: false,
  };
  await metadataRef.set(initialMetadata);
  return initialMetadata;
}

/**
 * メタデータの更新
 *
 * @param updates - 更新するメタデータのフィールド
 * @returns Promise<void>
 */
async function updateMetadata(updates: Partial<FetchMetadata>): Promise<void> {
  const metadataRef = firestore
    .collection(METADATA_COLLECTION)
    .doc(METADATA_DOC_ID);

  // undefined値を持つプロパティをnullに変換する（テストに合わせるため）
  const sanitizedUpdates: Record<string, Timestamp | boolean | string | null> =
    {
      lastFetchedAt: Timestamp.now(), // 常に最終実行時間を更新
    };

  // updatesの各プロパティをチェックし、undefined値をnullに変換
  // lastFetchedAtは常に上記で設定した値を使用するため、処理から除外する
  for (const [key, value] of Object.entries(updates)) {
    if (key !== "lastFetchedAt") {
      // lastFetchedAtは上書きしない
      // undefinedの場合はnullを設定（テスト互換性のため）
      sanitizedUpdates[key] = value === undefined ? null : value;
    }
  }

  // 有効な更新データをFirestoreに送信
  await metadataRef.update(sanitizedUpdates);
}

/**
 * YouTube APIクライアントを初期化する
 *
 * @returns YouTube APIクライアントと結果オブジェクトのタプル
 */
function initializeYouTubeClient(): [
  youtube_v3.Youtube | undefined,
  FetchResult | undefined,
] {
  // YouTube API キーの取得と検証
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    logger.error("環境変数に YOUTUBE_API_KEY が設定されていません");
    return [
      undefined,
      { videoCount: 0, error: "YouTube API Keyが設定されていません" },
    ];
  }

  // YouTubeクライアント初期化
  const youtube = google.youtube({
    version: "v3",
    auth: apiKey,
  });

  return [youtube, undefined];
}

/**
 * 処理開始前のメタデータチェックと初期化
 *
 * @returns Promise<[FetchMetadata | undefined, FetchResult | undefined]> - メタデータと結果オブジェクトのタプル
 */
async function prepareExecution(): Promise<
  [FetchMetadata | undefined, FetchResult | undefined]
> {
  // 前回の実行状態を取得
  let metadata: FetchMetadata;
  try {
    metadata = await getOrCreateMetadata();

    // 既に実行中の場合はスキップ（二重実行防止）
    if (metadata.isInProgress) {
      logger.warn("前回の実行が完了していません。処理をスキップします。");
      return [
        undefined,
        { videoCount: 0, error: "前回の処理が完了していません" },
      ];
    }

    // 処理開始を記録
    await updateMetadata({ isInProgress: true });
    return [metadata, undefined];
  } catch (error) {
    logger.error("メタデータの取得に失敗しました:", error);
    return [
      undefined,
      { videoCount: 0, error: "メタデータの取得に失敗しました" },
    ];
  }
}

/**
 * YouTube動画IDを検索して取得
 *
 * @param youtube - YouTube APIクライアント
 * @param metadata - 取得済みのメタデータ
 * @returns Promise<{videoIds: string[], nextPageToken: string | undefined, isComplete: boolean}> - 取得した動画IDと関連情報
 */
async function fetchVideoIds(
  youtube: youtube_v3.Youtube,
  metadata: FetchMetadata,
): Promise<{
  videoIds: string[];
  nextPageToken: string | undefined;
  isComplete: boolean;
}> {
  // 初期化
  const allVideoIds: string[] = [];
  let nextPageToken: string | undefined = metadata.nextPageToken;
  const isInitialFetch = !nextPageToken;
  let pageCount = 0;
  let isComplete = false;

  if (nextPageToken) {
    logger.info(`前回の続きから取得を再開します。トークン: ${nextPageToken}`);
  } else {
    logger.debug("新規に全動画の取得を開始します");
  }

  // ページネーションを使用して動画IDを取得（制限付き）
  do {
    try {
      // YouTube API 呼び出し（リトライ機能付き）
      const searchResponse: youtube_v3.Schema$SearchListResponse =
        await retryApiCall(async () => {
          const response = await youtube.search.list({
            part: ["id", "snippet"], // snippetも取得して配信状態を確認できるようにする
            channelId: SUZUKA_MINASE_CHANNEL_ID,
            maxResults: MAX_VIDEOS_PER_BATCH,
            type: ["video"],
            order: "date",
            pageToken: nextPageToken,
          });
          return response.data;
        });

      const videoIds =
        searchResponse.items
          ?.map((item) => item.id?.videoId)
          .filter((id): id is string => !!id) ?? [];

      allVideoIds.push(...videoIds);
      nextPageToken = searchResponse.nextPageToken ?? undefined;

      logger.debug(
        `${videoIds.length}件の動画IDを取得しました。次ページトークン: ${nextPageToken || "なし"}`,
      );

      // メタデータ更新
      await updateMetadata({ nextPageToken });

      // ページカウントを増やす
      pageCount++;

      // 1回の実行で処理するページ数を制限
      if (pageCount >= MAX_PAGES_PER_EXECUTION && nextPageToken) {
        logger.info(
          `最大ページ数(${MAX_PAGES_PER_EXECUTION})に達しました。次回の実行で続きを処理します。`,
        );
        break;
      }
    } catch (error: unknown) {
      const apiError = error as YouTubeApiError;
      if (apiError.code === QUOTA_EXCEEDED_CODE) {
        // クォータ超過の場合
        logger.error(
          "YouTube API クォータを超過しました。処理を中断します:",
          error,
        );
        await updateMetadata({
          isInProgress: false,
          lastError: "YouTube API quota exceeded",
        });
        throw new Error("YouTube APIクォータを超過しました");
      }
      // その他のエラー
      throw error;
    }
  } while (nextPageToken);

  // 全ページ取得完了（nextPageTokenがない）
  if (!nextPageToken && !isInitialFetch) {
    logger.info("全ての動画IDの取得が完了しました");
    isComplete = true;
  }

  return { videoIds: allVideoIds, nextPageToken, isComplete };
}

/**
 * 動画IDから詳細情報を取得
 *
 * @param youtube - YouTube APIクライアント
 * @param videoIds - 取得する動画IDの配列
 * @returns Promise<youtube_v3.Schema$Video[]> - 取得した動画詳細情報
 */
async function fetchVideoDetails(
  youtube: youtube_v3.Youtube,
  videoIds: string[],
): Promise<youtube_v3.Schema$Video[]> {
  logger.debug("動画の詳細情報を取得中...");
  const videoDetails: youtube_v3.Schema$Video[] = [];

  // YouTube API の制限（最大50件）に合わせてバッチ処理
  for (let i = 0; i < videoIds.length; i += MAX_VIDEOS_PER_BATCH) {
    try {
      const batchIds = videoIds.slice(i, i + MAX_VIDEOS_PER_BATCH);

      // YouTube API 呼び出し（リトライ機能付き）
      const videoResponse: youtube_v3.Schema$VideoListResponse =
        await retryApiCall(async () => {
          const response = await youtube.videos.list({
            part: [
              "snippet",
              "contentDetails",
              "statistics",
              "liveStreamingDetails",
            ],
            id: batchIds,
            maxResults: MAX_VIDEOS_PER_BATCH,
          });
          return response.data;
        });

      if (videoResponse.items) {
        videoDetails.push(...videoResponse.items);
      }
      logger.debug(
        `${videoResponse.items?.length ?? 0}件の動画詳細を取得しました（バッチ ${Math.floor(i / MAX_VIDEOS_PER_BATCH) + 1}）`,
      );
    } catch (error: unknown) {
      const apiError = error as YouTubeApiError;
      if (apiError.code === QUOTA_EXCEEDED_CODE) {
        // クォータ超過の場合
        logger.error(
          "YouTube API クォータを超過しました。ここまで取得した情報を保存します:",
          error,
        );
        break; // ループを抜けて、ここまで取得したデータだけを保存
      }
      // その他のエラー
      throw error;
    }
  }

  logger.info(`取得した動画詳細合計: ${videoDetails.length}件`);
  return videoDetails;
}

/**
 * Firestoreに動画データを保存
 *
 * @param videoDetails - 保存する動画詳細情報
 * @returns Promise<number> - 保存した動画数
 */
async function saveVideosToFirestore(
  videoDetails: youtube_v3.Schema$Video[],
): Promise<number> {
  if (videoDetails.length === 0) {
    logger.debug("保存する動画情報がありません");
    return 0;
  }

  logger.debug("動画データをFirestoreに書き込み中...");
  const now = Timestamp.now();
  const videosCollection = firestore.collection(VIDEOS_COLLECTION);
  let batch = firestore.batch();
  let batchCounter = 0;

  // 動画データをFirestoreにバッチ書き込み
  for (const video of videoDetails) {
    if (!video.id || !video.snippet) {
      logger.warn(
        "IDまたはスニペットが不足しているため動画をスキップします:",
        // biome-ignore lint/suspicious/noExplicitAny: Complexity type of Youtube
        video as any,
      );
      continue;
    }

    // Firestoreに保存するデータの作成
    const videoData: YouTubeVideoData = {
      videoId: video.id,
      title: video.snippet.title ?? "",
      description: video.snippet.description ?? "",
      publishedAt: video.snippet.publishedAt
        ? Timestamp.fromDate(new Date(video.snippet.publishedAt))
        : now,
      // 利用可能な最大サイズのサムネイルURLを取得（maxres→standard→high→medium→default）
      thumbnailUrl:
        video.snippet.thumbnails?.maxres?.url ||
        video.snippet.thumbnails?.standard?.url ||
        video.snippet.thumbnails?.high?.url ||
        video.snippet.thumbnails?.medium?.url ||
        video.snippet.thumbnails?.default?.url ||
        "",
      channelId: video.snippet.channelId ?? "",
      channelTitle: video.snippet.channelTitle ?? "",
      lastFetchedAt: now,
      // 配信状態を取得（none, live, upcoming のいずれか）
      liveBroadcastContent: video.snippet.liveBroadcastContent ?? "none",
    };

    const videoRef = videosCollection.doc(video.id);
    batch.set(videoRef, videoData, { merge: true });
    batchCounter++;

    // バッチサイズの上限に達したらコミット
    if (batchCounter >= MAX_FIRESTORE_BATCH_SIZE) {
      logger.debug(
        `${batchCounter}件の動画ドキュメントのバッチをコミット中...`,
      );
      await batch
        .commit()
        .catch((err) =>
          logger.error(
            "Firestoreバッチコミット中にエラーが発生しました (ループ内):",
            err,
          ),
        );
      logger.debug(
        "バッチをコミットしました。バッチとカウンターをリセットします",
      );
      batch = firestore.batch();
      batchCounter = 0;
    }
  }

  // 残りのデータがあればコミット
  if (batchCounter > 0) {
    logger.info(
      `最終バッチ ${batchCounter}件の動画ドキュメントをコミット中...`,
    );
    await batch
      .commit()
      .then(() => {
        logger.debug("Firestoreバッチコミットが成功しました");
      })
      .catch((err) => {
        logger.error(
          "最終Firestoreバッチコミット中にエラーが発生しました:",
          err,
        );
      });
  } else {
    logger.debug("最終バッチに書き込む動画詳細がありませんでした");
  }

  return videoDetails.length;
}

/**
 * YouTube動画情報取得の共通処理
 *
 * @returns Promise<FetchResult> - 処理結果
 */
async function fetchYouTubeVideosLogic(): Promise<FetchResult> {
  try {
    // 1. YouTube APIクライアントの初期化
    const [youtube, initError] = initializeYouTubeClient();
    if (initError) return initError;
    if (!youtube)
      return {
        videoCount: 0,
        error: "YouTubeクライアントの初期化に失敗しました",
      };

    // 2. 実行前準備（メタデータ確認）
    const [metadata, prepError] = await prepareExecution();
    if (prepError) return prepError;
    if (!metadata)
      return { videoCount: 0, error: "メタデータの準備に失敗しました" };

    // 3. 動画IDの取得
    logger.info(
      `チャンネル ${SUZUKA_MINASE_CHANNEL_ID} の動画情報取得を開始します`,
    );
    const { videoIds, nextPageToken, isComplete } = await fetchVideoIds(
      youtube,
      metadata,
    );

    logger.info(`取得した動画ID合計: ${videoIds.length}件`);
    if (videoIds.length === 0) {
      logger.info("チャンネルに動画が見つかりませんでした");
      await updateMetadata({ isInProgress: false });
      return { videoCount: 0 };
    }

    // 4. 動画の詳細情報取得
    const videoDetails = await fetchVideoDetails(youtube, videoIds);

    // 5. Firestoreにデータ保存
    const savedCount = await saveVideosToFirestore(videoDetails);

    // 6. 完全な取得完了の場合、メタデータを更新
    if (isComplete) {
      await updateMetadata({
        nextPageToken: undefined,
        lastSuccessfulCompleteFetch: Timestamp.now(),
      });
    }

    // 7. 処理完了を記録
    await updateMetadata({
      isInProgress: false,
      lastError: undefined,
    });

    return { videoCount: savedCount };
  } catch (error: unknown) {
    // エラー発生時はログ出力して処理終了
    logger.error("YouTube動画情報取得中にエラーが発生しました:", error);

    // 可能な場合はメタデータ更新
    try {
      await updateMetadata({
        isInProgress: false,
        lastError: error instanceof Error ? error.message : String(error),
      });
    } catch (updateError) {
      logger.error("エラー状態の記録に失敗しました:", updateError);
    }

    return {
      videoCount: 0,
      error:
        error instanceof Error ? error.message : "不明なエラーが発生しました",
    };
  }
}

/**
 * YouTubeから涼花みなせチャンネルの動画情報を取得し、Firestoreに保存する関数（Pub/Sub向け）
 *
 * @param event - Pub/SubトリガーからのCloudEvent
 * @returns Promise<void> - 非同期処理の完了を表すPromise
 */
export const fetchYouTubeVideos = async (
  event: CloudEvent<PubsubMessage>,
): Promise<void> => {
  logger.info(
    "fetchYouTubeVideos 関数を開始しました (GCFv2 CloudEvent Handler)",
  );

  try {
    // CloudEvent（Pub/Sub）の場合
    logger.info("Pub/Subトリガーからの実行を検出しました");
    const message = event.data;

    if (!message) {
      logger.error("CloudEventデータが不足しています", { event });
      return;
    }

    // 属性情報の処理 - テストに合わせてフォーマットを変更
    if (message.attributes) {
      logger.info("受信した属性情報:", message.attributes);
    }

    // Base64エンコードされたデータがあれば復号 - テストに合わせてフォーマットを変更
    if (message.data) {
      try {
        const decodedData = Buffer.from(message.data, "base64").toString(
          "utf-8",
        );
        // TypeScriptの型チェックに合格するようオブジェクト形式で渡す
        logger.info("デコードされたメッセージデータ:", {
          message: decodedData,
        });
      } catch (err) {
        logger.error("Base64メッセージデータのデコードに失敗しました:", err);
        return;
      }
    }

    // 共通のロジックを実行
    const result = await fetchYouTubeVideosLogic();

    if (result.error) {
      logger.warn(`YouTube動画取得処理でエラーが発生しました: ${result.error}`);
    } else {
      logger.info(
        `YouTube動画取得処理が正常に完了しました。取得した動画数: ${result.videoCount}件`,
      );
    }

    logger.info("fetchYouTubeVideos 関数の処理を完了しました");
    return;
  } catch (error: unknown) {
    // 例外処理
    logger.error("fetchYouTubeVideos 関数で例外が発生しました:", error);

    // エラー状態を記録
    try {
      await updateMetadata({
        isInProgress: false,
        lastError: error instanceof Error ? error.message : String(error),
      });
    } catch (updateError) {
      logger.error("エラー状態の記録に失敗しました:", updateError);
    }
  }
};
