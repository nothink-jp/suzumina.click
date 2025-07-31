/**
 * Firestore Creator Document Types
 *
 * クリエイター情報の正規化されたデータ構造
 * サブコレクションを使用して作品との関連を管理
 */

import type { Timestamp } from "@google-cloud/firestore";
import type { CreatorType } from "../../entities/circle-creator";

/**
 * Firestoreのクリエイタードキュメント構造
 *
 * @description
 * クリエイターの基本情報を保持する正規化されたドキュメント
 * 作品との関連はサブコレクション creators/{creatorId}/works で管理
 */
export interface CreatorDocument {
	/** クリエイターID（Individual Info APIのcreater.id） */
	creatorId: string;

	/** クリエイター名 */
	name: string;

	/** 主要な役割（統計的に最も多い役割） */
	primaryRole?: CreatorType;

	/** 作成日時 */
	createdAt: Timestamp;

	/** 更新日時 */
	updatedAt: Timestamp;
}

/**
 * クリエイターと作品の関連を表すサブコレクションドキュメント
 *
 * @description
 * パス: creators/{creatorId}/works/{workId}
 * 各クリエイターの作品への参加情報を管理
 */
export interface CreatorWorkRelation {
	/** 作品ID（DLsiteのproduct_id） */
	workId: string;

	/** この作品での役割（複数可） */
	roles: CreatorType[];

	/** 作品が属するサークルID */
	circleId: string;

	/** 関連の更新日時 */
	updatedAt: Timestamp;
}

/**
 * クリエイターIDの検証
 *
 * @param creatorId 検証対象のクリエイターID
 * @returns 有効なクリエイターIDの場合true
 */
export function isValidCreatorDocumentId(creatorId: string): boolean {
	return creatorId.length > 0 && !creatorId.includes("/");
}

/**
 * CreatorDocumentの型ガード
 *
 * @param data 検証対象のデータ
 * @returns CreatorDocumentの場合true
 */
export function isCreatorDocument(data: unknown): data is CreatorDocument {
	if (!data || typeof data !== "object") {
		return false;
	}

	const doc = data as Record<string, unknown>;
	return (
		typeof doc.creatorId === "string" &&
		typeof doc.name === "string" &&
		doc.createdAt !== undefined &&
		doc.updatedAt !== undefined
	);
}

/**
 * CreatorWorkRelationの型ガード
 *
 * @param data 検証対象のデータ
 * @returns CreatorWorkRelationの場合true
 */
export function isCreatorWorkRelation(data: unknown): data is CreatorWorkRelation {
	if (!data || typeof data !== "object") {
		return false;
	}

	const doc = data as Record<string, unknown>;
	return (
		typeof doc.workId === "string" &&
		Array.isArray(doc.roles) &&
		typeof doc.circleId === "string" &&
		doc.updatedAt !== undefined
	);
}
