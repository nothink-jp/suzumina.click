/**
 * Creator Domain Model - Functional Pattern
 */

/**
 * クリエイター（個人制作者）データモデル
 */
export interface CreatorData {
	readonly id: string;
	readonly name: string;
	readonly nameReading?: string;
	readonly types: readonly CreatorType[];
	readonly workIds: readonly string[];
	readonly circleIds?: readonly string[];
	readonly createdAt: string;
	readonly updatedAt: string;
}

/**
 * クリエイタータイプ
 */
export type CreatorType =
	| "voiceActor"
	| "illustrator"
	| "scenario"
	| "music"
	| "producer"
	| "other";

/**
 * クリエイターと作品のマッピング
 */
export interface CreatorWorkMapping {
	readonly creatorId: string;
	readonly workId: string;
	readonly roles: readonly CreatorType[];
	readonly creditedName?: string;
	readonly createdAt: string;
}

/**
 * 部分更新用の型
 */
export type CreatorUpdate = Partial<Omit<CreatorData, "id">>;

/**
 * 型ガード
 */
export const isCreatorData = (data: unknown): data is CreatorData => {
	if (!data || typeof data !== "object") return false;
	const c = data as Record<string, unknown>;
	return (
		typeof c.id === "string" &&
		typeof c.name === "string" &&
		Array.isArray(c.types) &&
		Array.isArray(c.workIds)
	);
};
