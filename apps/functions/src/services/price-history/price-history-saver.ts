import type { DLsiteApiResponse, PriceHistoryDocument } from "@suzumina.click/shared-types";
import firestore from "../../infrastructure/database/firestore";
import { chunkArray } from "../../shared/array-utils";
import * as logger from "../../shared/logger";
import { isValidPriceData } from "./price-extractor";

/** priceHistory 存在確認のバルク読み取り（getAll）を分割するチャンクサイズ */
const PRICE_HISTORY_EXISTS_CHUNK_SIZE = 300;

/**
 * JST（日本標準時）での現在日付を YYYY-MM-DD 形式で取得
 * @returns JST日付文字列
 */
export function getJSTDate(): string {
	// 現在のUTC時刻を取得
	const now = new Date();
	// toLocaleStringでJSTの日付を取得
	const jstDateStr = now.toLocaleString("ja-JP", {
		timeZone: "Asia/Tokyo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	// YYYY/MM/DD形式をYYYY-MM-DD形式に変換
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
	// 現在のUTC時刻を取得
	const now = new Date();
	// JSTでフォーマット
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
	// YYYY/MM/DD HH:mm:ss形式をISO形式に変換
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
 * 価格履歴データをサブコレクションに保存
 * @param workId 作品ID
 * @param apiResponse Individual Info APIレスポンス
 * @returns 保存成功可否
 */
export async function savePriceHistory(
	workId: string,
	apiResponse: DLsiteApiResponse,
): Promise<boolean> {
	try {
		// worknoが存在しない場合は保存しない
		if (!apiResponse.workno) {
			logger.debug(`価格履歴保存スキップ: ${workId} - worknoが存在しません`);
			return false;
		}

		// 価格データの有効性を確認（欠損値も許可）
		const hasValidPriceData = isValidPriceData(apiResponse);

		// データがない場合でも日付のエントリを作成（欠損値として記録）

		// JST（日本標準時）での日付を取得
		const today = getJSTDate();

		// サブコレクション参照
		const priceHistoryRef = firestore
			.collection("works")
			.doc(workId)
			.collection("priceHistory")
			.doc(today as string);

		// 既存データ確認（重複保存防止）
		const existingDoc = await priceHistoryRef.get();
		if (existingDoc.exists) {
			// 既にデータが存在する場合はスキップ
			const existingData = existingDoc.data() as PriceHistoryDocument;
			logger.debug(`価格履歴保存スキップ: ${workId} - ${today}のデータが既に存在します`);
			logger.debug(`既存データの保存時刻: ${existingData.capturedAt}`);
			logger.debug(`現在のJST時刻: ${getJSTDateTime()}`);
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
		logger.info(`価格履歴保存成功: ${workId} - ${today}`);

		return true;
	} catch (error) {
		logger.error(`価格履歴保存エラー: ${workId}`, error);
		return false;
	}
}

/**
 * 指定した作品IDのうち、当日分(`today`)の priceHistory ドキュメントが
 * 既に存在する作品IDの集合をバルクで確認する（SPR-229 Stage②）。
 *
 * `savePriceHistory` 内の重複防止チェック（既存データ確認）と同じ判定を、
 * DLsite API呼び出しの**前段**でstableティア候補にだけ行うことで、
 * 変化していないと分かっている作品のAPI呼び出しをスキップできるようにする。
 *
 * read総数について（レビュー指摘を受けて明記）: stable-skip判定された作品（多数派）は
 * このバルク読み取りが`savePriceHistory`内の個別読み取りをまるごと置き換えるため
 * read総数は実質不変。一方、stable-due判定された作品（当日分が無く実際に取得する少数派）は
 * このバルク読み取りに加えて`savePriceHistory`内の個別重複チェックも従来通り実行されるため、
 * その件数分だけreadが純増する（`savePriceHistory`側の重複防止チェックはこの関数からは
 * 削除していない）。「新規readは発生しない」は無条件には成立しないが、stable-dueは通常
 * 少数のため実害は小さい。
 *
 * @param workIds 確認対象の作品ID（stable候補のみに絞って渡す想定）
 * @param today JST暦日文字列（`getJSTDate()`の結果）
 * @returns 当日分が既に存在する作品IDの集合
 */
export async function bulkCheckPriceHistoryExistsToday(
	workIds: string[],
	today: string,
): Promise<Set<string>> {
	const existsWorkIds = new Set<string>();
	if (workIds.length === 0) {
		return existsWorkIds;
	}

	const refs = workIds.map((workId) =>
		firestore.collection("works").doc(workId).collection("priceHistory").doc(today),
	);
	const chunks = chunkArray(refs, PRICE_HISTORY_EXISTS_CHUNK_SIZE);

	const chunkResults = await Promise.all(chunks.map((chunk) => firestore.getAll(...chunk)));

	for (const docs of chunkResults) {
		for (const doc of docs) {
			if (doc.exists) {
				const workId = doc.ref.parent.parent?.id;
				if (workId) {
					existsWorkIds.add(workId);
				}
			}
		}
	}

	return existsWorkIds;
}
