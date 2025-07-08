/**
 * DLsite作品ID検証ユーティリティ
 * リージョン差異を考慮した柔軟な検証機能を提供
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as logger from "../../shared/logger";

interface WorkIdValidationResult {
	isValid: boolean;
	totalExpected: number;
	totalFound: number;
	coveragePercentage: number;
	missingCount: number;
	extraCount: number;
	regionWarning: boolean;
	details: {
		expectedButNotFound: string[];
		foundButNotExpected: string[];
	};
}

/**
 * 開発環境で収集した作品IDリストを読み込む
 */
function loadExpectedWorkIds(): Set<string> {
	try {
		// Cloud Functionsの実行環境でのパスを想定
		const possiblePaths = [
			join(process.cwd(), "src/assets/dlsite-work-ids.json"),
			join(process.cwd(), "lib/assets/dlsite-work-ids.json"),
			join(__dirname, "../../assets/dlsite-work-ids.json"),
		];

		for (const filePath of possiblePaths) {
			try {
				const data = JSON.parse(readFileSync(filePath, "utf-8"));
				return new Set(data.workIds);
			} catch {
				// 次のパスを試行
			}
		}

		throw new Error("作品IDリストファイルが見つかりません");
	} catch (error) {
		logger.warn("作品IDリストファイルが読み込めませんでした。検証をスキップします。", { error });
		return new Set();
	}
}

/**
 * 作品IDリストを検証する
 * @param foundWorkIds 実際に取得された作品IDのリスト
 * @param options 検証オプション
 */
export function validateWorkIds(
	foundWorkIds: string[],
	options: {
		minCoveragePercentage?: number; // 最小カバレッジ率（デフォルト: 80%）
		maxExtraPercentage?: number; // 許容する追加作品の最大割合（デフォルト: 20%）
		logDetails?: boolean; // 詳細ログを出力するか（デフォルト: false）
	} = {},
): WorkIdValidationResult {
	const { minCoveragePercentage = 80, maxExtraPercentage = 20, logDetails = false } = options;

	const expectedIds = loadExpectedWorkIds();
	if (expectedIds.size === 0) {
		// リストが読み込めない場合は検証をスキップ
		return {
			isValid: true,
			totalExpected: 0,
			totalFound: foundWorkIds.length,
			coveragePercentage: 100,
			missingCount: 0,
			extraCount: 0,
			regionWarning: false,
			details: {
				expectedButNotFound: [],
				foundButNotExpected: [],
			},
		};
	}

	const foundIds = new Set(foundWorkIds);

	// 期待されているが見つからなかったID
	const expectedButNotFound = Array.from(expectedIds).filter((id) => !foundIds.has(id));

	// 見つかったが期待されていなかったID
	const foundButNotExpected = foundWorkIds.filter((id) => !expectedIds.has(id));

	// カバレッジ率の計算
	const coveragePercentage =
		((foundIds.size - foundButNotExpected.length) / expectedIds.size) * 100;

	// 追加作品の割合
	const extraPercentage = (foundButNotExpected.length / foundWorkIds.length) * 100;

	// リージョン差異の可能性を判定
	const regionWarning =
		expectedButNotFound.length > 10 || foundButNotExpected.length > 10 || coveragePercentage < 90;

	// 検証結果の判定
	const isValid =
		coveragePercentage >= minCoveragePercentage && extraPercentage <= maxExtraPercentage;

	// ログ出力
	if (regionWarning) {
		logger.warn("⚠️ リージョン差異の可能性があります", {
			coveragePercentage: Math.round(coveragePercentage),
			missingCount: expectedButNotFound.length,
			extraCount: foundButNotExpected.length,
		});
	}

	if (logDetails && expectedButNotFound.length > 0) {
		logger.debug("期待されたが見つからなかった作品ID（最初の10件）:", {
			ids: expectedButNotFound.slice(0, 10),
			total: expectedButNotFound.length,
		});
	}

	if (logDetails && foundButNotExpected.length > 0) {
		logger.debug("予期しない作品ID（最初の10件）:", {
			ids: foundButNotExpected.slice(0, 10),
			total: foundButNotExpected.length,
		});
	}

	logger.info("📊 作品ID検証結果", {
		totalExpected: expectedIds.size,
		totalFound: foundWorkIds.length,
		coveragePercentage: Math.round(coveragePercentage),
		isValid,
		regionWarning,
	});

	return {
		isValid,
		totalExpected: expectedIds.size,
		totalFound: foundWorkIds.length,
		coveragePercentage,
		missingCount: expectedButNotFound.length,
		extraCount: foundButNotExpected.length,
		regionWarning,
		details: {
			expectedButNotFound,
			foundButNotExpected,
		},
	};
}

/**
 * 作品IDが存在しない場合のエラー処理
 * @param result 検証結果
 */
export function handleNoWorkIdsError(result?: WorkIdValidationResult): void {
	if (result?.regionWarning) {
		logger.warn("🌏 リージョン差異により作品が取得できない可能性があります。", {
			suggestion: "Cloud Functionsのリージョン設定を確認してください",
			expectedRegion: "日本（asia-northeast1）",
		});
	} else {
		logger.error("❌ 作品IDが全く取得できませんでした。", {
			possibleCauses: [
				"DLsite APIの仕様変更",
				"HTMLパース処理のエラー",
				"ネットワークエラー",
				"リージョン制限",
			],
		});
	}
}

/**
 * 部分的な取得成功時の警告
 * @param result 検証結果
 */
export function warnPartialSuccess(result: WorkIdValidationResult): void {
	if (result.coveragePercentage < 50) {
		logger.warn("⚠️ 取得できた作品数が期待値を大幅に下回っています", {
			expected: result.totalExpected,
			found: result.totalFound,
			coveragePercentage: Math.round(result.coveragePercentage),
			action: "HTMLパース処理またはAPI応答を確認してください",
		});
	} else if (result.regionWarning) {
		logger.info("ℹ️ リージョン差異による作品リストの違いが検出されました", {
			note: "これは正常な動作の可能性があります",
			missingCount: result.missingCount,
			extraCount: result.extraCount,
		});
	}
}
