#!/usr/bin/env tsx

/**
 * AudioButton完全移行スクリプト
 *
 * すべてのフィールド名を統一された形式に変換
 * - title → buttonText
 * - sourceVideoId → videoId
 * - sourceVideoTitle → videoTitle
 * - createdBy → creatorId
 * - createdByName → creatorName
 * - 統計情報をstatsオブジェクトにグループ化
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { getFirestore } from "../src/lib/firestore";

interface OldFormat {
	// 様々なパターンが混在
	title?: string;
	buttonText?: string;
	text?: string;
	sourceVideoId?: string;
	videoId?: string;
	sourceVideoTitle?: string;
	videoTitle?: string;
	sourceVideoThumbnailUrl?: string;
	videoThumbnailUrl?: string;
	description?: string;
	startTime?: number;
	endTime?: number;
	tags?: string[];
	createdBy?: string;
	creatorId?: string;
	createdByName?: string;
	creatorName?: string;
	isPublic?: boolean;
	playCount?: number;
	likeCount?: number;
	dislikeCount?: number;
	favoriteCount?: number;
	createdAt?: any;
	updatedAt?: any;
	[key: string]: any;
}

interface NewFormat {
	id: string;
	buttonText: string;
	videoId: string;
	videoTitle: string;
	videoThumbnailUrl?: string;
	startTime: number;
	endTime: number;
	duration: number;
	tags: string[];
	creatorId: string;
	creatorName: string;
	isPublic: boolean;
	stats: {
		playCount: number;
		likeCount: number;
		dislikeCount: number;
		favoriteCount: number;
		engagementRate: number;
	};
	createdAt: string;
	updatedAt: string;
}

/**
 * タイムスタンプをISO文字列に変換
 */
function toISOString(timestamp: any): string {
	if (typeof timestamp === "string") return timestamp;
	if (timestamp?.toDate) return timestamp.toDate().toISOString();
	if (timestamp?._seconds) {
		return new Date(timestamp._seconds * 1000).toISOString();
	}
	return new Date().toISOString();
}

/**
 * エンゲージメント率を計算
 */
function calculateEngagementRate(
	playCount: number,
	likeCount: number,
	dislikeCount: number,
): number {
	if (playCount === 0) return 0;
	return (likeCount + dislikeCount) / playCount;
}

/**
 * 旧形式から新形式に変換
 */
function transformToNewFormat(doc: any, data: OldFormat): NewFormat {
	// フィールドの優先順位で取得
	const buttonText = data.title || data.buttonText || data.text || "無題";
	const videoId = data.sourceVideoId || data.videoId || "";
	const videoTitle = data.sourceVideoTitle || data.videoTitle || "";
	const startTime = data.startTime || 0;
	const endTime = data.endTime || startTime;
	const playCount = data.playCount || 0;
	const likeCount = data.likeCount || 0;
	const dislikeCount = data.dislikeCount || 0;

	return {
		id: doc.id,
		buttonText,
		videoId,
		videoTitle,
		videoThumbnailUrl: data.sourceVideoThumbnailUrl || data.videoThumbnailUrl,
		startTime,
		endTime,
		duration: endTime - startTime,
		tags: data.tags || [],
		creatorId: data.createdBy || data.creatorId || "unknown",
		creatorName: data.createdByName || data.creatorName || "Unknown",
		isPublic: data.isPublic ?? true,
		stats: {
			playCount,
			likeCount,
			dislikeCount,
			favoriteCount: data.favoriteCount || 0,
			engagementRate: calculateEngagementRate(playCount, likeCount, dislikeCount),
		},
		createdAt: toISOString(data.createdAt),
		updatedAt: toISOString(data.updatedAt || data.createdAt),
	};
}

/**
 * Step 1: バックアップを作成
 */
async function createBackup(): Promise<string> {
	const firestore = getFirestore();
	const snapshot = await firestore.collection("audioButtons").get();

	const backup = {
		timestamp: new Date().toISOString(),
		count: snapshot.size,
		documents: snapshot.docs.map((doc) => ({
			id: doc.id,
			data: doc.data(),
		})),
	};

	const backupDir = path.join(process.cwd(), "backups");
	await fs.mkdir(backupDir, { recursive: true });

	const backupFile = path.join(backupDir, `audiobuttons-${Date.now()}.json`);
	await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));

	return backupFile;
}

