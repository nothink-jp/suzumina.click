/**
 * 価格履歴サービス
 * DLsite作品の価格履歴データをサブコレクション方式で管理
 */

export {
	analyzePriceChanges,
	detectNewCampaign,
	detectPriceChange,
} from "./price-change-detector";

export {
	calculateLowestPrice,
	extractJPYPrice,
	isOnSale,
	isValidPriceData,
} from "./price-extractor";
export {
	cleanupOldPriceHistory,
	saveBulkPriceHistory,
	savePriceHistory,
} from "./price-history-saver";
