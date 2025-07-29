/**
 * Firestore Circle Data Types
 *
 * プロジェクトの薄い設計パターンに従い、シンプルなデータ構造を採用
 * workCountは配列長から計算することで整合性を保証
 */

/**
 * Firestore内のCircleドキュメント
 *
 * @description
 * サークル情報を管理するドキュメント。
 * workIdsを配列で持つことで、workCountは常に正確に計算可能。
 * FieldValue.incrementを使わないことでカウント不整合を防ぐ。
 */
export interface CircleDocument {
	/** サークルID（DLsite上のmaker_id） */
	circleId: string;

	/** サークル名 */
	name: string;

	/** サークル名（英語） */
	nameEn?: string;

	/** サークルに所属する作品IDの配列 */
	workIds: string[];

	/** 作成日時（Firestore.Timestamp型） */
	createdAt: unknown; // Firestore.Timestamp型 (Firestore依存を避けるためunknown)

	/** 更新日時（Firestore.Timestamp型） */
	updatedAt: unknown; // Firestore.Timestamp型 (Firestore依存を避けるためunknown)
}

/**
 * CircleDocumentの型ガード
 */
export function isCircleDocument(data: unknown): data is CircleDocument {
	if (!data || typeof data !== "object") {
		return false;
	}

	const doc = data as Record<string, unknown>;
	return (
		typeof doc.circleId === "string" &&
		typeof doc.name === "string" &&
		Array.isArray(doc.workIds) &&
		doc.workIds.every((id) => typeof id === "string") &&
		doc.createdAt !== undefined &&
		doc.updatedAt !== undefined
	);
}
