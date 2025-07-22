import type { PriceHistoryDocument } from "@suzumina.click/shared-types";
import firestore from "../../infrastructure/database/firestore";
import type { IndividualInfoAPIResponse } from "../dlsite/individual-info-to-work-mapper";
import { analyzePriceChanges } from "./price-change-detector";
import { extractJPYPrice, isValidPriceData } from "./price-extractor";

/**
 * JST（日本標準時）での現在日付を YYYY-MM-DD 形式で取得
 * @returns JST日付文字列
 */
function getJSTDate(): string {
	const jstDate = new Date(new Date().getTime() + 9 * 60 * 60 * 1000); // UTC + 9時間
	return jstDate.toISOString().split("T")[0] as string;
}

/**
 * JST（日本標準時）での現在日時を ISO文字列で取得
 * @returns JST日時のISO文字列
 */
function getJSTDateTime(): string {
	const jstDate = new Date(new Date().getTime() + 9 * 60 * 60 * 1000); // UTC + 9時間
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
	apiResponse: IndividualInfoAPIResponse,
): Promise<boolean> {
	try {
		// worknoが存在しない場合は保存しない
		if (!apiResponse.workno) {
			console.warn(`Missing workno for work ${workId}`);
			return false;
		}

		// データ検証
		if (!isValidPriceData(apiResponse)) {
			console.warn(`Invalid price data for work ${workId}:`, {
				workno: apiResponse.workno,
				hasPrice: !!apiResponse.price,
				hasLocalePrices: !!apiResponse.locale_price?.length,
				priceValue: apiResponse.price,
				localePricesCount: apiResponse.locale_price?.length || 0,
			});
			return false;
		}

		// 価格データ有効性確認ログは省略（成功時ログ削減）

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
		const isFirstRecordToday = !existingDoc.exists;

		// 価格変動分析
		const priceAnalysis = isFirstRecordToday
			? { priceChanged: false, newCampaign: false }
			: await analyzePriceChanges(workId as string, today as string, apiResponse);

		// 価格データ構築
		const regularPrice = extractJPYPrice(apiResponse, "regular");
		const discountPrice = extractJPYPrice(apiResponse, "discount");
		const discountRate = apiResponse.discount_rate || 0;

		// locale_price を LocalePrice 形式に変換
		// locale_priceを LocalePrice 配列形式に変換（配列/オブジェクト両対応）
		let localePrices: Array<{ currency: string; price: number; priceString: string }> = [];

		if (Array.isArray(apiResponse.locale_price)) {
			// 配列の場合はそのまま使用
			localePrices = apiResponse.locale_price;
		} else if (typeof apiResponse.locale_price === "object" && apiResponse.locale_price !== null) {
			// オブジェクトの場合は配列に変換
			const localePriceObj = apiResponse.locale_price as Record<string, number>;
			localePrices = Object.entries(localePriceObj).map(([currencyCode, price]) => ({
				currency: currencyCode,
				price: price,
				priceString: `${price} ${currencyCode}`,
			}));
		}

		const priceData: PriceHistoryDocument = {
			workId: workId as string,
			date: today as string,
			capturedAt: getJSTDateTime(), // JST時刻

			// 変換された多通貨価格データ
			localePrices,

			// JPY価格サマリー（表示用）
			regularPrice,
			discountPrice: discountRate > 0 ? discountPrice : undefined,
			discountRate,
			campaignId: apiResponse.campaign?.campaign_id,

			// 価格変動検出結果
			priceChanged: priceAnalysis.priceChanged,
			newCampaign: priceAnalysis.newCampaign,

			// メタデータ
			dataSource: "individual_api",
			apiCallCount: 1,
			collectionVersion: "1.0",
		};

		// Firestoreに保存（Merge対応）
		await priceHistoryRef.set(priceData, { merge: true });

		// 価格変動・新キャンペーンの場合のみログ出力
		if (priceAnalysis.priceChanged || priceAnalysis.newCampaign) {
			console.log(`Price event detected for ${workId}:`, {
				date: today,
				priceChanged: priceAnalysis.priceChanged,
				newCampaign: priceAnalysis.newCampaign,
				regularPrice,
				discountRate,
			});
		}

		return true;
	} catch (error) {
		console.error(`Failed to save price history for work ${workId}:`, error);
		return false;
	}
}

/**
 * 複数作品の価格履歴を並列保存
 * @param workPriceMap 作品ID -> APIレスポンスのマップ
 * @returns 保存結果の統計情報
 */
export async function saveBulkPriceHistory(
	workPriceMap: Map<string, IndividualInfoAPIResponse>,
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
			// Promise自体が失敗した場合
			console.error("Price history save promise failed:", result.reason);
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

/**
 * 古い価格履歴データのクリーンアップ（全履歴保持のため無効化）
 * この関数は後方互換性のため残していますが、実際には呼び出されません
 * 将来的に保持期間ポリシーが変更された場合に備えて実装を保持
 */
export async function cleanupOldPriceHistory(workId: string, retentionDays: number): Promise<void> {
	// 全履歴保持のため、実際の削除処理はスキップ
	console.log(`Price history cleanup skipped: preserving all historical data for ${workId}`);
	return;

	/* 元の実装（参考のため保持）
	try {
		const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
			.toISOString()
			.split('T')[0];
		
		const oldDocsQuery = firestore
			.collection('dlsiteWorks')
			.doc(workId)
			.collection('priceHistory')
			.where('date', '<', cutoffDate);
		
		const snapshot = await oldDocsQuery.get();
		const batch = firestore.batch();
		
		snapshot.docs.forEach(doc => batch.delete(doc.ref));
		
		if (snapshot.docs.length > 0) {
			await batch.commit();
			console.log(`Cleaned up ${snapshot.docs.length} old price history records for ${workId}`);
		}
	} catch (error) {
		console.error(`Failed to cleanup old price history for ${workId}:`, error);
	}
	*/
}
