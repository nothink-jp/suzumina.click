import type { WorkDocument, WorkPlainObject } from "@suzumina.click/shared-types";
import { WorkDocumentSchema, workTransformers } from "@suzumina.click/shared-types";
import * as logger from "@/lib/logger";

/**
 * Firestore の生データを WorkDocument として検証する（読み取り境界の漏斗）。
 *
 * `WorkDocumentSchema` の `.default([])`（genres / customGenres / sampleImages 等）は **parse 時のみ効く**ため、
 * 従来の blind cast では「required のはずのフィールドが実行時に欠ける」静かな型嘘が残っていた（SPR-201）。
 * ここで safeParse を通して default を実効化する。
 *
 * 検証失敗時は **非破壊フォールバック**（cast で継続）+ warn でスキーマドリフトを観測する。
 * 本番データとスキーマの整合が未確認のため「落とさず観測」を選ぶ — warn が常態化したら schema を実態へ寄せ、
 * 収束を確認できたら parse 失敗を skip に倒す余地がある。
 */
export function parseWorkDocument(raw: unknown): WorkDocument {
	const parsed = WorkDocumentSchema.safeParse(raw);
	if (parsed.success) {
		// parse 済み（default 適用）を基準に、スキーマが strip する未定義フィールドは raw から温存する。
		return { ...(raw as Record<string, unknown>), ...parsed.data } as WorkDocument;
	}
	logger.warn("WorkDocument スキーマ検証に失敗（cast で継続）", {
		workId:
			(raw as { productId?: string })?.productId ?? (raw as { id?: string })?.id ?? "(unknown)",
		issues: parsed.error.issues
			.slice(0, 5)
			.map((i) => `${i.path.join(".") || "(root)"}: ${i.code}`),
	});
	return raw as WorkDocument;
}

/**
 * Firestoreドキュメントを作品オブジェクトに変換
 */
export async function convertDocsToWorks(
	docs: FirebaseFirestore.QueryDocumentSnapshot[],
): Promise<WorkPlainObject[]> {
	const works: WorkPlainObject[] = [];
	for (const doc of docs) {
		try {
			// raw に id: doc.id を常に含めるため、data.id は成功/フォールバックいずれでも設定済み
			const data = parseWorkDocument({ ...doc.data(), id: doc.id });
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
export function convertWorksToPlainObjects(paginatedWorks: WorkDocument[]): WorkPlainObject[] {
	const works: WorkPlainObject[] = [];
	for (const rawData of paginatedWorks) {
		try {
			const data = parseWorkDocument(rawData);
			if (!data.id) {
				data.id = data.productId;
			}
			const converted = workTransformers.fromFirestore(data);
			works.push(converted);
		} catch (error) {
			// エラーがあっても他のデータの処理は続行
			logger.warn("作品データ変換エラー", {
				workId: rawData.id || rawData.productId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	return works;
}
