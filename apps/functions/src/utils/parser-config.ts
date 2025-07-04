/**
 * DLsiteパーサー設定管理システム
 *
 * パーサーのセレクター、フォールバックパターン、品質チェック設定を
 * 外部化して管理します。DLsite構造変更への対応力を向上させます。
 */

import type { WorkCategory } from "@suzumina.click/shared-types";
import * as logger from "./logger";

/**
 * セレクター設定
 */
export interface SelectorConfig {
	/** プライマリセレクター（最優先） */
	primary: string[];
	/** セカンダリセレクター（フォールバック） */
	secondary: string[];
	/** 部分一致セレクター（最後の手段） */
	fallback: string[];
	/** 最小マッチ成功率（これ以下で警告） */
	minSuccessRate: number;
}

/**
 * バリデーション設定
 */
export interface ValidationConfig {
	/** 必須フィールド */
	required: boolean;
	/** 最小文字数 */
	minLength?: number;
	/** 最大文字数 */
	maxLength?: number;
	/** 正規表現パターン */
	pattern?: RegExp;
	/** カスタムバリデーター */
	customValidator?: (value: string) => boolean;
}

/**
 * フィールド別パーサー設定
 */
export interface FieldParserConfig {
	/** セレクター設定 */
	selectors: SelectorConfig;
	/** バリデーション設定 */
	validation: ValidationConfig;
	/** デフォルト値 */
	defaultValue?: string | number;
	/** 抽出後の変換関数 */
	transformer?: (value: string) => string | number;
}

/**
 * パーサー設定全体
 */
export interface ParserConfig {
	/** 設定バージョン */
	version: string;
	/** 最終更新日時 */
	lastUpdated: string;
	/** アクティブ状態 */
	enabled: boolean;

	/** フィールド別設定 */
	fields: {
		productId: FieldParserConfig;
		title: FieldParserConfig;
		circle: FieldParserConfig;
		author: FieldParserConfig;
		category: FieldParserConfig;
		workUrl: FieldParserConfig;
		thumbnailUrl: FieldParserConfig;
		currentPrice: FieldParserConfig;
		originalPrice: FieldParserConfig;
		discount: FieldParserConfig;
		point: FieldParserConfig;
		stars: FieldParserConfig;
		ratingCount: FieldParserConfig;
		reviewCount: FieldParserConfig;
		salesCount: FieldParserConfig;
		ageRating: FieldParserConfig;
		tags: FieldParserConfig;
		description: FieldParserConfig;
	};

	/** カテゴリマッピング */
	categoryMapping: Record<string, WorkCategory>;

	/** 品質チェック設定 */
	qualityCheck: {
		/** 解析成功率の最小閾値 */
		minSuccessRate: number;
		/** アラート送信閾値 */
		alertThreshold: number;
		/** 自動フォールバック有効化 */
		autoFallback: boolean;
	};

	/** パフォーマンス設定 */
	performance: {
		/** タイムアウト時間（ミリ秒） */
		timeout: number;
		/** 最大リトライ回数 */
		maxRetries: number;
		/** リトライ間隔（ミリ秒） */
		retryDelay: number;
	};
}

/**
 * デフォルトパーサー設定
 */
