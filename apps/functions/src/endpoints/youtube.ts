import type { CloudEvent } from "@google-cloud/functions-framework";
import type { youtube_v3 } from "googleapis";
import firestore, { Timestamp } from "../infrastructure/database/firestore";
import {
	extractVideoIds,
	fetchChannelPlaylists,
	fetchPlaylistItems,
	fetchVideoDetails,
	initializeYouTubeClient,
	searchVideos,
} from "../services/youtube/youtube-api";
import { saveVideosToFirestore } from "../services/youtube/youtube-firestore";
import { SUZUKA_MINASE_CHANNEL_ID } from "../shared/common";
import * as logger from "../shared/logger";

// メタデータ保存用のドキュメントID
const METADATA_DOC_ID = "fetch_metadata";

// Firestore関連の定数
const METADATA_COLLECTION = "youtubeMetadata";

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
 * Pub/SubメッセージのPubsubMessage型定義
 */
interface PubsubMessage {
	data?: string;
	attributes?: Record<string, string>;
}

/**
 * メタデータの取得または初期化
 *
 * @returns Promise<FetchMetadata> - 取得または初期化されたメタデータ
 */
async function getOrCreateMetadata(): Promise<FetchMetadata> {
	const metadataRef = firestore.collection(METADATA_COLLECTION).doc(METADATA_DOC_ID);
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
	const metadataRef = firestore.collection(METADATA_COLLECTION).doc(METADATA_DOC_ID);

	// undefined値を持つプロパティをnullに変換する（テストに合わせるため）
	const sanitizedUpdates: Record<string, Timestamp | boolean | string | null> = {
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

// 注：initializeYouTubeClientはutils/youtube-apiから利用

/**
 * 処理開始前のメタデータチェックと初期化
 *
 * @returns Promise<[FetchMetadata | undefined, FetchResult | undefined]> - メタデータと結果オブジェクトのタプル
 */
async function prepareExecution(): Promise<[FetchMetadata | undefined, FetchResult | undefined]> {
	// 前回の実行状態を取得
	let metadata: FetchMetadata;
	try {
		metadata = await getOrCreateMetadata();

		// 既に実行中の場合はスキップ（二重実行防止）
		if (metadata.isInProgress) {
			logger.warn("前回の実行が完了していません。処理をスキップします。");
			return [undefined, { videoCount: 0, error: "前回の処理が完了していません" }];
		}

		// 処理開始を記録
		await updateMetadata({ isInProgress: true });
		return [metadata, undefined];
	} catch (error) {
		logger.error("メタデータの取得に失敗しました:", error);
		return [undefined, { videoCount: 0, error: "メタデータの取得に失敗しました" }];
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
			// youtube-api の検索機能を使用
			const searchResult = await searchVideos(youtube, nextPageToken);
			const videoIds = extractVideoIds(searchResult.items);

			allVideoIds.push(...videoIds);
			nextPageToken = searchResult.nextPageToken;

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
			// YouTube APIエラー時の処理
			if (error instanceof Error && error.message.includes("YouTube APIクォータを超過")) {
				// クォータ超過の場合
				logger.error("YouTube API クォータを超過しました。処理を中断します:", error);
				await updateMetadata({
					isInProgress: false,
					lastError: "YouTube API quota exceeded",
				});
				throw error; // 元のエラーをそのまま再スロー
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
 * プレイリスト情報を取得し、動画IDとプレイリストのマッピングを作成
 *
 * @param youtube - YouTube APIクライアント
 * @param channelId - チャンネルID
 * @returns Promise<Map<string, string[]>> - 動画ID → プレイリストタイトル配列のマップ
 */
async function fetchPlaylistMappings(
	youtube: youtube_v3.Youtube,
	channelId: string,
): Promise<Map<string, string[]>> {
	try {
		logger.info("プレイリストマッピング作成開始");

		// 1. チャンネルのプレイリスト一覧を取得
		const playlists = await fetchChannelPlaylists(youtube, channelId);
		logger.info(`プレイリスト取得完了: ${playlists.length}件`);

		// 2. 各プレイリストの動画一覧を取得
		const videoToPlaylistsMap = new Map<string, string[]>();

		for (const playlist of playlists) {
			try {
				logger.debug(`プレイリスト "${playlist.title}" の動画取得中`);
				const videoIds = await fetchPlaylistItems(youtube, playlist.id);

				// 各動画IDにプレイリストタイトルを追加
				for (const videoId of videoIds) {
					const existing = videoToPlaylistsMap.get(videoId) || [];
					existing.push(playlist.title);
					videoToPlaylistsMap.set(videoId, existing);
				}

				logger.debug(`プレイリスト "${playlist.title}": ${videoIds.length}件の動画を処理`);
			} catch (error: unknown) {
				logger.warn(`プレイリスト "${playlist.title}" の処理中にエラーが発生しました`, {
					playlistId: playlist.id,
					playlistTitle: playlist.title,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		logger.info(`プレイリストマッピング作成完了: ${videoToPlaylistsMap.size}件の動画に対応`);
		return videoToPlaylistsMap;
	} catch (error: unknown) {
		logger.error("プレイリストマッピング作成中にエラー:", error);
		// エラーが発生した場合は空のマップを返す（処理を継続）
		return new Map<string, string[]>();
	}
}

// 注：動画詳細取得機能はutils/youtube-apiから利用
// 注：動画データ保存機能はutils/youtube-firestoreから利用

/**
 * YouTube動画情報取得の共通処理
 *
 * @returns Promise<FetchResult> - 処理結果
 */
async function fetchYouTubeVideosLogic(): Promise<FetchResult> {
	try {
		// 1. YouTube APIクライアントの初期化
		const [youtube, initError] = initializeYouTubeClient();
		if (initError) {
			return initError;
		}
		if (!youtube) {
			return {
				videoCount: 0,
				error: "YouTubeクライアントの初期化に失敗しました",
			};
		}

		// 2. 実行前準備（メタデータ確認）
		const [metadata, prepError] = await prepareExecution();
		if (prepError) {
			return prepError;
		}
		if (!metadata) {
			return { videoCount: 0, error: "メタデータの準備に失敗しました" };
		}

		// 3. 動画IDの取得
		logger.info(`チャンネル ${SUZUKA_MINASE_CHANNEL_ID} の動画情報取得を開始します`);
		const { videoIds, nextPageToken, isComplete } = await fetchVideoIds(youtube, metadata);

		logger.info(`取得した動画ID合計: ${videoIds.length}件`);
		if (videoIds.length === 0) {
			logger.info("チャンネルに動画が見つかりませんでした");
			await updateMetadata({ isInProgress: false });
			return { videoCount: 0 };
		}

		// 4. プレイリストマッピングの取得（新機能）
		logger.info("プレイリスト情報の取得を開始します");
		const playlistMappings = await fetchPlaylistMappings(youtube, SUZUKA_MINASE_CHANNEL_ID);

		// 5. 動画の詳細情報取得
		const videoDetails = await fetchVideoDetails(youtube, videoIds);

		// 6. Firestoreにデータ保存（プレイリストマッピング付き）
		const savedCount = await saveVideosToFirestore(videoDetails, playlistMappings);

		// 7. メタデータを更新
		if (isComplete) {
			await updateMetadata({
				nextPageToken: undefined,
				lastSuccessfulCompleteFetch: Timestamp.now(),
			});
		} else if (nextPageToken) {
			// 明示的にnextPageTokenを使用（既にfetchVideoIds内で保存されているが、変数使用のため記述）
			logger.debug(`次回の実行のためにページトークンを保存: ${nextPageToken}`);
		}

		// 8. 処理完了を記録
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
			error: error instanceof Error ? error.message : "不明なエラーが発生しました",
		};
	}
}

/**
 * YouTubeから涼花みなせチャンネルの動画情報を取得し、Firestoreに保存する関数（Pub/Sub向け）
 *
 * @param event - Pub/SubトリガーからのCloudEvent
 * @returns Promise<void> - 非同期処理の完了を表すPromise
 */
export const fetchYouTubeVideos = async (event: CloudEvent<PubsubMessage>): Promise<void> => {
	logger.info("fetchYouTubeVideos 関数を開始しました (GCFv2 CloudEvent Handler)");

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
				const decodedData = Buffer.from(message.data, "base64").toString("utf-8");
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
