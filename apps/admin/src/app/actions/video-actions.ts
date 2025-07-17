"use server";

import { auth } from "@/lib/auth";
import { getFirestore } from "@/lib/firestore";

export interface UpdateVideoData {
	title?: string;
	description?: string;
	tags?: string[];
}

export interface ActionResult {
	success: boolean;
	message: string;
	error?: string;
}

export async function updateVideo(videoId: string, data: UpdateVideoData): Promise<ActionResult> {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return {
				success: false,
				message: "認証が必要です",
				error: "Unauthorized",
			};
		}

		const firestore = getFirestore();
		const videoRef = firestore.collection("youtubeVideos").doc(videoId);

		// 動画の存在確認
		const videoDoc = await videoRef.get();
		if (!videoDoc.exists) {
			return {
				success: false,
				message: "動画が見つかりません",
				error: "Video not found",
			};
		}

		// 更新可能なフィールドのみを抽出
		const updateData: Record<string, unknown> = {};
		if (data.title !== undefined) updateData.title = data.title;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.tags !== undefined) updateData.tags = data.tags;

		// 更新日時を追加
		updateData.updatedAt = new Date();

		await videoRef.update(updateData);

		return {
			success: true,
			message: "動画情報を更新しました",
		};
	} catch (error) {
		return {
			success: false,
			message: "動画情報の更新に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export async function deleteVideo(videoId: string): Promise<ActionResult> {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return {
				success: false,
				message: "認証が必要です",
				error: "Unauthorized",
			};
		}

		const firestore = getFirestore();

		// 動画の存在確認
		const videoRef = firestore.collection("youtubeVideos").doc(videoId);
		const videoDoc = await videoRef.get();
		if (!videoDoc.exists) {
			return {
				success: false,
				message: "動画が見つかりません",
				error: "Video not found",
			};
		}

		// 関連する音声ボタンが存在する場合は削除を拒否
		const buttonsQuery = await firestore
			.collection("audioButtons")
			.where("youtubeVideoId", "==", videoId)
			.limit(1)
			.get();

		if (!buttonsQuery.empty) {
			return {
				success: false,
				message: "関連する音声ボタンがあるため削除できません",
				error: "Related audio buttons exist",
			};
		}

		await videoRef.delete();

		return {
			success: true,
			message: "動画を削除しました",
		};
	} catch (error) {
		return {
			success: false,
			message: "動画の削除に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export async function refreshVideoData(): Promise<ActionResult> {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return {
				success: false,
				message: "認証が必要です",
				error: "Unauthorized",
			};
		}

		// Pub/Sub経由でCloud FunctionsのYouTube データ収集をトリガー
		const projectId = process.env.GCP_PROJECT_ID;
		if (!projectId) {
			return {
				success: false,
				message: "GCP Project IDが設定されていません",
				error: "GCP Project ID not configured",
			};
		}

		const { PubSub } = await import("@google-cloud/pubsub");
		const pubsub = new PubSub({ projectId });
		const topicName = "youtube-video-fetch-trigger";

		const message = {
			source: "admin-manual-trigger",
			timestamp: new Date().toISOString(),
			user: session.user.id,
		};

		const dataBuffer = Buffer.from(JSON.stringify(message));
		await pubsub.topic(topicName).publishMessage({ data: dataBuffer });

		return {
			success: true,
			message: "YouTube動画データの更新を開始しました",
		};
	} catch (error) {
		return {
			success: false,
			message: "動画データの更新に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export interface ThreeLayerTagStats {
	// プレイリストタグ統計
	playlistTags: {
		totalVideos: number;
		uniqueTags: number;
		topTags: Array<{ tag: string; count: number }>;
	};
	// ユーザータグ統計
	userTags: {
		totalVideos: number;
		uniqueTags: number;
		topTags: Array<{ tag: string; count: number }>;
	};
	// カテゴリ統計
	categories: {
		totalVideos: number;
		uniqueCategories: number;
		topCategories: Array<{ categoryId: string; categoryName: string; count: number }>;
	};
}

// YouTubeカテゴリIDマッピング
const CATEGORY_NAME_MAPPING: Record<string, string> = {
	"1": "映画・アニメ",
	"2": "自動車・乗り物",
	"10": "音楽",
	"15": "ペット・動物",
	"17": "スポーツ",
	"19": "旅行・イベント",
	"20": "ゲーム",
	"22": "一般・ブログ",
	"23": "コメディ",
	"24": "エンターテイメント",
	"25": "ニュース・政治",
	"26": "ハウツー・スタイル",
	"27": "教育",
	"28": "科学・技術",
	"43": "ビジネス",
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: 3層タグ統計は複数の集計処理が必要
export async function getThreeLayerTagStats(): Promise<ThreeLayerTagStats | null> {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return null;
		}

		const firestore = getFirestore();
		const videosSnap = await firestore.collection("videos").get();

		// データ集計用のマップ
		const playlistTagCounts = new Map<string, number>();
		const userTagCounts = new Map<string, number>();
		const categoryCounts = new Map<string, number>();

		let playlistTaggedVideos = 0;
		let userTaggedVideos = 0;
		let categorizedVideos = 0;

		// 全動画データを処理
		for (const doc of videosSnap.docs) {
			const data = doc.data();

			// プレイリストタグ統計
			const playlistTags = data.playlistTags as string[] | undefined;
			if (playlistTags && playlistTags.length > 0) {
				playlistTaggedVideos++;
				for (const tag of playlistTags) {
					playlistTagCounts.set(tag, (playlistTagCounts.get(tag) || 0) + 1);
				}
			}

			// ユーザータグ統計
			const userTags = data.userTags as string[] | undefined;
			if (userTags && userTags.length > 0) {
				userTaggedVideos++;
				for (const tag of userTags) {
					userTagCounts.set(tag, (userTagCounts.get(tag) || 0) + 1);
				}
			}

			// カテゴリ統計
			const categoryId = data.categoryId as string | undefined;
			if (categoryId) {
				categorizedVideos++;
				categoryCounts.set(categoryId, (categoryCounts.get(categoryId) || 0) + 1);
			}
		}

		// トップタグの作成（上位10件）
		const topPlaylistTags = Array.from(playlistTagCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([tag, count]) => ({ tag, count }));

		const topUserTags = Array.from(userTagCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([tag, count]) => ({ tag, count }));

		const topCategories = Array.from(categoryCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([categoryId, count]) => ({
				categoryId,
				categoryName: CATEGORY_NAME_MAPPING[categoryId] || `カテゴリ ${categoryId}`,
				count,
			}));

		return {
			playlistTags: {
				totalVideos: playlistTaggedVideos,
				uniqueTags: playlistTagCounts.size,
				topTags: topPlaylistTags,
			},
			userTags: {
				totalVideos: userTaggedVideos,
				uniqueTags: userTagCounts.size,
				topTags: topUserTags,
			},
			categories: {
				totalVideos: categorizedVideos,
				uniqueCategories: categoryCounts.size,
				topCategories: topCategories,
			},
		};
	} catch (_error) {
		return null;
	}
}

