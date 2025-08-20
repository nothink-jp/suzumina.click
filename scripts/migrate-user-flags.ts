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
	try {
		const usersSnapshot = await firestore.collection("users").get();
		const today = getJSTDateString();

		let _successCount = 0;
		let _skipCount = 0;
		let _errorCount = 0;

		// バッチ処理用
		let batch = firestore.batch();
		let batchCount = 0;
		const batchSize = 500;

		for (const userDoc of usersSnapshot.docs) {
			const userData = userDoc.data();

			// すでにフラグが設定されている場合はスキップ
			if (userData.flags && userData.dailyButtonLimit) {
				_skipCount++;
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
				_successCount++;

				// バッチサイズに達したらコミット
				if (batchCount >= batchSize) {
					await batch.commit();
					// 新しいバッチを作成
					batch = firestore.batch();
					batchCount = 0;
				}
			} catch (_error) {
				_errorCount++;
			}
		}

		// 残りのバッチをコミット
		if (batchCount > 0) {
			await batch.commit();
		}
	} catch (_error) {
		process.exit(1);
	}
}

/**
 * ドライラン機能（確認用）
 */
async function dryRun() {
	try {
		const usersSnapshot = await firestore.collection("users").get();

		let _familyCount = 0;
		let _generalCount = 0;
		let _alreadySetCount = 0;
		let toMigrateCount = 0;

		for (const userDoc of usersSnapshot.docs) {
			const userData = userDoc.data();

			if (userData.flags && userData.dailyButtonLimit) {
				// すでに設定済み
				_alreadySetCount++;
				if (userData.flags.isFamilyMember) {
					_familyCount++;
				} else {
					_generalCount++;
				}
			} else {
				// 未設定（マイグレーション対象）
				toMigrateCount++;
				if (userData.guildMembership?.isMember !== false) {
					_familyCount++;
				} else {
					_generalCount++;
				}
			}
		}

		if (toMigrateCount === 0) {
		} else {
		}
	} catch (_error) {
		process.exit(1);
	}
}

// メイン処理
async function main() {
	const args = process.argv.slice(2);

	if (args.includes("--dry-run")) {
		await dryRun();
	} else if (args.includes("--execute")) {
		// 3秒待機
		await new Promise((resolve) => {
			let countdown = 3;
			const timer = setInterval(() => {
				process.stdout.write(`  開始まで... ${countdown}\r`);
				countdown--;
				if (countdown === 0) {
					clearInterval(timer);
					resolve(undefined);
				}
			}, 1000);
		});

		await migrateExistingUsers();
	} else {
	}

	process.exit(0);
}

// エラーハンドリング
process.on("unhandledRejection", (_error) => {
	process.exit(1);
});

main();
