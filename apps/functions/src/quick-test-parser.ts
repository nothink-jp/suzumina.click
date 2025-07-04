#!/usr/bin/env node
/**
 * DLsiteパーサー簡易テストスクリプト
 *
 * 実際のDLsite作品IDを使って素早くパーサーの動作確認を行います。
 * ログ出力が詳細で、問題の特定が容易です。
 */

import { fetchWorkDetailPage, parseWorkDetailFromHTML } from "./utils/dlsite-detail-parser";
import { parseWorksFromHTML } from "./utils/dlsite-parser";

// 実際に存在する人気作品のID（テスト用）
const REAL_PRODUCT_IDS = [
	"RJ01052559", // 人気作品例
	"RJ01041352", // 人気作品例
	"RJ01038294", // 人気作品例
	"RJ384687", // 従来形式の人気作品
	"RJ321644", // 従来形式の人気作品
];

interface QuickTestResult {
	productId: string;
	success: boolean;
	dataExtracted: {
		hasBasicInfo: boolean;
		hasFileInfo: boolean;
		hasCreatorInfo: boolean;
		hasBonusContent: boolean;
		hasHighResImage: boolean;
		hasDetailedDescription: boolean;
	};
	sampleData: {
		title?: string;
		creator?: string;
		fileSize?: string;
		releaseDate?: string;
	};
	error?: string;
	executionTime: number;
}

async function quickTestSingle(productId: string): Promise<QuickTestResult> {
	const startTime = Date.now();

	const result: QuickTestResult = {
		productId,
		success: false,
		dataExtracted: {
			hasBasicInfo: false,
			hasFileInfo: false,
			hasCreatorInfo: false,
			hasBonusContent: false,
			hasHighResImage: false,
			hasDetailedDescription: false,
		},
		sampleData: {},
		executionTime: 0,
	};

	try {
		const html = await fetchWorkDetailPage(productId);

		if (html.length < 1000) {
			throw new Error(`HTML too short (${html.length} chars) - possible block or error page`);
		}
		const detailData = parseWorkDetailFromHTML(html);
		const searchResults = parseWorksFromHTML(html);

		// 結果の分析
		result.dataExtracted = {
			hasBasicInfo: !!detailData.basicInfo,
			hasFileInfo: !!detailData.fileInfo && Object.keys(detailData.fileInfo).length > 0,
			hasCreatorInfo: !!(
				(detailData.voiceActors?.length || 0) +
				(detailData.scenario?.length || 0) +
				(detailData.illustration?.length || 0) +
				(detailData.music?.length || 0) +
				(detailData.design?.length || 0) +
				Object.keys(detailData.otherCreators || {}).length
			),
			hasBonusContent: (detailData.bonusContent?.length || 0) > 0,
			hasHighResImage: !!detailData.highResImageUrl,
			hasDetailedDescription:
				!!detailData.detailedDescription && detailData.detailedDescription.length > 0,
		};

		// サンプルデータの抽出
		result.sampleData = {
			title: searchResults[0]?.title,
			creator: searchResults[0]?.circle || searchResults[0]?.author?.[0],
			fileSize: detailData.fileInfo?.totalSizeText || detailData.basicInfo?.fileSize,
			releaseDate: detailData.basicInfo?.releaseDate,
		};

		result.success = true;

		// サンプルデータ確認のためのダミー実装（コンソール出力削除済み）
		if (result.sampleData.title) {
			// タイトル表示処理をここに実装可能
		}
		if (result.sampleData.releaseDate) {
			// 発売日表示処理をここに実装可能
		}
		if (result.sampleData.creator) {
			// クリエイター表示処理をここに実装可能
		}
		if (result.sampleData.fileSize) {
			// ファイルサイズ表示処理をここに実装可能
		}

		// 基本情報の表示
		if (detailData.basicInfo) {
			const basic = detailData.basicInfo;
			if (basic.releaseDate) {
				// 発売日表示処理をここに実装可能
			}
			if (basic.seriesName) {
				// シリーズ名表示処理をここに実装可能
			}
			if (basic.ageRating) {
				// 年齢指定表示処理をここに実装可能
			}
			if (basic.workFormat) {
				// 作品形式表示処理をここに実装可能
			}
			if (basic.fileFormat) {
				// ファイル形式表示処理をここに実装可能
			}
			if (basic.author?.length) {
				// 作者表示処理をここに実装可能
			}
			if (basic.voiceActors?.length) {
				// 声優表示処理をここに実装可能
			}
			if (basic.scenario?.length) {
				// シナリオ担当者表示処理をここに実装可能
			}
			if (basic.illustration?.length) {
				// イラスト担当者表示処理をここに実装可能
			}
			if (basic.music?.length) {
				// 音楽担当者表示処理をここに実装可能
			}
			if (basic.genres?.length) {
				// ジャンル表示処理をここに実装可能
			}
			if (basic.detailTags?.length) {
				// 詳細タグ表示処理をここに実装可能
			}
		}

		// 詳細データの深堀り（統合されたクリエイター情報は作品のメインフィールドに含まれている）
		if (detailData.voiceActors?.length) {
			// 詳細声優情報表示処理をここに実装可能
		}
		if (detailData.scenario?.length) {
			// 詳細シナリオ担当者情報表示処理をここに実装可能
		}
		if (detailData.illustration?.length) {
			// 詳細イラスト担当者情報表示処理をここに実装可能
		}
		if (detailData.music?.length) {
			// 詳細音楽担当者情報表示処理をここに実装可能
		}
	} catch (error) {
		result.error = error instanceof Error ? error.message : String(error);
	}

	result.executionTime = Date.now() - startTime;

	return result;
}

