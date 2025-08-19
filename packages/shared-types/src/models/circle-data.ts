/**
 * Circle Domain Model - Functional Pattern
 */

/**
 * サークル（団体/出版社）データモデル
 */
export interface CircleData {
	readonly id: string;
	readonly name: string;
	readonly nameEn?: string;
	readonly workIds: readonly string[];
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly totalWorks?: number;
	readonly latestWorkDate?: string;
}

/**
 * 部分更新用の型
 */
export type CircleUpdate = Partial<Omit<CircleData, "id">>;

/**
 * 型ガード
 */
export const isCircleData = (data: unknown): data is CircleData => {
	if (!data || typeof data !== "object") return false;
	const c = data as Record<string, unknown>;
	return typeof c.id === "string" && typeof c.name === "string" && Array.isArray(c.workIds);
};
