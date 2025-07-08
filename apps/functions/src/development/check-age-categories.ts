/**
 * Firestoreから作品の年齢カテゴリ情報を確認するデバッグツール
 */

import { Firestore } from "@google-cloud/firestore";

const firestore = new Firestore({
	projectId: process.env.GOOGLE_CLOUD_PROJECT || "suzumina-click",
});

async function checkAgeCategories() {
	console.log("Checking age categories in dlsiteWorks collection...\n");

	try {
		// 最初の10件を取得
		const snapshot = await firestore.collection("dlsiteWorks").limit(10).get();

		const ageCategoryStats = new Map<string, number>();

		snapshot.forEach((doc) => {
			const data = doc.data();
			const ageRating = data.ageRating;

			console.log(`Work ID: ${doc.id}`);
			console.log(`Title: ${data.title}`);
			console.log(`Age Rating: ${ageRating}`);
			console.log("Data Sources:", data.dataSources ? Object.keys(data.dataSources) : "none");
			console.log("---");

			// 統計を集計
			const key = ageRating || "undefined";
			ageCategoryStats.set(key, (ageCategoryStats.get(key) || 0) + 1);
		});

		console.log("\nAge Category Statistics:");
		ageCategoryStats.forEach((count, ageRating) => {
			console.log(`${ageRating}: ${count} works`);
		});

		// 全体の統計も取得
		const allSnapshot = await firestore.collection("dlsiteWorks").get();
		const totalStats = new Map<string, number>();

		allSnapshot.forEach((doc) => {
			const data = doc.data();
			const ageRating = data.ageRating || "undefined";
			totalStats.set(ageRating, (totalStats.get(ageRating) || 0) + 1);
		});

		console.log("\nTotal Age Category Statistics (All Works):");
		totalStats.forEach((count, ageRating) => {
			console.log(`${ageRating}: ${count} works`);
		});
	} catch (error) {
		console.error("Error checking age categories:", error);
	}
}

// 実行
checkAgeCategories()
	.then(() => {
		console.log("\nCheck completed.");
		process.exit(0);
	})
	.catch((error) => {
		console.error("Script failed:", error);
		process.exit(1);
	});
