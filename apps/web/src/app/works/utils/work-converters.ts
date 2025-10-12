import type { WorkDocument, WorkPlainObject } from "@suzumina.click/shared-types";
import { workTransformers } from "@suzumina.click/shared-types";
import * as logger from "@/lib/logger";

/**
 * Firestoreドキュメントを作品オブジェクトに変換
 */
export async function convertDocsToWorks(
	docs: FirebaseFirestore.QueryDocumentSnapshot[],
): Promise<WorkPlainObject[]> {
	const works: WorkPlainObject[] = [];
	for (const doc of docs) {
		try {
			const data = { ...doc.data(), id: doc.id } as WorkDocument;
			if (!data.id) {
				data.id = data.productId;
			}
			const converted = workTransformers.fromFirestore(data);
			works.push(converted);
		} catch (error) {
			// エラーがあっても他のデータの処理は続行
			logger.warn("作品データ変換エラー", {
				workId: doc.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	return works;
}

/**
 * 作品をPlainObjectに変換
 */
export function convertWorksToPainObjects(paginatedWorks: WorkDocument[]): WorkPlainObject[] {
	const works: WorkPlainObject[] = [];
	for (const data of paginatedWorks) {
		try {
			if (!data.id) {
				data.id = data.productId;
			}
			const converted = workTransformers.fromFirestore(data);
			works.push(converted);
		} catch (error) {
			// エラーがあっても他のデータの処理は続行
			logger.warn("作品データ変換エラー", {
				workId: data.id || data.productId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	return works;
}
