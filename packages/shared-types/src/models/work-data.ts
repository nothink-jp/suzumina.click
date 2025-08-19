/**
 * Work Domain Model - Functional Pattern
 *
 * イミュータブルなデータ構造として定義
 * RSC (React Server Components) で直接使用可能
 *
 * 命名規則: camelCase（Firestore統一形式）
 */

/**
 * 作品の価格情報
 */
export interface PriceData {
	readonly current: number;
	readonly original?: number;
	readonly discountRate?: number;
	readonly currency?: string;
}

/**
 * サークル情報
 */
export interface CircleData {
	readonly id: string;
	readonly name: string;
	readonly nameEn?: string;
}

/**
 * 評価情報
 */
export interface RatingData {
	readonly average: number;
	readonly count: number;
	readonly reviewCount?: number;
}

/**
 * クリエイター情報
 */
export interface CreatorInfo {
	readonly id: string;
	readonly name: string;
}

/**
 * クリエイター情報（役割別）
 */
export interface CreatorsData {
	readonly scenario?: readonly CreatorInfo[];
	readonly illustration?: readonly CreatorInfo[];
	readonly voiceActor?: readonly CreatorInfo[];
	readonly music?: readonly CreatorInfo[];
	readonly createdBy?: readonly CreatorInfo[];
	readonly other?: readonly CreatorInfo[];
}

/**
 * 作品データモデル
 * PlainObjectとして定義し、RSC境界を問題なく通過可能
 */
export interface WorkData {
	// 基本情報
	readonly id: string;
	readonly productId: string;
	readonly title: string;
	readonly maskedTitle?: string;
	readonly circle: CircleData;

	// 価格情報
	readonly price: PriceData;

	// 日付情報（ISO 8601形式）
	readonly releaseDate: string;
	readonly registeredDate?: string;
	readonly lastModified?: string;

	// 評価情報
	readonly rating?: RatingData;

	// カテゴリ情報
	readonly category?: string;
	readonly workType?: string;
	readonly tags?: readonly string[];

	// 詳細情報
	readonly description?: string;
	readonly imageUrl?: string;
	readonly thumbnailUrl?: string;
	readonly workUrl?: string;

	// 販売情報
	readonly saleCount?: number;
	readonly reviewCount?: number;
	readonly isAdult?: boolean;
	readonly hasStock?: boolean;
	readonly ageRating?: string;

	// クリエイター情報
	readonly creators?: CreatorsData;

	// 計算済みプロパティ（オプション）
	readonly _computed?: {
		readonly isNewRelease?: boolean;
		readonly isOnSale?: boolean;
		readonly displayTitle?: string;
		readonly formattedPrice?: string;
	};
}

/**
 * 部分更新用の型
 */
export type WorkUpdate = Partial<Omit<WorkData, "id" | "productId">>;

/**
 * 型ガード
 */
export const isWorkData = (data: unknown): data is WorkData => {
	if (!data || typeof data !== "object") return false;
	const w = data as Record<string, unknown>;

	if (typeof w.id !== "string" || typeof w.productId !== "string" || typeof w.title !== "string") {
		return false;
	}

	const circle = w.circle as Record<string, unknown> | undefined;
	if (!circle || typeof circle.id !== "string") return false;

	const price = w.price as Record<string, unknown> | undefined;
	if (!price || typeof price.current !== "number") return false;

	return true;
};
