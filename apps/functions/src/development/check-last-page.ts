#!/usr/bin/env tsx
/**
 * 最後に取得したページを確認
 *
 * 使用方法:
 * pnpm tsx src/development/check-last-page.ts
 */

import firestore from "../infrastructure/database/firestore";

async function checkLastPage() {
	try {
		console.log("=== Last Page Check ===\n");

		// メタデータを確認
		const metadataRef = firestore.collection("dlsiteMetadata").doc("fetch_metadata");
		const metadataDoc = await metadataRef.get();

		if (metadataDoc.exists) {
			const metadata = metadataDoc.data();
			console.log("1. メタデータ:");
			console.log(`  - 現在のページ: ${metadata?.currentPage}`);
			console.log(`  - 最終取得日時: ${metadata?.lastFetchedAt?.toDate()}`);
			console.log(`  - 進行中フラグ: ${metadata?.isInProgress}`);
			console.log(`  - 総作品数: ${metadata?.totalWorks}`);
			console.log(`  - 最後のエラー: ${metadata?.lastError || "なし"}\n`);
		}

		// 最も新しい作品を確認
		console.log("2. 最新作品の分布:");

		// 各ページごとの作品数を調べる
		const worksCollection = firestore.collection("dlsiteWorks");
		const allWorks = await worksCollection.orderBy("productId", "desc").get();

		// productIdから大まかなページを推定（RJ番号が新しいほど後のページ）
		const pageDistribution = new Map<number, number>();

		allWorks.forEach((doc) => {
			const work = doc.data();
			// RJ番号から推定ページを計算（大まかな推定）
			const rjNumber = Number.parseInt(work.productId.replace("RJ", ""));
			const estimatedPage = Math.floor((1015 - allWorks.size + pageDistribution.size) / 100) + 1;

			const count = pageDistribution.get(estimatedPage) || 0;
			pageDistribution.set(estimatedPage, count + 1);
		});

		console.log("  推定ページ分布:");
		Array.from(pageDistribution.entries())
			.sort((a, b) => a[0] - b[0])
			.forEach(([page, count]) => {
				console.log(`    ページ ${page}: ${count}件`);
			});

		// 最も古い作品と新しい作品を確認
		console.log("\n3. 作品ID範囲:");
		const oldestWork = await worksCollection.orderBy("productId", "asc").limit(1).get();

		const newestWork = await worksCollection.orderBy("productId", "desc").limit(1).get();

		if (!oldestWork.empty && !newestWork.empty) {
			console.log(`  - 最も古い作品: ${oldestWork.docs[0].data().productId}`);
			console.log(`  - 最も新しい作品: ${newestWork.docs[0].data().productId}`);
		}

		// 実際に7ページ目を取得してみる
		console.log("\n4. 7ページ目の取得テスト:");
		const testUrl =
			"https://www.dlsite.com/maniax/fsr/=/keyword_creater/%22%E6%B6%BC%E8%8A%B1%E3%81%BF%E3%81%AA%E3%81%9B%22/per_page/100/page/7";

		const response = await fetch(testUrl, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
				"Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
			},
		});

		if (response.ok) {
			const html = await response.text();
			const workPattern = /RJ\d{6,8}/g;
			const workIds = [...new Set([...html.matchAll(workPattern)].map((m) => m[0]))];
			console.log(`  - ステータス: ${response.status}`);
			console.log(`  - 作品数: ${workIds.length}件`);
			console.log(`  - 最初の5件: ${workIds.slice(0, 5).join(", ")}`);

			// これらの作品がFirestoreに存在するか確認
			const existingCount = await Promise.all(
				workIds.slice(0, 5).map(async (productId) => {
					const doc = await worksCollection.doc(productId).get();
					return doc.exists ? 1 : 0;
				}),
			);
			const existingSum = existingCount.reduce((a, b) => a + b, 0);
			console.log(`  - Firestoreに存在: ${existingSum}/5件`);
		} else {
			console.log(`  - エラー: ${response.status} ${response.statusText}`);
		}

		// 推奨アクション
		console.log("\n5. 分析結果:");
		if (metadata?.currentPage && metadata.currentPage <= 7) {
			console.log("  ⚠️  6ページまでしか取得されていない可能性があります");
			console.log("  推奨: 最終ページ判定ロジックの見直し");
		}
	} catch (error) {
		console.error("エラーが発生しました:", error);
	} finally {
		await firestore.terminate();
		process.exit(0);
	}
}

// 実行
checkLastPage();
