/**
 * 音声ボタン関連のFirestore操作を提供するモジュール
 */

import type { Query } from "@google-cloud/firestore";
import {
	type FirestoreAudioButtonData,
	type FrontendAudioButtonData,
	FrontendAudioButtonSchema,
	formatRelativeTime,
} from "@suzumina.click/shared-types";
import { getFirestore } from "./firestore";

/**
 * Firestore音声ボタンデータをフロントエンド表示用に変換
 */
export function convertToFrontendAudioButton(
	data: FirestoreAudioButtonData,
): FrontendAudioButtonData {
	// Duration calculation helper
	const formatDuration = (startTime: number, endTime?: number) => {
		const duration = endTime ? endTime - startTime : 0;
		if (duration <= 0) return "再生";
		if (duration < 60) return `${duration}秒`;
		const minutes = Math.floor(duration / 60);
		const seconds = duration % 60;
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	const frontendData: FrontendAudioButtonData = {
		id: data.id,
		title: data.title,
		category: data.category,
		sourceVideoId: data.sourceVideoId,
		sourceVideoTitle: data.sourceVideoTitle,
		sourceVideoThumbnailUrl: `https://img.youtube.com/vi/${data.sourceVideoId}/maxresdefault.jpg`,
		startTime: data.startTime,
		endTime: data.endTime,
		uploadedBy: data.uploadedBy,
		uploadedByName: data.uploadedByName,
		isPublic: data.isPublic,
		playCount: data.playCount,
		likeCount: data.likeCount,
		createdAt: data.createdAt,
		updatedAt: data.updatedAt,

		// 表示用の追加情報
		durationText: formatDuration(data.startTime, data.endTime),
		relativeTimeText: formatRelativeTime(data.createdAt),
	};

	try {
		return FrontendAudioButtonSchema.parse(frontendData);
	} catch (_error) {
		throw new Error("音声ボタンデータの形式が無効です");
	}
}

/**
 * 特定ユーザーが作成した音声ボタンを取得
 */
export async function getAudioButtonsByUser(
	discordId: string,
	options: {
		limit?: number;
		onlyPublic?: boolean;
		orderBy?: "newest" | "oldest" | "mostPlayed";
	} = {},
): Promise<FrontendAudioButtonData[]> {
	try {
		const firestore = getFirestore();
		const { limit = 20, onlyPublic = true, orderBy = "newest" } = options;

		let query: Query = firestore.collection("audioButtons").where("uploadedBy", "==", discordId);

		// 公開のみのフィルター
		if (onlyPublic) {
			query = query.where("isPublic", "==", true);
		}

		// ソート設定（Firestoreインデックスが必要）
		switch (orderBy) {
			case "newest":
				query = query.orderBy("createdAt", "desc");
				break;
			case "oldest":
				query = query.orderBy("createdAt", "asc");
				break;
			case "mostPlayed":
				query = query.orderBy("playCount", "desc");
				break;
		}

		query = query.limit(limit);

		const snapshot = await query.get();
		const audioButtons = snapshot.docs.map((doc) => {
			const data = doc.data() as FirestoreAudioButtonData;
			return convertToFrontendAudioButton({ ...data, id: doc.id });
		});

		return audioButtons;
	} catch (error) {
		// 開発環境でのみエラーログを出力
		if (process.env.NODE_ENV === "development") {
			// biome-ignore lint/suspicious/noConsole: Development debugging only
			console.error("getAudioButtonsByUser error:", { discordId, error });
		}
		throw new Error("音声ボタン一覧の取得に失敗しました");
	}
}

/**
 * 音声ボタンの再生回数を増加
 */
export async function incrementPlayCount(audioButtonId: string): Promise<void> {
	try {
		const firestore = getFirestore();
		const docRef = firestore.collection("audioButtons").doc(audioButtonId);

		await docRef.update({
			// biome-ignore lint/suspicious/noExplicitAny: Firestore FieldValue typing limitation
			playCount: (firestore as any).FieldValue.increment(1),
			updatedAt: new Date().toISOString(),
		});
	} catch (_error) {
		// 再生回数更新の失敗は致命的ではないため、エラーを投げない
	}
}

/**
 * ユーザーの音声ボタン統計を取得
 */
export async function getUserAudioButtonStats(discordId: string): Promise<{
	totalButtons: number;
	totalPlays: number;
	averagePlays: number;
	publicButtons: number;
}> {
	try {
		const firestore = getFirestore();

		// ユーザーの全音声ボタンを取得
		const allButtonsQuery = firestore
			.collection("audioButtons")
			.where("uploadedBy", "==", discordId);

		const publicButtonsQuery = firestore
			.collection("audioButtons")
			.where("uploadedBy", "==", discordId)
			.where("isPublic", "==", true);

		const [allButtonsSnapshot, publicButtonsSnapshot] = await Promise.all([
			allButtonsQuery.get(),
			publicButtonsQuery.get(),
		]);

		const totalButtons = allButtonsSnapshot.size;
		const publicButtons = publicButtonsSnapshot.size;

		// 再生回数の合計を計算
		let totalPlays = 0;
		allButtonsSnapshot.docs.forEach((doc) => {
			const data = doc.data() as FirestoreAudioButtonData;
			totalPlays += data.playCount || 0;
		});

		const averagePlays = totalButtons > 0 ? Math.round(totalPlays / totalButtons) : 0;

		return {
			totalButtons,
			totalPlays,
			averagePlays,
			publicButtons,
		};
	} catch (_error) {
		return {
			totalButtons: 0,
			totalPlays: 0,
			averagePlays: 0,
			publicButtons: 0,
		};
	}
}