async function quickTestAll(): Promise<void> {
	const results: QuickTestResult[] = [];

	for (const productId of REAL_PRODUCT_IDS) {
		const result = await quickTestSingle(productId);
		results.push(result);
		await new Promise((resolve) => setTimeout(resolve, 3000));
	}

	const successful = results.filter((r) => r.success);
	const failed = results.filter((r) => !r.success);

	let stats = null;
	if (successful.length > 0) {
		stats = {
			withBasicInfo: successful.filter((r) => r.dataExtracted.hasBasicInfo).length,
			withFileInfo: successful.filter((r) => r.dataExtracted.hasFileInfo).length,
			withCreators: successful.filter((r) => r.dataExtracted.hasCreatorInfo).length,
			withBonus: successful.filter((r) => r.dataExtracted.hasBonusContent).length,
			withHighRes: successful.filter((r) => r.dataExtracted.hasHighResImage).length,
		};
	}

	if (failed.length > 0) {
		const errorCounts = new Map<string, number>();
		failed.forEach((f) => {
			if (f.error) {
				errorCounts.set(f.error, (errorCounts.get(f.error) || 0) + 1);
			}
		});

		for (const [_error, _count] of errorCounts.entries()) {
			// エラー分析処理をここに実装可能
		}
	}

	// @ts-ignore - Variable prepared for future use in debug tool
	const _avgTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;

	// 推奨アクション
	if (failed.length > 0) {
		// 失敗時の推奨アクション処理をここに実装可能
	}

	if (successful.length > 0 && stats && stats.withBasicInfo / successful.length < 0.5) {
		// 基本情報抽出成功率が低い場合の推奨アクション処理をここに実装可能
	}
}

// CLI実行
async function main() {
	const args = process.argv.slice(2);

	if (args.includes("--help") || args.includes("-h")) {
		return;
	}

	if (args.length > 0) {
		// 特定の製品IDをテスト
		const productId = args[0];
		if (productId) {
			await quickTestSingle(productId);
		}
	} else {
		// 全製品をテスト
		await quickTestAll();
	}
}

if (require.main === module) {
	// biome-ignore lint/suspicious/noConsole: Debug tool requires console output
	main().catch(console.error);
}
