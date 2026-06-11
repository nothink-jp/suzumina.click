import type { WorkPlainObject } from "@suzumina.click/shared-types";

export interface WorkPriceInfo {
	currentPrice: number;
	/** セール中のみ定義（割り消し表示用の元値） */
	originalPrice: number | undefined;
	isOnSale: boolean;
	/** セール中のみ定義（current/original から算出した割引率 %） */
	discountRate: number | undefined;
}

/**
 * 作品価格の表示情報を算出する（一覧カード・詳細ページ共通の正本）。
 *
 * セール判定・割引率は「実割引（current < original）」= `price.isDiscounted` と
 * current/original からの算出のみを正本とする。Firestore の `price.discount` フィールドは
 * セール終了後も古い値が残りうる（sticky）うえ、original あり・discount 未設定の値下げで
 * 数値なしの「% OFF」を生むため、**判定にも表示にも使わない**（軸3: 正本の整合性）。
 *
 * @param price WorkPlainObject の price
 */
export function calculatePriceInfo(price: WorkPlainObject["price"] | undefined): WorkPriceInfo {
	// price 欠落時は ¥0・非セール扱いにフォールバック（一覧カードの防御的挙動を踏襲）
	const currentPrice = price?.current ?? 0;
	const isOnSale = price?.isDiscounted ?? false;
	const originalPrice = isOnSale ? price?.original : undefined;
	const discountRate =
		isOnSale && originalPrice
			? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
			: undefined;

	return { currentPrice, originalPrice, isOnSale, discountRate };
}
