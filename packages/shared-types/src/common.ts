import { z } from "zod";

/**
 * バリデーションエラーの型定義
 */
export const ValidationErrorSchema = z.object({
	path: z.array(z.union([z.string(), z.number()])),
	message: z.string(),
});

export type ValidationError = z.infer<typeof ValidationErrorSchema>;

/**
 * Zodエラーを整形して返す関数
 *
 * @param error Zodのバリデーションエラー
 * @returns 整形されたバリデーションエラーの配列
 */
export function formatZodError(error: z.ZodError): ValidationError[] {
	return error.issues.map((err) => ({
		path: err.path,
		message: err.message,
	}));
}

/**
 * Server Actionの共通レスポンス型
 */
export const ActionResultSchema = z.object({
	success: z.boolean(),
	data: z.unknown().optional(),
	error: z.string().optional(),
	validationErrors: z.array(ValidationErrorSchema).optional(),
});

export type ActionResult<T = unknown> = {
	success: boolean;
	data?: T;
	error?: string;
	validationErrors?: ValidationError[];
};

/**
 * RSCとRCC間の安全なデータシリアライズ/デシリアライズのためのユーティリティ
 */

/**
 * データをJSON文字列にシリアライズする汎用関数
 *
 * @param data シリアライズするデータ
 * @returns JSON文字列
 */
export function serialize<T>(data: T): string {
	return JSON.stringify(data);
}

/**
 * JSON文字列からデータをデシリアライズし、スキーマで検証する汎用関数
 *
 * @param json JSON文字列
 * @param schema 検証に使用するZodスキーマ
 * @returns 型安全なデータ
 */
export function deserialize<T>(json: string, schema: z.ZodType<T>): T {
	try {
		const data = JSON.parse(json);
		return schema.parse(data);
	} catch (_error) {
		// エラーの詳細はログに記録される想定
		throw new Error("データの形式が無効です");
	}
}

/**
 * Firestoreとの連携用ユーティリティ
 */

/**
 * Firestoreデータを指定したZodスキーマに変換する
 *
 * @param schema 検証に使用するZodスキーマ
 * @param data Firestoreから取得したデータ
 * @returns 型安全なデータ
 */
export function convertFromFirestore<T>(schema: z.ZodType<T>, data: Record<string, unknown>): T {
	try {
		return schema.parse(data);
	} catch (_error) {
		// エラーの詳細はログに記録される想定
		throw new Error("データ形式が無効です");
	}
}

/**
 * 型安全なデータをFirestore保存用のオブジェクトに変換する
 *
 * @param data 保存するデータ
 * @returns Firestore保存用のプレーンオブジェクト
 */
export function convertToFirestore<T>(data: T): Record<string, unknown> {
	return JSON.parse(JSON.stringify(data));
}
