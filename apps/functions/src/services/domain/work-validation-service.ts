import type { DateRange, Price, Rating } from "@suzumina.click/shared-types";

/**
 * Work Validation Service
 *
 * DLsite作品の検証ロジックを集約したドメインサービス
 */
export class WorkValidationService {
	/**
	 * 作品IDの形式を検証
	 */
	static isValidWorkId(workId: string): boolean {
		return /^RJ\d{8}$/.test(workId);
	}

	/**
	 * サークルIDの形式を検証
	 */
	static isValidCircleId(circleId: string): boolean {
		return /^RG\d+$/.test(circleId);
	}

	/**
	 * 価格の妥当性を検証
	 */
	static validatePrice(price: Price): ValidationResult {
		const errors: string[] = [];

		// 無料作品の検証
		if (price.isFree() && price.original) {
			errors.push("無料作品には元価格を設定できません");
		}

		// 割引率の検証
		if (price.discount !== undefined) {
			if (price.discount < 0 || price.discount > 100) {
				errors.push("割引率は0〜100%の範囲で設定する必要があります");
			}

			// 実効割引率との整合性チェック
			const effectiveRate = price.effectiveDiscountRate();
			if (Math.abs(effectiveRate - price.discount) > 1) {
				errors.push("設定された割引率と実効割引率に差異があります");
			}
		}

		// 通貨の検証
		const validCurrencies = ["JPY", "USD", "EUR", "CNY", "TWD", "KRW"];
		if (!validCurrencies.includes(price.currency)) {
			errors.push(`サポートされていない通貨: ${price.currency}`);
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * 価格履歴の妥当性を検証
	 */
	static validatePriceHistory(prices: Price[]): ValidationResult {
		const errors: string[] = [];

		if (prices.length === 0) {
			return { isValid: true, errors: [] };
		}

		// 通貨の一貫性チェック
		const currencies = new Set(prices.map((p) => p.currency));
		if (currencies.size > 1) {
			errors.push("価格履歴内で複数の通貨が混在しています");
		}

		// 異常な価格変動の検出（前日比50%以上の変動）
		for (let i = 1; i < prices.length; i++) {
			const prev = prices[i - 1];
			const curr = prices[i];
			if (prev && curr && prev.amount > 0) {
				const changeRate = Math.abs(((curr.amount - prev.amount) / prev.amount) * 100);

				if (changeRate > 50) {
					errors.push(`異常な価格変動を検出: ${changeRate.toFixed(1)}%`);
				}
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * 評価の妥当性を検証
	 */
	static validateRating(rating: Rating): ValidationResult {
		const errors: string[] = [];

		// 評価数と平均の整合性
		if (rating.count === 0 && rating.average > 0) {
			errors.push("評価数が0の場合、平均評価は0である必要があります");
		}

		// 分布データの整合性チェック
		if (rating.distribution) {
			const totalFromDist = Object.values(rating.distribution).reduce(
				(sum, count) => sum + count,
				0,
			);
			if (totalFromDist !== rating.count) {
				errors.push("評価分布の合計と評価数が一致しません");
			}
		}

		// 星数の範囲チェック
		if (rating.stars < 0 || rating.stars > 5) {
			errors.push("評価は0〜5の範囲で設定する必要があります");
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * リリース日の妥当性を検証
	 */
	static validateReleaseDate(dateRange: DateRange): ValidationResult {
		const errors: string[] = [];
		const releaseDate = dateRange.toDate();
		const now = new Date();

		// 未来の日付チェック
		if (releaseDate > now) {
			errors.push("リリース日が未来の日付になっています");
		}

		// 異常に古い日付チェック（DLsite開設前）
		const dlsiteStartDate = new Date("1996-01-01");
		if (releaseDate < dlsiteStartDate) {
			errors.push("リリース日がDLsite開設前の日付になっています");
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * 作品データ全体の整合性を検証
	 */
	static validateWorkData(work: {
		id: string;
		price?: Price;
		rating?: Rating;
		releaseDate?: DateRange;
	}): ValidationResult {
		const errors: string[] = [];

		// ID検証
		if (!WorkValidationService.isValidWorkId(work.id)) {
			errors.push(`無効な作品ID形式: ${work.id}`);
		}

		// 価格検証
		if (work.price) {
			const priceResult = WorkValidationService.validatePrice(work.price);
			errors.push(...priceResult.errors);
		}

		// 評価検証
		if (work.rating) {
			const ratingResult = WorkValidationService.validateRating(work.rating);
			errors.push(...ratingResult.errors);
		}

		// リリース日検証
		if (work.releaseDate) {
			const dateResult = WorkValidationService.validateReleaseDate(work.releaseDate);
			errors.push(...dateResult.errors);
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}
}

/**
 * 検証結果の型定義
 */
export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

/**
 * 作品IDリスト検証結果
 */
export interface WorkIdListValidationResult extends ValidationResult {
	validIds: string[];
	invalidIds: string[];
	duplicateIds: string[];
}
