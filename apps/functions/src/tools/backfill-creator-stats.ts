/**
 * Creator 集計フィールド (workCount / types / primaryRole) backfill ツール
 *
 * SPR-74 Phase B で導入された denormalize フィールドを既存 creator docs に
 * 一括反映する一回限りのスクリプト。
 *
 * 使い方:
 *   pnpm --filter @suzumina.click/functions tools:backfill-creators
 */

import firestore from "../infrastructure/database/firestore";
import { recomputeCreatorStats } from "../services/dlsite/creator-firestore";
import * as logger from "../shared/logger";

const CONCURRENCY = 20;

export async function backfillCreatorStats(): Promise<void> {
	logger.info("クリエイター集計フィールド backfill 開始");

	const creatorsSnapshot = await firestore.collection("creators").get();
	const docs = creatorsSnapshot.docs;
	const total = docs.length;

	let processed = 0;
	let failed = 0;

	for (let i = 0; i < docs.length; i += CONCURRENCY) {
		const chunk = docs.slice(i, i + CONCURRENCY);
		const results = await Promise.allSettled(chunk.map((doc) => recomputeCreatorStats(doc.id)));
		for (const r of results) {
			if (r.status === "fulfilled") processed++;
			else failed++;
		}
		logger.info(`進捗: ${i + chunk.length}/${total} (success=${processed}, failed=${failed})`);
	}

	logger.info(`backfill 完了: success=${processed}, failed=${failed}, total=${total}`);
}