export const DEFAULT_PARSER_CONFIG: ParserConfig = {
	version: "2025.07.03",
	lastUpdated: new Date().toISOString(),
	enabled: true,

	fields: {
		productId: {
			selectors: {
				primary: ["a[href*='/product_id/']"],
				secondary: ["[id*='product']", "[class*='product']"],
				fallback: ["a[href*='RJ']", "*:contains('RJ')"],
				minSuccessRate: 0.95,
			},
			validation: {
				required: true,
				pattern: /^RJ\d{6,8}$/,
				customValidator: (value: string) => value.length >= 8,
			},
		},

		title: {
			selectors: {
				primary: [".work_name a", ".product_title", ".work_title"],
				secondary: ["[title]", ".title", "h1", "h2"],
				fallback: ["*[class*='title']", "*[class*='name']"],
				minSuccessRate: 0.9,
			},
			validation: {
				required: true,
				minLength: 3,
				maxLength: 200,
			},
		},

		circle: {
			selectors: {
				primary: [".maker_name a", ".circle_name", ".author_name"],
				secondary: [".circle", ".maker", ".author"],
				fallback: ["a[href*='/circle/']", "*[class*='circle']"],
				minSuccessRate: 0.85,
			},
			validation: {
				required: true,
				minLength: 2,
				maxLength: 100,
			},
		},

		author: {
			selectors: {
				primary: [".author a", ".voice_actor", ".cv"],
				secondary: [".performer", ".cast"],
				fallback: ["*[class*='author']", "*[class*='voice']"],
				minSuccessRate: 0.7,
			},
			validation: {
				required: false,
				maxLength: 500,
			},
		},

		category: {
			selectors: {
				primary: [".work_category", ".product_category"],
				secondary: [".category", ".type"],
				fallback: ["*[class*='category']", "*[class*='type']"],
				minSuccessRate: 0.8,
			},
			validation: {
				required: true,
			},
		},

		workUrl: {
			selectors: {
				primary: ["a[href*='/product_id/']"],
				secondary: ["a[href*='/work/']", ".work_link"],
				fallback: ["a[href*='dlsite']"],
				minSuccessRate: 0.95,
			},
			validation: {
				required: true,
				pattern: /^https?:\/\//,
			},
		},

		thumbnailUrl: {
			selectors: {
				primary: ["img[src*='img_main']", ".work_thumb img", ".product_image img"],
				secondary: ["img[src*='dlsite']", ".thumbnail img"],
				fallback: ["img"],
				minSuccessRate: 0.8,
			},
			validation: {
				required: false,
				pattern: /\.(jpg|jpeg|png|webp)$/i,
			},
		},

		currentPrice: {
			selectors: {
				primary: [".work_price .work_price_parts", ".price", ".current_price"],
				secondary: [".cost", ".amount"],
				fallback: ["*[class*='price']", "*:contains('円')"],
				minSuccessRate: 0.9,
			},
			validation: {
				required: true,
				customValidator: (value: string) => !Number.isNaN(Number(value.replace(/[^\d]/g, ""))),
			},
			transformer: (value: string) => Number(value.replace(/[^\d]/g, "")),
		},

		originalPrice: {
			selectors: {
				primary: [".strike .work_price_parts", ".original_price"],
				secondary: [".old_price", ".before_price"],
				fallback: ["*[class*='original']", "*[class*='before']"],
				minSuccessRate: 0.3,
			},
			validation: {
				required: false,
			},
			transformer: (value: string) => Number(value.replace(/[^\d]/g, "")),
		},

		discount: {
			selectors: {
				primary: [".icon_lead_01.type_sale", ".discount", ".sale"],
				secondary: [".off", ".percent"],
				fallback: ["*:contains('%OFF')", "*:contains('割引')"],
				minSuccessRate: 0.2,
			},
			validation: {
				required: false,
			},
			transformer: (value: string) => {
				const match = value.match(/(\d+)%/);
				return match ? Number(match[1]) : 0;
			},
		},

		point: {
			selectors: {
				primary: [".work_point", ".point"],
				secondary: [".pt", ".points"],
				fallback: ["*:contains('pt')", "*:contains('ポイント')"],
				minSuccessRate: 0.5,
			},
			validation: {
				required: false,
			},
			transformer: (value: string) => {
				const match = value.match(/(\d+)pt/);
				return match ? Number(match[1]) : 0;
			},
		},

		stars: {
			selectors: {
				primary: [".star_rating", ".rating", ".stars"],
				secondary: [".score", ".evaluation"],
				fallback: ["*[class*='star']", "*[class*='rating']"],
				minSuccessRate: 0.6,
			},
			validation: {
				required: false,
			},
		},

		ratingCount: {
			selectors: {
				primary: [".star_rating", ".rating_count"],
				secondary: [".count", ".votes"],
				fallback: ["*:contains('(')"],
				minSuccessRate: 0.5,
			},
			validation: {
				required: false,
			},
		},

		reviewCount: {
			selectors: {
				primary: [".work_review a", ".review_count"],
				secondary: [".reviews", ".comments"],
				fallback: ["*[class*='review']"],
				minSuccessRate: 0.4,
			},
			validation: {
				required: false,
			},
		},

		salesCount: {
			selectors: {
				primary: ["._dl_count_", ".sales_count", ".download_count"],
				secondary: [".sales", ".downloads"],
				fallback: ["*[class*='dl_count']", "*[class*='sales']"],
				minSuccessRate: 0.3,
			},
			validation: {
				required: false,
			},
		},

		ageRating: {
			selectors: {
				primary: [".icon_GEN", ".icon_R15", ".icon_R18", ".age_rating"],
				secondary: [".rating", ".age"],
				fallback: ["*[class*='icon_']", "*[title*='年齢']"],
				minSuccessRate: 0.7,
			},
			validation: {
				required: false,
			},
		},

		tags: {
			selectors: {
				primary: [".search_tag a", ".tag_list a", ".tags a"],
				secondary: [".genre a", ".keywords a"],
				fallback: ["a[href*='tag=']", "a[href*='genre=']"],
				minSuccessRate: 0.6,
			},
			validation: {
				required: false,
			},
		},

		description: {
			selectors: {
				primary: [
					".work_parts_area .work_parts",
					".work_parts",
					".product_summary",
					".work_article",
				],
				secondary: [
					".work_outline .work_parts",
					".work_outline .description",
					".product_detail .description",
				],
				fallback: ["[class*='description']", "[class*='summary']", "[class*='story']", "p"],
				minSuccessRate: 0.7,
			},
			validation: {
				required: false,
				minLength: 10,
				maxLength: 5000,
			},
		},
	},

	categoryMapping: {
		type_ADV: "ADV",
		type_SOU: "SOU",
		type_RPG: "RPG",
		type_MOV: "MOV",
		type_MNG: "MNG",
		type_GAM: "GAM",
		type_CG: "CG",
		type_TOL: "TOL",
		type_ET3: "ET3",
		type_SLN: "SLN",
		type_ACN: "ACN",
		type_PZL: "PZL",
		type_QIZ: "QIZ",
		type_TBL: "TBL",
		type_DGT: "DGT",
	},

	qualityCheck: {
		minSuccessRate: 0.8,
		alertThreshold: 0.6,
		autoFallback: true,
	},

	performance: {
		timeout: 30000,
		maxRetries: 3,
		retryDelay: 1000,
	},
};

