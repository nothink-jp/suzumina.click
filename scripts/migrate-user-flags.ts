#!/usr/bin/env tsx

/**
 * 既存ユーザーにフラグとレート制限を設定するマイグレーションスクリプト
 *
 * 使用方法:
 * pnpm tsx scripts/migrate-user-flags.ts
 *
 * 注意: gcloud auth application-default loginで認証済みである必要があります
 */

import { Firestore } from "@google-cloud/firestore";

// Firestoreクライアントの初期化（プロジェクトの標準的な方法を使用）
const projectId = process.env.GOOGLE_CLOUD_PROJECT || "suzumina-click";
const firestore = new Firestore({
	projectId,
	ignoreUndefinedProperties: true,
});

/**
 * JST日付を取得（YYYY-MM-DD形式）
 */
function getJSTDateString(): string {
	return new Date().toLocaleDateString("sv-SE", {
		timeZone: "Asia/Tokyo",
	});
}

/**
 * 既存ユーザーのマイグレーション
 */
async function migrateExistingUsers() {
	console.log("🚀 ユーザーマイグレーション開始...");
	console.log(`📌 プロジェクトID: ${projectId}`);

	try {
		const usersSnapshot = await firestore.collection("users").get();
		const today = getJSTDateString();

		console.log(`📊 総ユーザー数: ${usersSnapshot.size}`);

		let successCount = 0;
		let skipCount = 0;
		let errorCount = 0;

		// バッチ処理用
		let batch = firestore.batch();
		let batchCount = 0;
		const batchSize = 500;

		for (const userDoc of usersSnapshot.docs) {
			const userData = userDoc.data();

			// すでにフラグが設定されている場合はスキップ
			if (userData.flags && userData.dailyButtonLimit) {
				console.log(`⏭️  スキップ: ${userData.username || userData.discordId} (既に設定済み)`);
				skipCount++;
				continue;
			}

			try {
				// 既存ユーザーは全員すずみなふぁみりーメンバーとして扱う
				const isFamilyMember = userData.guildMembership?.isMember !== false;

				const updates = {
					flags: {
						isFamilyMember,
						lastGuildCheckDate: today,
					},
					dailyButtonLimit: {
						date: today,
						count: 0,
						limit: isFamilyMember ? 110 : 10,
						guildChecked: true,
					},
				};

				batch.update(userDoc.ref, updates);
				batchCount++;

				console.log(
					`✅ 更新予定: ${userData.username || userData.discordId} (${isFamilyMember ? "ファミリー" : "一般"})`,
				);
				successCount++;

				// バッチサイズに達したらコミット
				if (batchCount >= batchSize) {
					await batch.commit();
					console.log(`💾 ${batchCount}件をコミット`);
					// 新しいバッチを作成
					batch = firestore.batch();
					batchCount = 0;
				}
			} catch (error) {
				console.error(`❌ エラー: ${userData.username || userData.discordId}`, error);
				errorCount++;
			}
		}

		// 残りのバッチをコミット
		if (batchCount > 0) {
			await batch.commit();
			console.log(`💾 最後の${batchCount}件をコミット`);
		}

		console.log("\n📋 マイグレーション完了:");
		console.log(`  ✅ 成功: ${successCount}件`);
		console.log(`  ⏭️  スキップ: ${skipCount}件`);
		console.log(`  ❌ エラー: ${errorCount}件`);
	} catch (error) {
		console.error("❌ マイグレーション失敗:", error);
		process.exit(1);
	}
}

/**
 * ドライラン機能（確認用）
 */
async function dryRun() {
	console.log("🔍 ドライラン実行中...");
	console.log(`📌 プロジェクトID: ${projectId}`);

	try {
		const usersSnapshot = await firestore.collection("users").get();

		let familyCount = 0;
		let generalCount = 0;
		let alreadySetCount = 0;
		let toMigrateCount = 0;

		console.log(`\n📊 総ユーザー数: ${usersSnapshot.size}`);

		for (const userDoc of usersSnapshot.docs) {
			const userData = userDoc.data();

			if (userData.flags && userData.dailyButtonLimit) {
				// すでに設定済み
				alreadySetCount++;
				if (userData.flags.isFamilyMember) {
					familyCount++;
				} else {
					generalCount++;
				}
			} else {
				// 未設定（マイグレーション対象）
				toMigrateCount++;
				if (userData.guildMembership?.isMember !== false) {
					familyCount++;
				} else {
					generalCount++;
				}
			}
		}

		console.log("\n📊 ユーザー分布（予測）:");
		console.log(`  👨‍👩‍👧‍👦 ファミリーメンバー: ${familyCount}人 (1日110個)`);
		console.log(`  👤 一般ユーザー: ${generalCount}人 (1日10個)`);
		console.log("\n📋 マイグレーション状況:");
		console.log(`  ✅ 設定済み: ${alreadySetCount}人`);
		console.log(`  🔄 要マイグレーション: ${toMigrateCount}人`);

		if (toMigrateCount === 0) {
			console.log("\n✨ 全ユーザーが設定済みです。マイグレーションは不要です。");
		} else {
			console.log("\n💡 本番実行するには --execute フラグを付けて実行してください。");
		}
	} catch (error) {
		console.error("❌ ドライラン失敗:", error);
		console.error("\n⚠️  認証エラーの場合は以下を確認してください:");
		console.error("  1. gcloud auth application-default login で認証済みか");
		console.error("  2. プロジェクトIDが正しいか (現在: " + projectId + ")");
		process.exit(1);
	}
}

// メイン処理
async function main() {
	const args = process.argv.slice(2);

	console.log("================================================");
	console.log("  ユーザーフラグ・レート制限マイグレーション");
	console.log("================================================\n");

	if (args.includes("--dry-run")) {
		await dryRun();
	} else if (args.includes("--execute")) {
		console.log("⚠️  本番実行します。続行しますか？");
		console.log("  Ctrl+C で中断できます。\n");

		// 3秒待機
		await new Promise((resolve) => {
			let countdown = 3;
			const timer = setInterval(() => {
				process.stdout.write(`  開始まで... ${countdown}\r`);
				countdown--;
				if (countdown === 0) {
					clearInterval(timer);
					console.log("  開始します！      \n");
					resolve(undefined);
				}
			}, 1000);
		});

		await migrateExistingUsers();
	} else {
		console.log("⚠️  使用方法:");
		console.log("  ドライラン（確認のみ）: pnpm tsx scripts/migrate-user-flags.ts --dry-run");
		console.log("  本番実行: pnpm tsx scripts/migrate-user-flags.ts --execute");
		console.log("\nまずは --dry-run で確認することをお勧めします。");
	}

	process.exit(0);
}

// エラーハンドリング
process.on("unhandledRejection", (error) => {
	console.error("❌ 予期しないエラー:", error);
	process.exit(1);
});

main();
