/**
 * audioButtonsコレクションの空のidフィールドを修正するスクリプト
 *
 * 使用方法:
 * 1. Google Cloud Console で Cloud Shell を開く
 * 2. このスクリプトをアップロードまたはコピー
 * 3. Node.js で実行: node fix-audio-button-ids.js
 */

const { Firestore } = require("@google-cloud/firestore");

// プロジェクト設定
const PROJECT_ID = "suzumina-click"; // プロジェクトIDを確認してください

// Firestore クライアントを初期化
// 本番環境では Google Cloud Shell や Functions 環境で実行するため、
// デフォルト認証情報を使用
const db = new Firestore({
	projectId: PROJECT_ID,
});

async function fixAudioButtonIds() {
	console.log("🔍 audioButtonsコレクションの空IDフィールドを修正開始...");

	try {
		// 全ての audioButtons ドキュメントを取得
		const snapshot = await db.collection("audioButtons").get();

		if (snapshot.empty) {
			console.log("❌ audioButtonsコレクションにドキュメントが見つかりませんでした");
			return;
		}

		console.log(`📊 ${snapshot.size} 件のドキュメントを確認中...`);

		let fixedCount = 0;
		let skippedCount = 0;

		// バッチ処理で更新（Firestoreのバッチ制限は500件）
		const batch = db.batch();
		let batchCount = 0;
		const BATCH_SIZE = 500;

		for (const doc of snapshot.docs) {
			const data = doc.data();

			// idフィールドが空文字列または存在しない場合のみ修正
			if (!data.id || data.id === "" || data.id === null) {
				console.log(`🔧 修正対象: ${doc.id} (title: "${data.title || "タイトルなし"}")`);

				// ドキュメントIDをidフィールドに設定
				batch.update(doc.ref, {
					id: doc.id,
					updatedAt: new Date().toISOString(),
				});

				fixedCount++;
				batchCount++;

				// バッチサイズに達したら実行
				if (batchCount >= BATCH_SIZE) {
					console.log(`📝 ${batchCount} 件のバッチを実行中...`);
					await batch.commit();
					batchCount = 0;
				}
			} else {
				skippedCount++;
				console.log(`✅ スキップ: ${doc.id} (id: "${data.id}")`);
			}
		}

		// 残りのバッチを実行
		if (batchCount > 0) {
			console.log(`📝 最終バッチ ${batchCount} 件を実行中...`);
			await batch.commit();
		}

		console.log("🎉 修正完了!");
		console.log(`✅ 修正済み: ${fixedCount} 件`);
		console.log(`⏭️ スキップ済み: ${skippedCount} 件`);
		console.log(`📊 合計: ${snapshot.size} 件`);
	} catch (error) {
		console.error("❌ エラーが発生しました:", error);
		process.exit(1);
	}
}

// 確認プロンプト
console.log("⚠️  警告: このスクリプトは本番データベースを変更します！");
console.log("🔍 実行前に以下を確認してください:");
console.log(`   - プロジェクトID: ${PROJECT_ID}`);
console.log("   - 適切な権限があること");
console.log("   - バックアップが取られていること");
console.log("");

// 引数で --force が指定された場合はそのまま実行
if (process.argv.includes("--force")) {
	fixAudioButtonIds().then(() => {
		console.log("🏁 スクリプトが正常に完了しました");
		process.exit(0);
	});
} else {
	console.log("実行するには --force フラグを追加してください:");
	console.log("node fix-audio-button-ids.js --force");
}
