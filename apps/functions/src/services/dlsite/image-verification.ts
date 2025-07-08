/**
 * DLsite画像の存在確認とフォールバック処理
 */

import * as logger from "../../shared/logger";
import { generateDLsiteImageDirectory } from "./dlsite-parser";

export interface ImageVerificationResult {
	/** 検証済みの画像URL */
	verifiedUrl: string | undefined;
	/** 使用された検証手法 */
	method: "constructed" | "extracted" | "fallback" | "failed";
	/** 検証にかかった時間（ミリ秒） */
	verificationTimeMs: number;
	/** 試行したURL一覧 */
	attemptedUrls: string[];
}

/**
 * 画像URLの存在確認
 * @param imageUrl 確認対象の画像URL
 * @param timeoutMs タイムアウト時間（デフォルト: 5秒）
 * @returns 画像が存在するかどうか
 */
async function verifyImageExists(imageUrl: string, timeoutMs = 5000): Promise<boolean> {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

		const response = await fetch(imageUrl, {
			method: "HEAD",
			signal: controller.signal,
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				Referer: "https://www.dlsite.com/",
				Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
				"Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
				"Cache-Control": "no-cache",
				"Sec-Fetch-Dest": "image",
				"Sec-Fetch-Mode": "no-cors",
				"Sec-Fetch-Site": "cross-site",
			},
		});

		clearTimeout(timeoutId);
		// 403エラーは「存在するが制限されている」として処理
		if (response.status === 403) {
			logger.warn("画像は存在するがアクセス制限されています", {
				imageUrl,
				status: response.status,
			});
			// 403エラーの場合は画像が使用できないため、falseを返す
			// これにより、アクセス制限された画像URLは使用されなくなる
			return false;
		}
		return response.ok && response.status === 200;
	} catch (error) {
		logger.debug("画像存在確認エラー", {
			imageUrl,
			error: error instanceof Error ? error.message : String(error),
		});
		return false;
	}
}

/**
 * 高解像度画像URLの候補を生成
 * @param productId 作品ID
 * @param extractedUrl HTMLから抽出されたURL（存在する場合）
 * @returns URL候補のリスト（優先度順）
 */
function generateImageUrlCandidates(productId: string, extractedUrl?: string): string[] {
	const candidates: string[] = [];

	// HTMLから抽出されたURLが存在する場合は最優先
	if (extractedUrl) {
		candidates.push(extractedUrl);

		// 抽出されたURLがWebP以外の場合、WebP版も試す
		if (!extractedUrl.includes(".webp")) {
			const webpUrl = extractedUrl.replace(/\.(jpg|jpeg|png)$/i, ".webp");
			if (webpUrl !== extractedUrl) {
				candidates.push(webpUrl);
			}
		}
	}

	// アルゴリズムで生成されるURL（WebP版）
	const directory = generateDLsiteImageDirectory(productId);
	const baseUrl = `https://img.dlsite.jp/modpub/images2/work/doujin/${directory}/${productId}_img_main`;

	candidates.push(`${baseUrl}.webp`);
	candidates.push(`${baseUrl}.jpg`);
	candidates.push(`${baseUrl}.jpeg`);
	candidates.push(`${baseUrl}.png`);

	// 旧形式のURL（resize配下）
	candidates.push(
		`https://img.dlsite.jp/resize/images2/work/doujin/${directory}/${productId}_img_main.jpg`,
	);

	// サムネイル形式からの推測（240x240を除去）
	const thumbnailPattern = `https://img.dlsite.jp/resize/images2/work/doujin/${directory}/${productId}_img_main_240x240.jpg`;
	const fullSizeFromThumbnail = thumbnailPattern.replace("_240x240", "");
	candidates.push(fullSizeFromThumbnail);

	// 代替サムネイル形式（2024年のDLsite変更対応）
	candidates.push(
		`https://img.dlsite.jp/resize/images2/work/doujin/${directory}/${productId}_img_smp1.jpg`,
	);
	candidates.push(
		`https://img.dlsite.jp/resize/images2/work/doujin/${directory}/${productId}_img_sam.jpg`,
	);

	// 重複を除去
	return Array.from(new Set(candidates));
}

/**
 * 成功した手法を判定するヘルパー関数
 */
