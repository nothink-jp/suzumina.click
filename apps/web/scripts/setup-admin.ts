#!/usr/bin/env tsx
/**
 * 管理者ユーザーをセットアップするスクリプト（v0.2.3+ Firestore認証対応）
 * 使用方法: pnpm tsx scripts/setup-admin.ts <Discord ID>
 *
 * v0.2.3以降では環境変数DEFAULT_ADMIN_DISCORD_IDSは使用されず、
 * Firestoreのrole="admin" + isActive=trueでの認証に変更されました。
 */

/* eslint-disable no-console */

import { Firestore } from "@google-cloud/firestore";

// Firestore クライアントの初期化
const db = new Firestore({
	projectId: process.env.GOOGLE_CLOUD_PROJECT || "suzumina-click",
});

async function setupAdmin(discordId: string) {
	if (!discordId) {
		// biome-ignore lint/suspicious/noConsole: CLIスクリプトのため
		console.error("❌ Discord IDを指定してください");
		// biome-ignore lint/suspicious/noConsole: CLIスクリプトのため
		console.log("使用方法: pnpm tsx scripts/setup-admin.ts <Discord ID>");
		process.exit(1);
	}

	try {
		// ユーザーが存在するか確認
		const userDoc = await db.collection("users").doc(discordId).get();

		if (!userDoc.exists) {
			// biome-ignore lint/suspicious/noConsole: CLIスクリプトのため
			console.error(`❌ Discord ID ${discordId} のユーザーが見つかりません`);
			// biome-ignore lint/suspicious/noConsole: CLIスクリプトのため
			console.log("先にサイトにログインしてユーザーを作成してください");
			process.exit(1);
		}

		const userData = userDoc.data();
		const currentRole = userData?.role || "member";
		const isActive = userData?.isActive || false;

		// biome-ignore lint/suspicious/noConsole: CLIスクリプトのため
		console.log("\n📋 ユーザー情報:");
		// biome-ignore lint/suspicious/noConsole: CLIスクリプトのため
		console.log(`  Discord ID: ${discordId}`);
		// biome-ignore lint/suspicious/noConsole: CLIスクリプトのため
		console.log(`  ユーザー名: ${userData?.username || "不明"}`);
		// biome-ignore lint/suspicious/noConsole: CLIスクリプトのため
		console.log(`  表示名: ${userData?.displayName || "不明"}`);
		// biome-ignore lint/suspicious/noConsole: CLIスクリプトのため
		console.log(`  現在のロール: ${currentRole}`);
		// biome-ignore lint/suspicious/noConsole: CLIスクリプトのため
		console.log(`  アクティブ状態: ${isActive}`);

		if (currentRole === "admin" && isActive) {
			// biome-ignore lint/suspicious/noConsole: CLIスクリプトのため
			console.log("\n✅ このユーザーは既に管理者です");
			process.exit(0);
		}

		// ロールを管理者に更新（isActiveも必ずtrueに設定）
		await db.collection("users").doc(discordId).update({
			role: "admin",
			isActive: true,
			updatedAt: new Date().toISOString(),
		});

		// biome-ignore lint/suspicious/noConsole: CLIスクリプトのため
		console.log("\n✅ ユーザーのロールを管理者に更新しました");
		// biome-ignore lint/suspicious/noConsole: CLIスクリプトのため
		console.log("📱 admin.suzumina.click でログインして管理機能にアクセスできます");
		// biome-ignore lint/suspicious/noConsole: CLIスクリプトのため
		console.log("🔗 管理者アプリは独立したアプリケーションとして動作します");
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: CLIスクリプトのため
		console.error("\n❌ エラーが発生しました:", error);
		process.exit(1);
	}
}

// コマンドライン引数から Discord ID を取得
const discordId = process.argv[2] || "";
setupAdmin(discordId);