/**
 * パーサー設定管理クラス
 */
export class ParserConfigManager {
	private static instance: ParserConfigManager;
	private config: ParserConfig;
	private stats: Map<string, { success: number; total: number }> = new Map();

	private constructor() {
		this.config = { ...DEFAULT_PARSER_CONFIG };
		logger.info("ParserConfigManager初期化完了", {
			version: this.config.version,
			fieldsCount: Object.keys(this.config.fields).length,
		});
	}

	/**
	 * シングルトンインスタンスを取得
	 */
	public static getInstance(): ParserConfigManager {
		if (!ParserConfigManager.instance) {
			ParserConfigManager.instance = new ParserConfigManager();
		}
		return ParserConfigManager.instance;
	}

	/**
	 * 設定を取得
	 */
	public getConfig(): ParserConfig {
		return { ...this.config };
	}

	/**
	 * フィールド設定を取得
	 */
	public getFieldConfig(fieldName: keyof ParserConfig["fields"]): FieldParserConfig {
		return { ...this.config.fields[fieldName] };
	}

	/**
	 * カテゴリマッピングを取得
	 */
	public getCategoryMapping(): Record<string, WorkCategory> {
		return { ...this.config.categoryMapping };
	}

	/**
	 * 解析成功率を記録
	 */
	public recordParsingResult(fieldName: string, success: boolean): void {
		if (!this.stats.has(fieldName)) {
			this.stats.set(fieldName, { success: 0, total: 0 });
		}

		const stat = this.stats.get(fieldName);
		if (!stat) return;

		stat.total++;
		if (success) {
			stat.success++;
		}

		// 成功率チェック
		const successRate = stat.success / stat.total;
		const fieldConfig = this.config.fields[fieldName as keyof ParserConfig["fields"]];

		if (fieldConfig && successRate < fieldConfig.selectors.minSuccessRate) {
			logger.warn(`フィールド ${fieldName} の解析成功率が低下`, {
				fieldName,
				successRate: Math.round(successRate * 100),
				threshold: Math.round(fieldConfig.selectors.minSuccessRate * 100),
				totalAttempts: stat.total,
			});
		}
	}