export interface PlaylistTagManagement {
	tag: string;
	videoCount: number;
	isVisible: boolean;
	description?: string;
}

// プレイリストタグ管理設定を取得
export async function getPlaylistTagManagement(): Promise<PlaylistTagManagement[] | null> {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return null;
		}

		const firestore = getFirestore();

		// 実際のプレイリストタグ統計を取得
		const videosSnap = await firestore.collection("videos").get();
		const playlistTagCounts = new Map<string, number>();

		for (const doc of videosSnap.docs) {
			const data = doc.data();
			const playlistTags = data.playlistTags as string[] | undefined;
			if (playlistTags && playlistTags.length > 0) {
				for (const tag of playlistTags) {
					playlistTagCounts.set(tag, (playlistTagCounts.get(tag) || 0) + 1);
				}
			}
		}

		// 管理設定を取得
		const managementDoc = await firestore.collection("admin").doc("playlistTagSettings").get();
		const managementData = managementDoc.exists ? managementDoc.data() : {};
		const tagSettings = managementData?.tags || {};

		// 結果の作成
		const results: PlaylistTagManagement[] = Array.from(playlistTagCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([tag, count]) => ({
				tag,
				videoCount: count,
				isVisible: tagSettings[tag]?.isVisible !== false, // デフォルトは表示
				description: tagSettings[tag]?.description || "",
			}));

		return results;
	} catch (_error) {
		return null;
	}
}

// プレイリストタグの表示設定を更新
export async function updatePlaylistTagVisibility(
	tag: string,
	isVisible: boolean,
	description?: string,
): Promise<ActionResult> {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return {
				success: false,
				message: "認証が必要です",
				error: "Unauthorized",
			};
		}

		const firestore = getFirestore();
		const settingsRef = firestore.collection("admin").doc("playlistTagSettings");

		// 現在の設定を取得
		const currentDoc = await settingsRef.get();
		const currentData = currentDoc.exists ? currentDoc.data() : {};
		const currentTags = currentData?.tags || {};

		// 設定を更新
		const updatedTags = {
			...currentTags,
			[tag]: {
				isVisible,
				description: description || "",
				updatedAt: new Date(),
				updatedBy: session.user.id,
			},
		};

		await settingsRef.set(
			{
				tags: updatedTags,
				lastUpdated: new Date(),
				lastUpdatedBy: session.user.id,
			},
			{ merge: true },
		);

		return {
			success: true,
			message: `プレイリストタグ「${tag}」の設定を更新しました`,
		};
	} catch (error) {
		return {
			success: false,
			message: "プレイリストタグ設定の更新に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

// 複数のプレイリストタグ設定を一括更新
export async function bulkUpdatePlaylistTagVisibility(
	updates: Array<{ tag: string; isVisible: boolean; description?: string }>,
): Promise<ActionResult> {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return {
				success: false,
				message: "認証が必要です",
				error: "Unauthorized",
			};
		}

		const firestore = getFirestore();
		const settingsRef = firestore.collection("admin").doc("playlistTagSettings");

		// 現在の設定を取得
		const currentDoc = await settingsRef.get();
		const currentData = currentDoc.exists ? currentDoc.data() : {};
		const currentTags = currentData?.tags || {};

		// バッチ更新用の設定を作成
		const updatedTags = { ...currentTags };
		for (const update of updates) {
			updatedTags[update.tag] = {
				isVisible: update.isVisible,
				description: update.description || "",
				updatedAt: new Date(),
				updatedBy: session.user.id,
			};
		}

		await settingsRef.set(
			{
				tags: updatedTags,
				lastUpdated: new Date(),
				lastUpdatedBy: session.user.id,
			},
			{ merge: true },
		);

		return {
			success: true,
			message: `${updates.length}件のプレイリストタグ設定を更新しました`,
		};
	} catch (error) {
		return {
			success: false,
			message: "プレイリストタグ設定の一括更新に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
