#!/usr/bin/env tsx
/**
 * DLsiteページの詳細調査
 *
 * 使用方法:
 * pnpm tsx src/development/test-dlsite-detailed.ts
 */

import * as fs from "fs";

async function testDLsiteDetailed() {
	try {
		const searchUrl =
			"https://www.dlsite.com/maniax/fsr/=/keyword_creater/%22%E6%B6%BC%E8%8A%B1%E3%81%BF%E3%81%AA%E3%81%9B%22/per_page/100/page/1";

		console.log("=== DLsite Detailed Analysis ===\n");

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

		// HTMLをファイルに保存（デバッグ用）
		fs.writeFileSync("dlsite-page-debug.html", html);
		console.log("HTMLをdlsite-page-debug.htmlに保存しました\n");

		// 正規表現パターンで検索
		console.log("1. Vue.jsのデータ属性を探索:");

		// data-v属性を探す（Vue.jsのコンポーネント）
		const vuePattern = /data-v-[a-f0-9]+/g;
		const vueMatches = [...new Set([...html.matchAll(vuePattern)].map((m) => m[0]))];
		console.log(`  Vue.js属性の種類: ${vueMatches.length}個`);

		// JSON-LDを探す
		console.log("\n2. JSON-LD構造化データを探索:");
		const jsonLdPattern = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
		const jsonLdMatches = [...html.matchAll(jsonLdPattern)];
		if (jsonLdMatches.length > 0) {
			console.log(`  JSON-LD発見: ${jsonLdMatches.length}個`);
			jsonLdMatches.forEach((match, index) => {
				try {
					const jsonData = JSON.parse(match[1]);
					console.log(
						`  JSON-LD #${index + 1}:`,
						JSON.stringify(jsonData, null, 2).substring(0, 200) + "...",
					);
				} catch (e) {
					console.log(`  JSON-LD #${index + 1}: パースエラー`);
				}
			});
		}

		// metaタグを確認
		console.log("\n3. metaタグを確認:");
		const metaPattern = /<meta[^>]*(property|name)="([^"]*)"[^>]*content="([^"]*)"[^>]*>/g;
		const metaMatches = [...html.matchAll(metaPattern)];
		const relevantMeta = metaMatches.filter(
			(m) =>
				m[2].includes("search") ||
				m[2].includes("count") ||
				m[2].includes("total") ||
				m[3].includes("件"),
		);
		relevantMeta.forEach((match) => {
			console.log(`  ${match[2]}: ${match[3]}`);
		});

		// 作品数の特定パターンを探す
		console.log("\n4. 作品数の特定パターンを探索:");

		// パターンA: 検索結果の総数表示
		const totalPattern1 = /検索結果[^0-9]*([0-9,]+)\s*件/g;
		const totalMatches1 = [...html.matchAll(totalPattern1)];
		if (totalMatches1.length > 0) {
			console.log("  検索結果パターン:");
			totalMatches1.forEach((match) => {
				console.log(`    「${match[0]}」 → ${match[1]}件`);
			});
		}

		// パターンB: JavaScriptの変数
		const jsVarPattern = /(total|count|result)[^=]*=\s*([0-9,]+)/gi;
		const jsVarMatches = [...html.matchAll(jsVarPattern)];
		if (jsVarMatches.length > 0) {
			console.log("  JavaScript変数パターン:");
			jsVarMatches.slice(0, 5).forEach((match) => {
				console.log(`    ${match[0]}`);
			});
		}

		// パターンC: APIレスポンス風のパターン
		const apiPattern = /"(total|count|results?)":\s*([0-9]+)/gi;
		const apiMatches = [...html.matchAll(apiPattern)];
		if (apiMatches.length > 0) {
			console.log("  APIレスポンスパターン:");
			apiMatches.forEach((match) => {
				console.log(`    ${match[0]}`);
			});
		}

		// 実際の作品一覧部分を確認
		console.log("\n5. 作品一覧セクションの構造:");
		const workListPattern = /<ul[^>]*class="[^"]*work[^"]*"[^>]*>/gi;
		const workListMatches = [...html.matchAll(workListPattern)];
		console.log(`  作品リストのul要素: ${workListMatches.length}個`);

		// ページネーションセクションを確認
		console.log("\n6. ページネーションセクション:");
		const paginationPattern = /<[^>]*(pagination|pager|page-link)[^>]*>/gi;
		const paginationMatches = [...html.matchAll(paginationPattern)];
		console.log(`  ページネーション要素: ${paginationMatches.length}個`);

		// 最後のページ番号を探す
		const lastPagePattern = /page\/(\d+)[^>]*>(?:最後|&gt;&gt;|»)/gi;
		const lastPageMatches = [...html.matchAll(lastPagePattern)];
		if (lastPageMatches.length > 0) {
			const lastPage = Math.max(...lastPageMatches.map((m) => Number.parseInt(m[1])));
			console.log(`  最後のページ番号: ${lastPage}`);
			console.log(`  推定総作品数: ${lastPage * 100}件`);
		}
	} catch (error) {
		console.error("エラーが発生しました:", error);
	}
}

// 実行
testDLsiteDetailed();
