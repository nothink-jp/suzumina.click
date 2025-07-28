import type { DLsiteRawApiResponse, PriceHistoryDocument } from "@suzumina.click/shared-types";
import firestore from "../../infrastructure/database/firestore";
import { isValidPriceData } from "./price-extractor";

/**
 * JST（日本標準時）での現在日付を YYYY-MM-DD 形式で取得
 * @returns JST日付文字列
 */
function getJSTDate(): string {
	const jstDate = new Date(Date.now() + 9 * 60 * 60 * 1000); // UTC + 9時間
	return jstDate.toISOString().split("T")[0] as string;
}

/**
 * JST（日本標準時）での現在日時を ISO文字列で取得
 * @returns JST日時のISO文字列
 */
function getJSTDateTime(): string {
	const jstDate = new Date(Date.now() + 9 * 60 * 60 * 1000); // UTC + 9時間
	return jstDate.toISOString();
}

/**
 * 価格履歴データをサブコレクションに保存
 * @param workId 作品ID
 * @param apiResponse Individual Info APIレスポンス
 * @returns 保存成功可否
 */
export async function savePriceHistory(
	workId: string,
	apiResponse: DLsiteRawApiResponse,
): Promise<boolean> {
	try {
		// worknoが存在しない場合は保存しない
		if (!apiResponse.workno) {
			return false;
		}

		// 価格データの有効性を確認（欠損値も許可）
		const hasValidPriceData = isValidPriceData(apiResponse);

		// データがない場合でも日付のエントリを作成（欠損値として記録）

		// JST（日本標準時）での日付を取得
		const today = getJSTDate();

		// サブコレクション参照
		const priceHistoryRef = firestore
			.collection("dlsiteWorks")
			.doc(workId)
			.collection("priceHistory")
			.doc(today as string);

		// 既存データ確認（重複保存防止）
		const existingDoc = await priceHistoryRef.get();
		if (existingDoc.exists) {
			// 既にデータが存在する場合はスキップ
			return true;
		}

		// locale_price/locale_official_priceを正規化（配列の場合はオブジェクトに変換）
		const normalizeLocalePrice = (
			localePrice?: Record<string, number> | Array<{ currency: string; price: number }>,
		): Record<string, number> => {
			if (!localePrice) return {};
			if (Array.isArray(localePrice)) {
				return localePrice.reduce(
					(acc, item) => {
						acc[item.currency] = item.price;
						return acc;
					},
					{} as Record<string, number>,
				);
			}
			return localePrice;
		};

		// 価格データを構築（欠損値の場合はnullを設定）
		const priceData: PriceHistoryDocument = {
			workId: workId as string,
			date: today as string,
			capturedAt: getJSTDateTime(), // JST時刻

			// 日本円価格（データがない場合はnull）
			price: hasValidPriceData ? (apiResponse.price ?? null) : null,
			officialPrice: hasValidPriceData ? (apiResponse.official_price ?? null) : null,

			// 国際価格（データがない場合は空のオブジェクト）
			localePrice: hasValidPriceData ? normalizeLocalePrice(apiResponse.locale_price) : {},
			localeOfficialPrice: hasValidPriceData
				? normalizeLocalePrice(apiResponse.locale_official_price)
				: {},

			// 割引情報
			discountRate: hasValidPriceData ? apiResponse.discount_rate || 0 : 0,
			campaignId:
				hasValidPriceData && apiResponse.campaign?.campaign_id
					? Number(apiResponse.campaign.campaign_id)
					: undefined,
		};

		// Firestoreに保存
		await priceHistoryRef.set(priceData);

		return true;
	} catch (_error) {
		return false;
	}
}

/**
 * 複数作品の価格履歴を並列保存
 * @param workPriceMap 作品ID -> APIレスポンスのマップ
 * @returns 保存結果の統計情報
 */
export async function saveBulkPriceHistory(
	workPriceMap: Map<string, DLsiteRawApiResponse>,
): Promise<{
	total: number;
	success: number;
	failed: number;
	failedWorkIds: string[];
}> {
	const total = workPriceMap.size;
	let success = 0;
	const failedWorkIds: string[] = [];

	// Promise.allSettledで並列実行（エラー耐性）
	const results = await Promise.allSettled(
		Array.from(workPriceMap.entries()).map(async ([workId, apiResponse]) => {
			const result = await savePriceHistory(workId, apiResponse);
			return { workId, success: result };
		}),
	);

	// 結果集計
	for (const result of results) {
		if (result.status === "fulfilled") {
			if (result.value.success) {
				success++;
			} else {
				failedWorkIds.push(result.value.workId);
			}
		} else {
			failedWorkIds.push("unknown");
		}
	}

	const failed = total - success;

	// 価格履歴一括保存完了ログは省略（成功時ログ削減）

	return {
		total,
		success,
		failed,
		failedWorkIds,
	};
}
