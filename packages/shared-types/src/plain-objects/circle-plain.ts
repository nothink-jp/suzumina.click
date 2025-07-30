/**
 * Circle Plain Object Types
 *
 * シリアライズ可能なサークルデータ構造
 * Server ComponentからClient Componentへの受け渡しに使用
 */

/**
 * Client Component用のサークルプレーンオブジェクト
 *
 * @description
 * Firestoreのタイムスタンプを文字列に変換し、
 * Server ComponentからClient Componentへ安全に渡せる形式
 */
export interface CirclePlainObject {
	/** サークルID（DLsite上のmaker_id） */
	circleId: string;

	/** サークル名 */
	name: string;

	/** サークル名（英語） */
	nameEn?: string;

	/** 作品数（workIds配列の長さから計算） */
	workCount: number;

	/** 作成日時（ISO文字列） */
	createdAt: string | null;

	/** 更新日時（ISO文字列） */
	updatedAt: string | null;
}