/**
 * Step 2: すべてのデータを新形式に変換
 */
async function transformAllData(): Promise<NewFormat[]> {
	const firestore = getFirestore();
	const snapshot = await firestore.collection("audioButtons").get();

	const transformed: NewFormat[] = [];
	const errors: string[] = [];

	for (const doc of snapshot.docs) {
		try {
			const oldData = doc.data() as OldFormat;
			const newData = transformToNewFormat(doc, oldData);
			transformed.push(newData);
		} catch (error) {
			errors.push(`Failed to transform ${doc.id}: ${error}`);
		}
	}
	if (errors.length > 0) {
		errors.forEach((_e) => {});
	}

	return transformed;
}

/**
 * Step 3: Firestoreを完全に再作成
 */
async function recreateCollection(data: NewFormat[]): Promise<void> {
	const firestore = getFirestore();
	const collection = firestore.collection("audioButtons");

	// 既存データを削除（バッチ処理）
	const deleteSnapshot = await collection.get();
	let batch = firestore.batch();
	let deleteCount = 0;

	for (const doc of deleteSnapshot.docs) {
		batch.delete(doc.ref);
		deleteCount++;

		if (deleteCount % 500 === 0) {
			await batch.commit();
			batch = firestore.batch();
		}
	}

	if (deleteCount % 500 !== 0) {
		await batch.commit();
	}

	batch = firestore.batch();
	let createCount = 0;

	for (const item of data) {
		const docRef = collection.doc(item.id);
		const { id, ...docData } = item;
		batch.set(docRef, docData);
		createCount++;

		if (createCount % 500 === 0) {
			await batch.commit();
			batch = firestore.batch();
		}
	}

	if (createCount % 500 !== 0) {
		await batch.commit();
	}
}

/**
 * Step 4: 検証
 */
async function validate(): Promise<boolean> {
	const firestore = getFirestore();
	const snapshot = await firestore.collection("audioButtons").get();

	let valid = true;
	const issues: string[] = [];

	for (const doc of snapshot.docs) {
		const data = doc.data();

		// 新形式の必須フィールドチェック
		if (!data.buttonText || !data.videoId || !data.videoTitle) {
			issues.push(`${doc.id}: 必須フィールド不足`);
			valid = false;
		}

		// 旧フィールドが残っていないかチェック
		if (
			data.title ||
			data.sourceVideoId ||
			data.sourceVideoTitle ||
			data.createdBy ||
			data.createdByName
		) {
			issues.push(`${doc.id}: 旧フィールドが残存`);
			valid = false;
		}

		// stats構造チェック
		if (!data.stats || typeof data.stats !== "object") {
			issues.push(`${doc.id}: stats構造が不正`);
			valid = false;
		}
	}

	if (valid) {
	} else {
		issues.forEach((_issue) => {});
	}

	return valid;
}

/**
 * メイン処理
 */
async function main() {
	const args = process.argv.slice(2);
	const skipBackup = args.includes("--skip-backup");
	const dryRun = args.includes("--dry-run");

	try {
		// Step 1: バックアップ
		if (!skipBackup) {
			await createBackup();
		}

		// Step 2: 変換
		const transformedData = await transformAllData();

		if (dryRun) {
			transformedData.slice(0, 3).forEach((_item) => {});
			return;
		}

		const readline = require("node:readline").createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		await new Promise<void>((resolve) => {
			readline.question("", async (answer: string) => {
				if (answer.toLowerCase() === "yes") {
					// Step 3 & 4: 再作成
					await recreateCollection(transformedData);

					// Step 5: 検証
					const isValid = await validate();

					if (isValid) {
					} else {
					}
				} else {
				}
				readline.close();
				resolve();
			});
		});
	} catch (_error) {
		process.exit(1);
	}
}

// 実行
main();
