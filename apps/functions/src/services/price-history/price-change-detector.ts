import type { DLsiteRawApiResponse, PriceHistoryDocument } from "@suzumina.click/shared-types";
import firestore from "../../infrastructure/database/firestore";
import { extractJPYPrice } from "./price-extractor";

/**
 * 前日からの価格変更を検出
 * @param workId 作品ID
 * @param currentDate 現在の日付（YYYY-MM-DD）
 * @param currentData 現在のAPIレスポンス
 * @returns 価格変更があったかどうか
 */
export async function detectPriceChange(
	workId: string,
	currentDate: string,
	currentData: DLsiteRawApiResponse,
): Promise<boolean> {
	// worknoが存在しない場合は変更なしとする
	if (!currentData.workno) {
		return false;
	}
	try {
		// 前日の日付を計算（currentDateはJST基準の日付文字列）
		const currentDateObj = new Date(`${currentDate}T00:00:00Z`);
		const yesterdayObj = new Date(currentDateObj.getTime() - 24 * 60 * 60 * 1000);
		const yesterday = yesterdayObj.toISOString().split("T")[0];

		// 前日のデータを取得
		const yesterdayDocRef = firestore
			.collection("dlsiteWorks")
			.doc(workId)
			.collection("priceHistory")
			.doc(yesterday as string);

		const yesterdayDoc = await yesterdayDocRef.get();

		if (!yesterdayDoc.exists) {
			// 前日のデータがない場合は変更なしとする
			return false;
		}

		const yesterdayData = yesterdayDoc.data() as PriceHistoryDocument;
		const currentPrice = extractJPYPrice(currentData, "regular");

		// 価格差が1円以上の場合は変更ありとする
		return Math.abs(yesterdayData.regularPrice - currentPrice) >= 1;
	} catch (_error) {
		// エラー時は変更なしとして扱う
		return false;
	}
}

/**
 * 新しいキャンペーンの開始を検出
 * @param workId 作品ID
 * @param currentDate 現在の日付（YYYY-MM-DD）
 * @param currentData 現在のAPIレスポンス
 * @returns 新しいキャンペーンが開始されたかどうか
 */
export async function detectNewCampaign(
	workId: string,
	currentDate: string,
	currentData: DLsiteRawApiResponse,
): Promise<boolean> {
	// worknoが存在しない場合は新しいキャンペーンなしとする
	if (!currentData.workno) {
		return false;
	}
	try {
		// 前日の日付を計算（currentDateはJST基準の日付文字列）
		const currentDateObj = new Date(`${currentDate}T00:00:00Z`);
		const yesterdayObj = new Date(currentDateObj.getTime() - 24 * 60 * 60 * 1000);
		const yesterday = yesterdayObj.toISOString().split("T")[0];

		// 前日のデータを取得
		const yesterdayDocRef = firestore
			.collection("dlsiteWorks")
			.doc(workId)
			.collection("priceHistory")
			.doc(yesterday as string);

		const yesterdayDoc = await yesterdayDocRef.get();

		if (!yesterdayDoc.exists) {
			// 前日のデータがない場合
			// 現在キャンペーン中なら新しいキャンペーン開始とする
			return currentData.campaign?.campaign_id != null;
		}

		const yesterdayData = yesterdayDoc.data() as PriceHistoryDocument;
		const currentCampaignId = currentData.campaign?.campaign_id;

		// キャンペーンIDが変更され、かつ現在キャンペーン中の場合は新しいキャンペーン開始
		return currentCampaignId != null && Number(currentCampaignId) !== yesterdayData.campaignId;
	} catch (_error) {
		// エラー時は新しいキャンペーンなしとして扱う
		return false;
	}
}

/**
 * 価格変動の分析情報を取得
 * @param workId 作品ID
 * @param currentDate 現在の日付（YYYY-MM-DD）
 * @param currentData 現在のAPIレスポンス
 * @returns 価格変動分析情報
 */
export async function analyzePriceChanges(
	workId: string,
	currentDate: string,
	currentData: DLsiteRawApiResponse,
): Promise<{
	priceChanged: boolean;
	newCampaign: boolean;
	previousPrice?: number;
	priceDirection?: "up" | "down" | "same";
}> {
	// worknoが存在しない場合は変更なしとする
	if (!currentData.workno) {
		return {
			priceChanged: false,
			newCampaign: false,
		};
	}
	try {
		const [priceChanged, newCampaign] = await Promise.all([
			detectPriceChange(workId, currentDate, currentData),
			detectNewCampaign(workId, currentDate, currentData),
		]);

		// 前日の価格を取得（価格変動方向の判定用）
		let previousPrice: number | undefined;
		let priceDirection: "up" | "down" | "same" | undefined;

		if (priceChanged) {
			// 前日の日付を計算（価格変動方向の判定用）
			const currentDateObj = new Date(`${currentDate}T00:00:00Z`);
			const yesterdayObj = new Date(currentDateObj.getTime() - 24 * 60 * 60 * 1000);
			const yesterday = yesterdayObj.toISOString().split("T")[0];

			const yesterdayDocRef = firestore
				.collection("dlsiteWorks")
				.doc(workId)
				.collection("priceHistory")
				.doc(yesterday as string);

			const yesterdayDoc = await yesterdayDocRef.get();

			if (yesterdayDoc.exists) {
				const yesterdayData = yesterdayDoc.data() as PriceHistoryDocument;
				previousPrice = yesterdayData.regularPrice;

				const currentPrice = extractJPYPrice(currentData, "regular");
				if (previousPrice !== undefined) {
					if (currentPrice > previousPrice) {
						priceDirection = "up";
					} else if (currentPrice < previousPrice) {
						priceDirection = "down";
					} else {
						priceDirection = "same";
					}
				}
			}
		}

		return {
			priceChanged,
			newCampaign,
			previousPrice,
			priceDirection,
		};
	} catch (_error) {
		return {
			priceChanged: false,
			newCampaign: false,
		};
	}
}
