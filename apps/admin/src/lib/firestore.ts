import { Firestore } from "@google-cloud/firestore";

let firestore: Firestore;

export function getFirestore(): Firestore {
	if (!firestore) {
		// 環境変数からプロジェクトIDを取得、フォールバックとして'suzumina-click'を使用
		const projectId =
			process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || "suzumina-click";

		firestore = new Firestore({
			projectId,
			ignoreUndefinedProperties: true,
		});
	}
	return firestore;
}