	/**
	 * 統計情報を取得
	 */
	public getStats(): Record<string, { successRate: number; total: number }> {
		const result: Record<string, { successRate: number; total: number }> = {};

		for (const [fieldName, stat] of this.stats) {
			result[fieldName] = {
				successRate: stat.total > 0 ? stat.success / stat.total : 0,
				total: stat.total,
			};
		}

		return result;
	}

	/**
	 * 統計をリセット
	 */
	public resetStats(): void {
		this.stats.clear();
		logger.info("パーサー統計をリセットしました");
	}

	/**
	 * 設定を更新
	 */
	public updateConfig(newConfig: Partial<ParserConfig>): void {
		this.config = {
			...this.config,
			...newConfig,
			lastUpdated: new Date().toISOString(),
		};

		logger.info("パーサー設定を更新しました", {
			version: this.config.version,
			updatedFields: Object.keys(newConfig),
		});
	}

	/**
	 * 品質チェック実行
	 */
	public performQualityCheck(): {
		overall: number;
		fieldResults: Record<string, number>;
		recommendations: string[];
	} {
		const stats = this.getStats();
		const fieldResults: Record<string, number> = {};
		const recommendations: string[] = [];
		let totalSuccessRate = 0;
		let validFieldCount = 0;

		for (const [fieldName, stat] of Object.entries(stats)) {
			if (stat.total > 0) {
				fieldResults[fieldName] = stat.successRate;
				totalSuccessRate += stat.successRate;
				validFieldCount++;

				// フィールド別推奨事項
				if (stat.successRate < 0.5) {
					recommendations.push(`${fieldName}: セレクターの見直しが必要`);
				} else if (stat.successRate < 0.8) {
					recommendations.push(`${fieldName}: フォールバックセレクターの追加を検討`);
				}
			}
		}

		const overall = validFieldCount > 0 ? totalSuccessRate / validFieldCount : 0;

		// 全体的な推奨事項
		if (overall < this.config.qualityCheck.alertThreshold) {
			recommendations.push("DLsite構造の大幅な変更が疑われます");
			recommendations.push("設定の全面見直しを実施してください");
		}

		return {
			overall,
			fieldResults,
			recommendations,
		};
	}
}

/**
 * シングルトンインスタンスを取得するヘルパー関数
 */
export function getParserConfigManager(): ParserConfigManager {
	return ParserConfigManager.getInstance();
}

/**
 * フィールド設定を取得するヘルパー関数
 */
export function getFieldConfig(fieldName: keyof ParserConfig["fields"]): FieldParserConfig {
	return getParserConfigManager().getFieldConfig(fieldName);
}

/**
 * カテゴリマッピングを取得するヘルパー関数
 */
export function getCategoryMapping(): Record<string, WorkCategory> {
	return getParserConfigManager().getCategoryMapping();
}
