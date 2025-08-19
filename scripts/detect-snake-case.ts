#!/usr/bin/env tsx
/**
 * Firestore内のsnake_caseフィールドを検出
 *
 * 使用方法:
 * pnpm tsx scripts/detect-snake-case.ts
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin
initializeApp({
	projectId: process.env.FIRESTORE_PROJECT_ID || "suzumina-click",
});

const db = getFirestore();

interface FieldAnalysis {
	collection: string;
	snakeCaseFields: Set<string>;
	sampleDocIds: string[];
	totalDocs: number;
}

/**
 * snake_caseかどうかを判定
 */
const isSnakeCase = (field: string): boolean => {
	return field.includes("_");
};

/**
 * オブジェクトのフィールドを再帰的に検査
 */
const analyzeFields = (obj: any, prefix = ""): Set<string> => {
	const snakeFields = new Set<string>();

	for (const [key, value] of Object.entries(obj)) {
		const fullKey = prefix ? `${prefix}.${key}` : key;

		if (isSnakeCase(key)) {
			snakeFields.add(fullKey);
		}

		if (value && typeof value === "object" && !Array.isArray(value)) {
			const nestedFields = analyzeFields(value, fullKey);
			nestedFields.forEach((field) => snakeFields.add(field));
		}
	}

	return snakeFields;
};

/**
 * コレクションを分析
 */
const analyzeCollection = async (collectionName: string, limit = 100): Promise<FieldAnalysis> => {
	console.log(`\n📊 Analyzing collection: ${collectionName}`);

	const collection = db.collection(collectionName);
	const snapshot = await collection.limit(limit).get();

	const analysis: FieldAnalysis = {
		collection: collectionName,
		snakeCaseFields: new Set(),
		sampleDocIds: [],
		totalDocs: snapshot.size,
	};

	snapshot.forEach((doc) => {
		const data = doc.data();
		const snakeFields = analyzeFields(data);

		if (snakeFields.size > 0) {
			analysis.sampleDocIds.push(doc.id);
			snakeFields.forEach((field) => analysis.snakeCaseFields.add(field));
		}
	});

	return analysis;
};

/**
 * メイン処理
 */
const main = async () => {
	console.log("🔍 Snake_case Field Detection Script");
	console.log("=====================================\n");

	const collections = [
		"works",
		"circles",
		"creators",
		"videos",
		"audioButtons",
		"users",
		"dlsiteMetadata",
	];

	const results: FieldAnalysis[] = [];
	let hasSnakeCase = false;

	for (const collection of collections) {
		try {
			const analysis = await analyzeCollection(collection);
			results.push(analysis);

			if (analysis.snakeCaseFields.size > 0) {
				hasSnakeCase = true;
				console.log(`  ⚠️  Found ${analysis.snakeCaseFields.size} snake_case fields:`);
				analysis.snakeCaseFields.forEach((field) => {
					console.log(`     - ${field}`);
				});
				console.log(`     Sample docs: ${analysis.sampleDocIds.slice(0, 3).join(", ")}`);
			} else {
				console.log("  ✅ No snake_case fields found");
			}
		} catch (error) {
			console.log(`  ❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
		}
	}

	// サマリー
	console.log("\n=====================================");
	console.log("📋 Summary\n");

	if (hasSnakeCase) {
		console.log("🔴 MIGRATION NEEDED\n");
		results
			.filter((r) => r.snakeCaseFields.size > 0)
			.forEach((r) => {
				console.log(`${r.collection}:`);
				r.snakeCaseFields.forEach((field) => {
					console.log(`  - ${field}`);
				});
			});

		// マイグレーション推定
		const totalFields = results.reduce((sum, r) => sum + r.snakeCaseFields.size, 0);
		const affectedCollections = results.filter((r) => r.snakeCaseFields.size > 0).length;

		console.log("\nMigration Impact:");
		console.log(`  - Collections affected: ${affectedCollections}`);
		console.log(`  - Total fields to migrate: ${totalFields}`);
		console.log(`  - Estimated downtime: ${Math.ceil(totalFields * 2)} minutes`);
	} else {
		console.log("✅ NO MIGRATION NEEDED");
		console.log("All collections use camelCase consistently!");
	}

	process.exit(hasSnakeCase ? 1 : 0);
};

// エラーハンドリング
main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
