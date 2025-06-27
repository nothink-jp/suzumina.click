/**
 * お気に入り関連のFirestore操作を提供するモジュール
 */

import type { Query } from "@google-cloud/firestore";
import type {
	AddFavoriteInput,
	FavoriteListResult,
	FavoriteQuery,
	FavoriteStatus,
	FirestoreFavoriteData,
	RemoveFavoriteInput,
} from "@suzumina.click/shared-types";
import { getFirestore } from "./firestore";

/**
 * 音声ボタンをお気に入りに追加
 */
export async function addFavorite(
	userId: string,
	input: AddFavoriteInput,
): Promise<{ success: boolean; favoriteId?: string }> {
	try {
		const firestore = getFirestore();

		// 既にお気に入りに追加されているかチェック
		const existingFavorite = await firestore
			.collection("users")
			.doc(userId)
			.collection("favorites")
			.where("audioButtonId", "==", input.audioButtonId)
			.limit(1)
			.get();

		if (!existingFavorite.empty) {
			return { success: false };
		}

		// お気に入りに追加
		const favoriteData: FirestoreFavoriteData = {
			audioButtonId: input.audioButtonId,
			addedAt: new Date().toISOString(),
		};

		const docRef = await firestore
			.collection("users")
			.doc(userId)
			.collection("favorites")
			.add(favoriteData);

		// 音声ボタンのお気に入り数を増加
		await firestore
			.collection("audioButtons")
			.doc(input.audioButtonId)
			.update({
				// biome-ignore lint/suspicious/noExplicitAny: Firestore FieldValue typing limitation
				favoriteCount: (firestore as any).FieldValue.increment(1),
				updatedAt: new Date().toISOString(),
			});

		return { success: true, favoriteId: docRef.id };
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			// biome-ignore lint/suspicious/noConsole: Development debugging only
			console.error("addFavorite error:", { userId, input, error });
		}
		throw new Error("お気に入りの追加に失敗しました");
	}
}

/**
 * 音声ボタンをお気に入りから削除
 */
export async function removeFavorite(
	userId: string,
	input: RemoveFavoriteInput,
): Promise<{ success: boolean }> {
	try {
		const firestore = getFirestore();

		// お気に入りを検索
		const favoriteQuery = await firestore
			.collection("users")
			.doc(userId)
			.collection("favorites")
			.where("audioButtonId", "==", input.audioButtonId)
			.limit(1)
			.get();

		if (favoriteQuery.empty) {
			return { success: false };
		}

		// お気に入りを削除
		const favoriteDoc = favoriteQuery.docs[0];
		if (!favoriteDoc) {
			return { success: false };
		}
		await favoriteDoc.ref.delete();

		// 音声ボタンのお気に入り数を減少
		await firestore
			.collection("audioButtons")
			.doc(input.audioButtonId)
			.update({
				// biome-ignore lint/suspicious/noExplicitAny: Firestore FieldValue typing limitation
				favoriteCount: (firestore as any).FieldValue.increment(-1),
				updatedAt: new Date().toISOString(),
			});

		return { success: true };
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			// biome-ignore lint/suspicious/noConsole: Development debugging only
			console.error("removeFavorite error:", { userId, input, error });
		}
		throw new Error("お気に入りの削除に失敗しました");
	}
}

/**
 * お気に入り状態を切り替え
 */
export async function toggleFavorite(
	userId: string,
	audioButtonId: string,
): Promise<{ isFavorited: boolean }> {
	try {
		const status = await getFavoriteStatus(userId, audioButtonId);

		if (status.isFavorited) {
			await removeFavorite(userId, { audioButtonId });
			return { isFavorited: false };
		}
		await addFavorite(userId, { audioButtonId });
		return { isFavorited: true };
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			// biome-ignore lint/suspicious/noConsole: Development debugging only
			console.error("toggleFavorite error:", { userId, audioButtonId, error });
		}
		throw new Error("お気に入りの切り替えに失敗しました");
	}
}

/**
 * 音声ボタンのお気に入り状態を確認
 */
export async function getFavoriteStatus(
	userId: string,
	audioButtonId: string,
): Promise<FavoriteStatus> {
	try {
		const firestore = getFirestore();

		const favoriteQuery = await firestore
			.collection("users")
			.doc(userId)
			.collection("favorites")
			.where("audioButtonId", "==", audioButtonId)
			.limit(1)
			.get();

		if (favoriteQuery.empty) {
			return { isFavorited: false };
		}

		const favoriteDoc = favoriteQuery.docs[0];
		return {
			isFavorited: true,
			favoriteId: favoriteDoc?.id,
		};
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			// biome-ignore lint/suspicious/noConsole: Development debugging only
			console.error("getFavoriteStatus error:", { userId, audioButtonId, error });
		}
		return { isFavorited: false };
	}
}

/**
 * 複数の音声ボタンのお気に入り状態を一括確認
 */
