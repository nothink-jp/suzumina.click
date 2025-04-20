import type { CloudEvent } from "@google-cloud/functions-framework";
import { Timestamp } from "firebase-admin/firestore";
// functions/src/youtube.ts
import * as logger from "firebase-functions/logger";
import { google } from "googleapis";
import type { youtube_v3 } from "googleapis";
import { SUZUKA_MINASE_CHANNEL_ID, type YouTubeVideoData } from "./common";
import { firestore, initializeFirebaseAdmin } from "./firebaseAdmin";

initializeFirebaseAdmin();

// YouTube API クォータ制限関連の定数
const MAX_VIDEOS_PER_BATCH = 50; // YouTube APIの最大結果数
const QUOTA_EXCEEDED_CODE = 403; // クォータ超過エラーコード
const MAX_RETRY_ATTEMPTS = 3; // リトライ回数
const RETRY_DELAY_MS = 5000; // リトライ間隔（ミリ秒）

// メタデータ保存用のドキュメントID
const METADATA_DOC_ID = "fetch_metadata";

// メタデータの型定義
interface FetchMetadata {
  lastFetchedAt: Timestamp;
  nextPageToken?: string;
  isInProgress: boolean;
  lastError?: string;
  lastSuccessfulCompleteFetch?: Timestamp;
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
 * YouTube API エラーの型定義
 */
interface YouTubeApiError {
  code?: number;
  message?: string;
}

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
    .collection("youtubeMetadata")
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
    .collection("youtubeMetadata")
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
 * Pub/SubメッセージのPubsubMessage型定義
 */
interface PubsubMessage {
  data?: string;
  attributes?: Record<string, string>;
}

/**
 * YouTubeから水瀬鈴花チャンネルの動画情報を取得し、Firestoreに保存する関数
 *
 * 1. Pub/Subからのトリガーを受け取る
 * 2. メタデータを確認し、前回の実行状態を復元
 * 3. YouTube Data APIを使用してチャンネルの動画リストを取得（ページングあり）
 * 4. 各動画の詳細情報を取得
 * 5. 取得した情報をFirestoreに保存
 * 6. 処理状態をメタデータに記録
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
    // CloudEventからPubSubメッセージを取得
    const message = event.data;

    if (!message) {
      logger.error("CloudEventデータが不足しています", { event });
      return;
    }

    // 属性情報の処理
    if (message.attributes) {
      logger.info("受信した属性情報:", message.attributes);
    }

    // Base64エンコードされたデータがあれば復号
    if (message.data) {
      try {
        const decodedData = Buffer.from(message.data, "base64").toString(
          "utf-8",
        );
        logger.info("デコードされたメッセージデータ:", decodedData);
      } catch (err) {
        logger.error("Base64メッセージデータのデコードに失敗しました:", err);
        // デコード失敗したら処理を中断する
        return;
      }
    } else {
      logger.info("Base64データはイベント内に見つかりませんでした");
    }

    // YouTube API キーの取得と検証
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      logger.error("環境変数に YOUTUBE_API_KEY が設定されていません");
      return;
    }

    // YouTubeクライアント初期化
    const youtube = google.youtube({
      version: "v3",
      auth: apiKey,
    });

    const videosCollection = firestore.collection("videos");
    const now = Timestamp.now();

    // 前回の実行状態を取得
    let metadata: FetchMetadata;
    try {
      metadata = await getOrCreateMetadata();

      // 既に実行中の場合はスキップ（二重実行防止）
      if (metadata.isInProgress) {
        logger.warn("前回の実行が完了していません。処理をスキップします。");
        return;
      }

      // 処理開始を記録
      await updateMetadata({ isInProgress: true });
    } catch (error) {
      logger.error("メタデータの取得に失敗しました:", error);
      return;
    }

    logger.info(`チャンネル ${SUZUKA_MINASE_CHANNEL_ID} の動画IDを取得中`);
    const allVideoIds: string[] = [];

    // 前回の続きから再開するか、新規に開始するか
    let nextPageToken: string | undefined = metadata.nextPageToken;
    const isInitialFetch = !nextPageToken;

    if (nextPageToken) {
      logger.info(`前回の続きから取得を再開します。トークン: ${nextPageToken}`);
    } else {
      logger.info("新規に全動画の取得を開始します");
    }

    // 最大3ページまでのみ取得（クォータ節約のため）
    let pageCount = 0;
    const MAX_PAGES_PER_EXECUTION = 3;

    // ページネーションを使用して動画IDを取得（制限付き）
    do {
      try {
        // YouTube API 呼び出し（リトライ機能付き）
        const searchResponse: youtube_v3.Schema$SearchListResponse =
          await retryApiCall(async () => {
            const response = await youtube.search.list({
              part: ["id"],
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

        logger.info(
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
          return;
        }
        // その他のエラー
        throw error;
      }
    } while (nextPageToken);

    // 全ページ取得完了（nextPageTokenがない）
    if (!nextPageToken && !isInitialFetch) {
      logger.info("全ての動画IDの取得が完了しました");
      // 完全な取得完了を記録
      await updateMetadata({
        nextPageToken: undefined,
        lastSuccessfulCompleteFetch: now,
      });
    }

    logger.info(`取得した動画ID合計: ${allVideoIds.length}件`);
    if (allVideoIds.length === 0) {
      logger.info("チャンネルに動画が見つかりませんでした");
      await updateMetadata({ isInProgress: false });
      return;
    }

    logger.info("動画の詳細情報を取得中...");
    const videoDetails: youtube_v3.Schema$Video[] = [];

    // YouTube API の制限（最大50件）に合わせてバッチ処理
    for (let i = 0; i < allVideoIds.length; i += MAX_VIDEOS_PER_BATCH) {
      try {
        const batchIds = allVideoIds.slice(i, i + MAX_VIDEOS_PER_BATCH);

        // YouTube API 呼び出し（リトライ機能付き）
        const videoResponse: youtube_v3.Schema$VideoListResponse =
          await retryApiCall(async () => {
            const response = await youtube.videos.list({
              part: ["snippet", "contentDetails", "statistics"],
              id: batchIds,
              maxResults: MAX_VIDEOS_PER_BATCH,
            });
            return response.data;
          });

        if (videoResponse.items) {
          videoDetails.push(...videoResponse.items);
        }
        logger.info(
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

    logger.info("動画データをFirestoreに書き込み中...");
    let batch = firestore.batch();
    let batchCounter = 0;
    const maxBatchSize = 500; // Firestoreのバッチ書き込み上限

    // 動画データをFirestoreにバッチ書き込み
    for (const video of videoDetails) {
      if (!video.id || !video.snippet) {
        logger.warn(
          "IDまたはスニペットが不足しているため動画をスキップします:",
          video,
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
          : Timestamp.now(),
        thumbnailUrl: video.snippet.thumbnails?.default?.url ?? "",
        channelId: video.snippet.channelId ?? "",
        channelTitle: video.snippet.channelTitle ?? "",
        lastFetchedAt: now,
      };

      const videoRef = videosCollection.doc(video.id);
      batch.set(videoRef, videoData, { merge: true });
      batchCounter++;

      // バッチサイズの上限に達したらコミット
      if (batchCounter >= maxBatchSize) {
        logger.info(
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
        logger.info(
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
          logger.info("Firestoreバッチコミットが成功しました");
        })
        .catch((err) => {
          logger.error(
            "最終Firestoreバッチコミット中にエラーが発生しました:",
            err,
          );
        });
    } else {
      logger.info("最終バッチに書き込む動画詳細がありませんでした");
    }

    // 処理完了を記録
    await updateMetadata({
      isInProgress: false,
      lastError: undefined,
    });
    logger.info("fetchYouTubeVideos 関数の処理を完了しました");
  } catch (error: unknown) {
    // YouTube API エラーや予期せぬエラーはこちらで捕捉
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
