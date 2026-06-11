import { z } from "zod";

// =====================
// Firestore型定義
// =====================

/**
 * Firestore Timestamp の読み取り用構造型（環境非依存・firebase-admin に依存しない）。
 *
 * 読み取った Firestore ドキュメントの日時フィールドはこの型で受け、`.toDate()` で Date 化する。
 * 書き込み時の `FieldValue.serverTimestamp()` は別物（型が一致しない）ため、書き込みペイロード側で
 * 1 箇所だけ構造型へキャストする（evaluation-actions の `serverNow()` ヘルパー）。
 * 以前は `unknown` で退避し利用側で二重キャストが増殖していた（SPR-199）。
 */
export interface FirestoreTimestamp {
	toDate(): Date;
}

/**
 * 作品評価のFirestoreデータ型
 */
export interface FirestoreWorkEvaluation {
	// 基本識別情報
	id: string; // ドキュメントID（複合キー: {userId}_{workId}）
	workId: string; // DLsite作品ID (例: "RJ01414353")
	userId: string; // Discord ユーザーID

	// 評価タイプ（排他的）
	evaluationType: "top10" | "star" | "ng";

	// 評価詳細（条件付きフィールド）
	top10Rank?: number; // 1-10 (evaluationType === 'top10'の時のみ)
	starRating?: 1 | 2 | 3; // 星評価 (evaluationType === 'star'の時のみ)

	// メタデータ
	createdAt: FirestoreTimestamp; // 初回評価日時
	updatedAt: FirestoreTimestamp; // 最終更新日時
}

/**
 * ユーザーの10選リスト（サブコレクション）
 */
export interface UserTop10List {
	userId: string; // ユーザーID
	rankings: {
		[rank: number]: {
			// キー: 1-10の順位
			workId: string; // 作品ID
			workTitle?: string; // 作品タイトル（表示用キャッシュ）
			updatedAt: FirestoreTimestamp; // この順位に設定された日時
		} | null; // null = その順位は空き
	};
	lastUpdatedAt: FirestoreTimestamp; // 最終更新日時
	totalCount: number; // 現在の10選登録数（0-10）
}

// =====================
// フロントエンド型定義
// =====================

/**
 * フロントエンド用評価データ
 */
export interface FrontendWorkEvaluation {
	id: string;
	workId: string;
	userId: string;
	evaluationType: "top10" | "star" | "ng";
	top10Rank?: number;
	starRating?: 1 | 2 | 3;
	createdAt: string; // ISO 8601
	updatedAt: string; // ISO 8601
}

/**
 * フロントエンド用10選リスト
 */
export interface FrontendUserTop10List {
	userId: string;
	rankings: {
		[rank: number]: {
			workId: string;
			workTitle?: string;
			updatedAt: string; // ISO 8601
		} | null;
	};
	lastUpdatedAt: string; // ISO 8601
	totalCount: number;
}

// =====================
// 入力型定義
// =====================

/**
 * 評価更新の入力型
 */
export interface EvaluationInput {
	type: "top10" | "star" | "ng" | "remove";
	top10Rank?: number; // 1-10
	starRating?: 1 | 2 | 3;
	workTitle?: string; // 10選用の作品タイトル
}

/**
 * API レスポンス型
 */
export interface EvaluationResult {
	success: boolean;
	data?: FrontendWorkEvaluation;
	error?: string;
}

// =====================
// Zodスキーマ（検証用）
// =====================

/**
 * 評価入力のZodスキーマ
 */
export const EvaluationInputSchema = z
	.object({
		type: z.enum(["top10", "star", "ng", "remove"]),
		top10Rank: z.number().min(1).max(10).optional(),
		starRating: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
		workTitle: z.string().min(1).max(200).optional(),
	})
	.refine(
		(data) => {
			// top10の場合は順位が必須
			if (data.type === "top10") {
				return data.top10Rank !== undefined && data.workTitle !== undefined;
			}
			// starの場合は評価が必須
			if (data.type === "star") {
				return data.starRating !== undefined;
			}
			// ng, removeの場合は追加フィールド不要
			return true;
		},
		{
			message: "評価タイプに応じた必須フィールドが不足しています",
		},
	);

/**
 * 作品評価のZodスキーマ
 */
export const WorkEvaluationSchema = z.object({
	id: z.string().min(1),
	workId: z.string().regex(/^RJ\d+$/),
	userId: z.string().min(1),
	evaluationType: z.enum(["top10", "star", "ng"]),
	top10Rank: z.number().min(1).max(10).optional(),
	starRating: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

/**
 * 10選リストのZodスキーマ
 */
export const UserTop10ListSchema = z.object({
	userId: z.string().min(1),
	rankings: z.record(
		z.string(),
		z.union([
			z.object({
				workId: z.string().regex(/^RJ\d+$/),
				workTitle: z.string().optional(),
				updatedAt: z.string().datetime(),
			}),
			z.null(),
		]),
	),
	lastUpdatedAt: z.string().datetime(),
	totalCount: z.number().min(0).max(10),
});

// =====================
// 型ガード
// =====================

/**
 * 評価タイプがtop10かどうかをチェック
 */
export function isTop10Evaluation(
	evaluation: FrontendWorkEvaluation,
): evaluation is FrontendWorkEvaluation & { top10Rank: number } {
	return evaluation.evaluationType === "top10" && evaluation.top10Rank !== undefined;
}

/**
 * 評価タイプがstarかどうかをチェック
 */
export function isStarEvaluation(
	evaluation: FrontendWorkEvaluation,
): evaluation is FrontendWorkEvaluation & { starRating: 1 | 2 | 3 } {
	return evaluation.evaluationType === "star" && evaluation.starRating !== undefined;
}

/**
 * 評価タイプがngかどうかをチェック
 */
export function isNgEvaluation(evaluation: FrontendWorkEvaluation): boolean {
	return evaluation.evaluationType === "ng";
}

// =====================
// 変換関数
// =====================

/**
 * FirestoreからFrontend形式への変換
 */
export function convertToFrontendEvaluation(
	firestoreData: FirestoreWorkEvaluation,
): FrontendWorkEvaluation {
	return {
		id: firestoreData.id,
		workId: firestoreData.workId,
		userId: firestoreData.userId,
		evaluationType: firestoreData.evaluationType,
		top10Rank: firestoreData.top10Rank,
		starRating: firestoreData.starRating,
		createdAt: firestoreData.createdAt.toDate().toISOString(),
		updatedAt: firestoreData.updatedAt.toDate().toISOString(),
	};
}

/**
 * FirestoreからFrontend形式への変換（10選リスト）
 */
export function convertToFrontendTop10List(firestoreData: UserTop10List): FrontendUserTop10List {
	const frontendRankings: FrontendUserTop10List["rankings"] = {};

	for (const [rank, data] of Object.entries(firestoreData.rankings)) {
		if (data === null) {
			frontendRankings[Number(rank)] = null;
		} else {
			frontendRankings[Number(rank)] = {
				workId: data.workId,
				workTitle: data.workTitle,
				updatedAt: data.updatedAt.toDate().toISOString(),
			};
		}
	}

	return {
		userId: firestoreData.userId,
		rankings: frontendRankings,
		lastUpdatedAt: firestoreData.lastUpdatedAt.toDate().toISOString(),
		totalCount: firestoreData.totalCount,
	};
}
