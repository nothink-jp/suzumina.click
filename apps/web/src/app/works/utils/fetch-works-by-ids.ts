import type { WorkDocument } from "@suzumina.click/shared-types";

/**
 * 1 回の getAll で引く作品数。
 *
 * 旧実装は「Firestoreの whereIn 制限により、一度に10件まで」として 10 件ずつ逐次取得していたが、
 * これは制約の取り違え。10 件上限は `where(..., "in", [...])` のものであって、
 * ここで使う `getAll`（BatchGetDocuments）には掛からない。
 * 最大サークル（789作品）で 79 往復していたのを 3 往復に畳む。
 */
const BATCH_SIZE = 300;

/**
 * 作品IDの配列から WorkDocument を引く（circle / creator の作品一覧の共通土台）。
 *
 * circle も creator も「所属する作品IDは書き込み側が正本を持つ」構造で、
 * 読み取り側は ID を引き当てるだけでよい（所属条件を read 時に再計算しない）。
 * - circle: `circles/{id}.workIds`（DLsite 取り込みが arrayUnion / 整合性cron が修復）
 * - creator: `creators/{id}/works` サブコレクション
 *
 * 存在しない ID は黙って除外する。ID の出所は非正規化された配列/サブコレクションで、
 * 作品削除との間に必ずラグがあるため「欠けている」は異常ではない（整合性cron の担当）。
 *
 * @param firestore Firestore インスタンス
 * @param workIds 取得する作品IDの配列
 * @returns 実在した作品のみの WorkDocument 配列（入力順を保つ）
 */
export async function fetchWorksByIds(
	firestore: FirebaseFirestore.Firestore,
	workIds: string[],
): Promise<WorkDocument[]> {
	if (workIds.length === 0) {
		return [];
	}

	const batches: string[][] = [];
	for (let i = 0; i < workIds.length; i += BATCH_SIZE) {
		batches.push(workIds.slice(i, i + BATCH_SIZE));
	}

	const snapshots = await Promise.all(
		batches.map((batch) =>
			firestore.getAll(...batch.map((id) => firestore.collection("works").doc(id))),
		),
	);

	const works: WorkDocument[] = [];
	for (const docs of snapshots) {
		for (const doc of docs) {
			if (!doc.exists) {
				continue;
			}
			works.push({ ...doc.data(), id: doc.id } as WorkDocument);
		}
	}

	return works;
}
