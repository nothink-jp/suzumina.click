/**
 * 価格履歴保存サービス（改善版）
 * 既存データがある場合でも、より低い価格の場合は更新する
 */

import type { DLsiteApiResponse, PriceHistoryDocument } from "@suzumina.click/shared-types";
import firestore from "../../infrastructure/database/firestore";
import { isValidPriceData } from "./price-extractor";

/**
 * JST（日本標準時）での現在日付を YYYY-MM-DD 形式で取得
 * @returns JST日付文字列
 */
function getJSTDate(): string {
	const now = new Date();
	const jstDateStr = now.toLocaleString("ja-JP", {
		timeZone: "Asia/Tokyo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	const [year, month, day] = jstDateStr.split("/");
	if (!year || !month || !day) {
		throw new Error(`Invalid date format: ${jstDateStr}`);
	}
	return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * JST（日本標準時）での現在日時を ISO文字列で取得
 * @returns JST日時のISO文字列
 */
function getJSTDateTime(): string {
	const now = new Date();
	const jstDateStr = now.toLocaleString("ja-JP", {
		timeZone: "Asia/Tokyo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
	const [datePart, timePart] = jstDateStr.split(" ");
	if (!datePart || !timePart) {
		throw new Error(`Invalid datetime format: ${jstDateStr}`);
	}
	const [year, month, day] = datePart.split("/");
	if (!year || !month || !day) {
		throw new Error(`Invalid date format: ${datePart}`);
	}
	return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${timePart}.000+09:00`;
}

/**
 * 価格履歴データをサブコレクションに保存（改善版）
 * @param workId 作品ID
 * @param apiResponse Individual Info APIレスポンス
 * @returns 保存成功可否
 */
export async function savePriceHistoryV2(
	workId: string,
	apiResponse: DLsiteApiResponse,
): Promise<boolean> {
	try {
		// worknoが存在しない場合は保存しない
		if (!apiResponse.workno) {
			console.log(`価格履歴保存スキップ: ${workId} - worknoが存在しません`);
			return false;
		}

		// 価格データの有効性を確認（欠損値も許可）
		const hasValidPriceData = isValidPriceData(apiResponse);

		// JST（日本標準時）での日付を取得
		const today = getJSTDate();

		// サブコレクション参照
		const priceHistoryRef = firestore
			.collection("works")
			.doc(workId)
			.collection("priceHistory")
			.doc(today as string);

		// 既存データ確認
		const existingDoc = await priceHistoryRef.get();

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

		// 新しい価格データを構築
		const newPriceData: PriceHistoryDocument = {
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

		if (existingDoc.exists) {
			const existingData = existingDoc.data() as PriceHistoryDocument;

			// 既存データと新規データの価格を比較
			const existingPrice = existingData.price;
			const newPrice = newPriceData.price;

			// より低い価格が検出された場合、または既存価格がnullの場合は更新
			if (newPrice !== null && (existingPrice === null || newPrice < existingPrice)) {
				console.log(`価格更新検出: ${workId} - ${today}`);
				console.log(`既存価格: ${existingPrice ?? "null"} → 新価格: ${newPrice}`);
				console.log(`既存データの保存時刻: ${existingData.capturedAt}`);
				console.log(`新規データの保存時刻: ${newPriceData.capturedAt}`);

				// より低い価格で更新
				await priceHistoryRef.set(newPriceData);
				console.log(`価格履歴更新成功: ${workId} - ${today} (最低価格更新)`);
				return true;
			}
			console.log(`価格履歴保存スキップ: ${workId} - ${today}のデータが既に存在し、価格変更なし`);
			console.log(`既存価格: ${existingPrice ?? "null"}, 新価格: ${newPrice ?? "null"}`);
			return true;
		}
		// 新規保存
		await priceHistoryRef.set(newPriceData);
		console.log(`価格履歴保存成功: ${workId} - ${today} (新規)`);
		return true;
	} catch (error) {
		console.error(`価格履歴保存エラー: ${workId}`, error);
		return false;
	}
}

/**
 * 複数作品の価格履歴を並列保存（改善版）
 * @param workPriceMap 作品ID -> APIレスポンスのマップ
 * @returns 保存結果の統計情報
 */
export async function saveBulkPriceHistoryV2(
	workPriceMap: Map<string, DLsiteApiResponse>,
): Promise<{
	total: number;
	success: number;
	failed: number;
	failedWorkIds: string[];
	updated: number; // 既存データを更新した件数
}> {
	const total = workPriceMap.size;
	let success = 0;
	const updated = 0;
	const failedWorkIds: string[] = [];

	// Promise.allSettledで並列実行（エラー耐性）
	const results = await Promise.allSettled(
		Array.from(workPriceMap.entries()).map(async ([workId, apiResponse]) => {
			const result = await savePriceHistoryV2(workId, apiResponse);
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

	return {
		total,
		success,
		failed,
		failedWorkIds,
		updated, // TODO: 更新件数のカウント実装
	};
}