export async function getFavoritesStatus(
	userId: string,
	audioButtonIds: string[],
): Promise<Map<string, boolean>> {
	try {
		const firestore = getFirestore();
		const statusMap = new Map<string, boolean>();

		// 初期化
		audioButtonIds.forEach((id) => statusMap.set(id, false));

		if (audioButtonIds.length === 0) {
			return statusMap;
		}

		// Firestoreのin演算子は最大10個まで
		const chunks = [];
		for (let i = 0; i < audioButtonIds.length; i += 10) {
			chunks.push(audioButtonIds.slice(i, i + 10));
		}

		// 各チャンクでクエリを実行
		await Promise.all(
			chunks.map(async (chunk) => {
				const favoritesQuery = await firestore
					.collection("users")
					.doc(userId)
					.collection("favorites")
					.where("audioButtonId", "in", chunk)
					.get();

				favoritesQuery.docs.forEach((doc) => {
					const data = doc.data() as FirestoreFavoriteData;
					statusMap.set(data.audioButtonId, true);
				});
			}),
		);

		return statusMap;
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			// biome-ignore lint/suspicious/noConsole: Development debugging only
			console.error("getFavoritesStatus error:", { userId, audioButtonIds, error });
		}
		// エラー時は全てfalseを返す
		const statusMap = new Map<string, boolean>();
		audioButtonIds.forEach((id) => statusMap.set(id, false));
		return statusMap;
	}
}

/**
 * ユーザーのお気に入り一覧を取得
 */
export async function getUserFavorites(
	userId: string,
	query: FavoriteQuery,
): Promise<FavoriteListResult> {
	try {
		const firestore = getFirestore();
		let firestoreQuery: Query = firestore.collection("users").doc(userId).collection("favorites");

		// ソート設定
		switch (query.orderBy) {
			case "newest":
				firestoreQuery = firestoreQuery.orderBy("addedAt", "desc");
				break;
			case "oldest":
				firestoreQuery = firestoreQuery.orderBy("addedAt", "asc");
				break;
			default:
				firestoreQuery = firestoreQuery.orderBy("addedAt", "desc");
		}

		// ページネーション
		if (query.startAfter) {
			const startAfterDoc = await firestore
				.collection("users")
				.doc(userId)
				.collection("favorites")
				.doc(query.startAfter)
				.get();
			if (startAfterDoc.exists) {
				firestoreQuery = firestoreQuery.startAfter(startAfterDoc);
			}
		}

		firestoreQuery = firestoreQuery.limit(query.limit + 1); // +1 for hasMore check

		const snapshot = await firestoreQuery.get();
		const docs = snapshot.docs;

		const hasMore = docs.length > query.limit;
		const favorites = docs.slice(0, query.limit).map((doc) => {
			const data = doc.data() as FirestoreFavoriteData;
			return data;
		});

		return {
			favorites,
			hasMore,
			lastFavorite: favorites.length > 0 ? favorites[favorites.length - 1] : undefined,
		};
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			// biome-ignore lint/suspicious/noConsole: Development debugging only
			console.error("getUserFavorites error:", { userId, query, error });
		}
		throw new Error("お気に入り一覧の取得に失敗しました");
	}
}

/**
 * ユーザーのお気に入り数を取得
 */
export async function getUserFavoritesCount(userId: string): Promise<number> {
	try {
		const firestore = getFirestore();

		const favoritesQuery = await firestore
			.collection("users")
			.doc(userId)
			.collection("favorites")
			.count()
			.get();

		return favoritesQuery.data().count;
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			// biome-ignore lint/suspicious/noConsole: Development debugging only
			console.error("getUserFavoritesCount error:", { userId, error });
		}
		return 0;
	}
}

/**
 * お気に入りボタンIDから音声ボタン情報を一括取得するヘルパー関数
 */
export async function getAudioButtonsFromFavorites(
	favoriteData: FirestoreFavoriteData[],
): Promise<Map<string, any>> {
	try {
		const firestore = getFirestore();
		const audioButtonsMap = new Map<string, any>();

		if (favoriteData.length === 0) {
			return audioButtonsMap;
		}

		// 音声ボタンIDを抽出
		const audioButtonIds = favoriteData.map((fav) => fav.audioButtonId);

		// Firestoreのin演算子は最大10個まで
		const chunks = [];
		for (let i = 0; i < audioButtonIds.length; i += 10) {
			chunks.push(audioButtonIds.slice(i, i + 10));
		}

		// 各チャンクでクエリを実行
		await Promise.all(
			chunks.map(async (chunk) => {
				const audioButtonsQuery = await firestore
					.collection("audioButtons")
					.where("__name__", "in", chunk)
					.get();

				audioButtonsQuery.docs.forEach((doc) => {
					audioButtonsMap.set(doc.id, { ...doc.data(), id: doc.id });
				});
			}),
		);

		return audioButtonsMap;
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			// biome-ignore lint/suspicious/noConsole: Development debugging only
			console.error("getAudioButtonsFromFavorites error:", { favoriteData, error });
		}
		return new Map();
	}
}
