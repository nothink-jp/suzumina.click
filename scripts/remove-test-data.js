#!/usr/bin/env node

/**
 * 本番環境から誤って混入したテストデータを削除するスクリプト
 *
 * 削除対象:
 * - channelId が "test-channel" のデータ
 * - title が "Video video" で始まるデータ
 * - description が "Test video" のデータ
 */

const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// Firebase Admin SDKの初期化
// デフォルト認証を使用（gcloud auth application-default login）
initializeApp({
	credential: applicationDefault(),
	projectId: "suzumina-click",
});

const db = getFirestore();

async function removeTestData() {
	console.log("本番環境のテストデータ削除を開始します...");

	try {
		const videosRef = db.collection("videos");
		let deletedCount = 0;
		let processedCount = 0;

		// テストデータの条件
		// 1. channelId が "test-channel"
		console.log('channelId が "test-channel" のデータを検索中...');
		const testChannelQuery = await videosRef.where("channelId", "==", "test-channel").get();

		for (const doc of testChannelQuery.docs) {
			console.log(`削除対象: ${doc.id} - ${doc.data().title}`);
			await doc.ref.delete();
			deletedCount++;
		}

		// 2. title が "Video video" で始まる、または "Test video" のデータ
		// Firestoreでは前方一致検索ができないので、全件取得してフィルタリング
		console.log("\nすべての動画データをチェック中...");
		const allVideosSnapshot = await videosRef.get();

		const batch = db.batch();
		let batchCount = 0;

		for (const doc of allVideosSnapshot.docs) {
			processedCount++;
			const data = doc.data();

			// テストデータの条件をチェック
			const isTestData =
				(data.title && data.title.startsWith("Video video")) ||
				(data.description && data.description === "Test video") ||
				(data.channelTitle && data.channelTitle === "Test Channel");

			if (isTestData) {
				console.log(`削除対象: ${doc.id} - ${data.title}`);
				batch.delete(doc.ref);
				batchCount++;
				deletedCount++;

				// バッチサイズの制限（500件）に達したらコミット
				if (batchCount >= 500) {
					await batch.commit();
					console.log(`${batchCount}件のテストデータを削除しました`);
					batchCount = 0;
				}
			}

			// 進捗表示
			if (processedCount % 100 === 0) {
				console.log(`進捗: ${processedCount}件処理済み`);
			}
		}

		// 残りのバッチをコミット
		if (batchCount > 0) {
			await batch.commit();
			console.log(`${batchCount}件のテストデータを削除しました`);
		}

		console.log("\n=== 削除完了 ===");
		console.log(`処理件数: ${processedCount}件`);
		console.log(`削除件数: ${deletedCount}件`);
	} catch (error) {
		console.error("エラーが発生しました:", error);
		process.exit(1);
	}
}

// DRY RUNモード
async function dryRun() {
	console.log("=== DRY RUN MODE ===");
	console.log("実際の削除は行いません。削除対象のデータを表示します。\n");

	try {
		const videosRef = db.collection("videos");
		let targetCount = 0;

		// 1. channelId が "test-channel"
		console.log('channelId が "test-channel" のデータ:');
		const testChannelQuery = await videosRef.where("channelId", "==", "test-channel").get();

		for (const doc of testChannelQuery.docs) {
			const data = doc.data();
			console.log(`- ${doc.id}: ${data.title} (${data.publishedAt})`);
			targetCount++;
		}

		// 2. その他のテストデータ
		console.log("\nその他のテストデータ:");
		const allVideosSnapshot = await videosRef.get();

		for (const doc of allVideosSnapshot.docs) {
			const data = doc.data();

			const isTestData =
				(data.title && data.title.startsWith("Video video")) ||
				(data.description && data.description === "Test video") ||
				(data.channelTitle && data.channelTitle === "Test Channel");

			if (isTestData && data.channelId !== "test-channel") {
				console.log(`- ${doc.id}: ${data.title} (${data.publishedAt})`);
				targetCount++;
			}
		}

		console.log(`\n削除対象: 合計 ${targetCount}件`);
	} catch (error) {
		console.error("エラーが発生しました:", error);
		process.exit(1);
	}
}

// コマンドライン引数の処理
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run") || args.includes("-d");

if (isDryRun) {
	dryRun();
} else {
	console.log("本番環境のデータを削除します。");
	console.log("先に --dry-run で削除対象を確認することを推奨します。");
	console.log("続行しますか？ (yes/no)");

	process.stdin.resume();
	process.stdin.setEncoding("utf8");

	process.stdin.on("data", async (text) => {
		if (text.trim().toLowerCase() === "yes") {
			await removeTestData();
			process.exit(0);
		} else {
			console.log("キャンセルしました。");
			process.exit(0);
		}
	});
}
