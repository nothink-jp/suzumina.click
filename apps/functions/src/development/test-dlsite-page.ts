#!/usr/bin/env tsx
/**
 * DLsiteページの直接テスト
 *
 * 使用方法:
 * pnpm tsx src/development/test-dlsite-page.ts
 */

async function testDLsitePage() {
	try {
		const searchUrl =
			"https://www.dlsite.com/maniax/fsr/=/keyword_creater/%22%E6%B6%BC%E8%8A%B1%E3%81%BF%E3%81%AA%E3%81%9B%22/per_page/100/page/1";

		console.log("=== DLsite Page Test ===\n");
		console.log(`URL: ${searchUrl}\n`);

		const response = await fetch(searchUrl, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
				"Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
			},
		});

		if (!response.ok) {
			console.error(`HTTP Error: ${response.status} ${response.statusText}`);
			return;
		}

		const html = await response.text();
		console.log(`HTML取得成功: ${html.length}文字\n`);

		// ページネーション情報を探す
		console.log("1. ページネーション情報を探索:");

		// パターン1: "1,015件中1～100件目"
		const pattern1 = /([0-9,]+)\s*件\s*中\s*(\d+)\s*～\s*(\d+)\s*件\s*目/g;
		const matches1 = [...html.matchAll(pattern1)];
		if (matches1.length > 0) {
			console.log("  パターン1で発見:");
			matches1.forEach((match) => {
				console.log(`    「${match[0]}」 → 総数: ${match[1]}件`);
			});
		}

		// パターン2: "1,015件の作品"
		const pattern2 = /([0-9,]+)\s*件\s*の\s*作品/g;
		const matches2 = [...html.matchAll(pattern2)];
		if (matches2.length > 0) {
			console.log("  パターン2で発見:");
			matches2.forEach((match) => {
				console.log(`    「${match[0]}」 → 総数: ${match[1]}件`);
			});
		}

		// パターン3: より広範囲な検索
		const pattern3 = /([0-9,]+)\s*件/g;
		const matches3 = [...html.matchAll(pattern3)];
		console.log("\n  すべての「○○件」パターン:");
		matches3.slice(0, 10).forEach((match) => {
			// 前後のコンテキストを取得
			const start = Math.max(0, match.index! - 20);
			const end = Math.min(html.length, match.index! + match[0].length + 20);
			const context = html.substring(start, end).replace(/\s+/g, " ");
			console.log(`    「${match[0]}」 in context: ...${context}...`);
		});

		// 作品数を確認
		console.log("\n2. 作品リストを確認:");
		const workPattern = /RJ\d{6,8}/g;
		const workIds = [...new Set([...html.matchAll(workPattern)].map((m) => m[0]))];
		console.log(`  このページの作品数: ${workIds.length}件`);
		console.log(`  最初の5件: ${workIds.slice(0, 5).join(", ")}`);

		// ページネーションリンクを確認
		console.log("\n3. ページネーションリンクを確認:");
		const pagePattern = /page\/(\d+)/g;
		const pageNumbers = [
			...new Set([...html.matchAll(pagePattern)].map((m) => Number.parseInt(m[1]))),
		];
		const maxPage = Math.max(...pageNumbers);
		console.log(`  見つかった最大ページ番号: ${maxPage}`);
		console.log(`  推定総作品数: 約${maxPage * 100}件`);

		// 現在のURLに含まれるフィルターを確認
		console.log("\n4. 現在のURLに含まれるフィルター:");
		console.log("  - keyword_creater: 涼花みなせ");
		console.log("  - その他のフィルター: なし（全作品取得）");
	} catch (error) {
		console.error("エラーが発生しました:", error);
	}
}

// 実行
testDLsitePage();