function determineVerificationMethod(
	candidateIndex: number,
	extractedUrl: string | undefined,
	candidateUrl: string,
): ImageVerificationResult["method"] {
	if (candidateIndex === 0 && extractedUrl) {
		return "extracted";
	}
	if (candidateUrl.includes("_img_main.webp") && !candidateUrl.includes("resize")) {
		return "constructed";
	}
	return "fallback";
}

/**
 * 成功時の結果を作成するヘルパー関数
 */
function createSuccessResult(
	candidate: string,
	method: ImageVerificationResult["method"],
	startTime: number,
	candidates: string[],
	attemptIndex: number,
): ImageVerificationResult {
	const verificationTimeMs = Date.now() - startTime;
	return {
		verifiedUrl: candidate,
		method,
		verificationTimeMs,
		attemptedUrls: candidates.slice(0, attemptIndex + 1),
	};
}

/**
 * 失敗時の結果を作成するヘルパー関数
 */
function createFailureResult(startTime: number, candidates: string[]): ImageVerificationResult {
	const verificationTimeMs = Date.now() - startTime;
	return {
		verifiedUrl: undefined,
		method: "failed",
		verificationTimeMs,
		attemptedUrls: candidates,
	};
}

/**
 * 高解像度画像URLの検証とフォールバック処理
 * @param productId 作品ID
 * @param extractedUrl HTMLから抽出されたURL（オプション）
 * @returns 検証結果
 */
export async function verifyAndGetHighResImageUrl(
	productId: string,
	extractedUrl?: string,
): Promise<ImageVerificationResult> {
	const startTime = Date.now();
	const candidates = generateImageUrlCandidates(productId, extractedUrl);

	logger.debug("高解像度画像URL検証開始", {
		productId,
		extractedUrl,
		candidatesCount: candidates.length,
	});

	// 各候補を順番に確認
	for (let i = 0; i < candidates.length; i++) {
		const candidate = candidates[i];
		if (!candidate) continue;

		try {
			const exists = await verifyImageExists(candidate);
			if (exists) {
				const method = determineVerificationMethod(i, extractedUrl, candidate);

				logger.info("高解像度画像URL検証成功", {
					productId,
					verifiedUrl: candidate,
					method,
					verificationTimeMs: Date.now() - startTime,
					attemptIndex: i,
				});

				return createSuccessResult(candidate, method, startTime, candidates, i);
			}
		} catch (error) {
			logger.warn("画像URL検証中にエラー", {
				productId,
				candidate,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	// すべての候補が失敗した場合
	logger.warn("高解像度画像URL検証失敗", {
		productId,
		extractedUrl,
		verificationTimeMs: Date.now() - startTime,
		attemptedUrls: candidates,
	});

	return createFailureResult(startTime, candidates);
}

/**
 * 翻訳作品の元作品IDを推測（HTMLから抽出されたURLを基に）
 * @param extractedUrl HTMLから抽出された画像URL
 * @returns 推測される元作品ID
 */
export function extractOriginalProductIdFromImageUrl(extractedUrl: string): string | undefined {
	// URL例: https://img.dlsite.jp/modpub/images2/work/doujin/RJ01395000/RJ01394199_img_main.webp
	const match = extractedUrl.match(/\/([A-Z]{2}\d{6,8})_img_main/);
	return match ? match[1] : undefined;
}

/**
 * 翻訳作品対応: 元作品の画像URLも検証
 * @param productId 翻訳作品のID
 * @param extractedUrl HTMLから抽出されたURL
 * @returns 検証結果（元作品の情報も含む）
 */
export async function verifyTranslationWorkImage(
	productId: string,
	extractedUrl?: string,
): Promise<ImageVerificationResult & { originalProductId?: string }> {
	// 通常の検証を実行
	const result = await verifyAndGetHighResImageUrl(productId, extractedUrl);

	// 通常の検証が成功した場合はそのまま返す
	if (result.verifiedUrl) {
		return result;
	}

	// 抽出されたURLから元作品IDを推測
	const originalProductId = extractedUrl
		? extractOriginalProductIdFromImageUrl(extractedUrl)
		: undefined;

	if (originalProductId && originalProductId !== productId) {
		logger.info("翻訳作品の元作品画像URL検証開始", {
			translationProductId: productId,
			originalProductId,
			extractedUrl,
		});

		// 元作品のURLで再検証
		const originalResult = await verifyAndGetHighResImageUrl(originalProductId, extractedUrl);

		return {
			...originalResult,
			originalProductId,
		};
	}

	return result;
}
