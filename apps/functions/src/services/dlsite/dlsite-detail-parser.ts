/**
 * DLsite作品詳細ページパーサー
 *
 * 作品詳細ページから収録内容・ファイル情報・詳細クリエイター情報を抽出します。
 */

import type { BasicWorkInfo, BonusContent, FileInfo } from "@suzumina.click/shared-types";
import * as cheerio from "cheerio";
import * as logger from "../../shared/logger";
import { type ImageVerificationResult, verifyTranslationWorkImage } from "./image-verification";

/**
 * 詳細評価情報
 */
export interface DetailedRatingInfo {
	/** 精密な星評価（小数点以下含む）例: 4.91 */
	stars?: number;
	/** 評価数 */
	ratingCount?: number;
}

/**
 * 詳細ページから抽出されるデータ構造
 * OptimizedFirestoreDLsiteWorkData.dataSources.detailPage に格納される形式
 */
export interface DetailPageData {
	/** 基本作品情報 */
	basicInfo: BasicWorkInfo;
	/** ファイル情報 */
	fileInfo: FileInfo;
	/** 特典情報 */
	bonusContent: BonusContent[];
	/** 詳細説明文 */
	detailedDescription: string;
	/** 高解像度ジャケット画像URL */
	highResImageUrl?: string;
	/** 画像検証結果 */
	imageVerification?: ImageVerificationResult & { originalProductId?: string };
	/** 詳細評価情報（小数点以下を含む精密な評価） */
	detailedRating?: DetailedRatingInfo;
	/** 5種類の統一クリエイター情報 */
	voiceActors: string[];
	scenario: string[];
	illustration: string[];
	music: string[];
	author: string[];
}

/**
 * DLsite作品詳細ページから拡張データを取得
 */
export async function fetchWorkDetailPage(productId: string): Promise<string> {
	const url = `https://www.dlsite.com/maniax/work/=/product_id/${productId}.html`;

	logger.debug(`DLsite詳細ページリクエスト: ${url}`);

	const response = await fetch(url, {
		headers: {
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			Accept:
				"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
			"Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
			"Accept-Encoding": "gzip, deflate, br",
			"Cache-Control": "no-cache",
			"Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
			"Sec-Ch-Ua-Mobile": "?0",
			"Sec-Ch-Ua-Platform": '"Windows"',
			"Sec-Fetch-Dest": "document",
			"Sec-Fetch-Mode": "navigate",
			"Sec-Fetch-Site": "none",
			"Upgrade-Insecure-Requests": "1",
		},
	});

	if (!response.ok) {
		// 404の場合は作品が存在しないことを明確に示す
		if (response.status === 404) {
			throw new Error(`作品ID ${productId} は存在しません (404 Not Found)`);
		}
		// その他のHTTPエラー
		throw new Error(`DLsite詳細ページの取得に失敗: ${response.status} ${response.statusText}`);
	}

	const html = await response.text();

	// HTMLの内容を検証
	if (html.length < 1000) {
		throw new Error(
			`取得したHTMLが短すぎます (${html.length}文字) - エラーページまたはブロックの可能性`,
		);
	}

	// DLsiteの典型的なエラーページを検出
	if (html.includes("エラーが発生しました") || html.includes("ページが見つかりません")) {
		throw new Error("DLsite側でエラーページが表示されました");
	}

	// 正常なDLsite作品ページの特徴的要素があることを確認
	if (!html.includes("work_name") && !html.includes("work_outline")) {
		throw new Error("有効なDLsite作品ページではありません - 作品情報要素が見つかりません");
	}

	logger.debug(`DLsite詳細ページ取得成功: ${productId}`);

	return html;
}

/**
 * 再生時間テキストを秒数に変換
 * 例: "5分3秒" → 303, "15分" → 900, "1時間20分" → 4800
 */
export function parseDurationToSeconds(durationText: string): number | undefined {
	if (!durationText || durationText.trim() === "") {
		return undefined;
	}

	const text = durationText.trim();
	let totalSeconds = 0;

	// 時間の抽出
	const hourMatch = text.match(/(\d+)時間/);
	if (hourMatch?.[1]) {
		totalSeconds += Number.parseInt(hourMatch[1]) * 3600;
	}

	// 分の抽出
	const minuteMatch = text.match(/(\d+)分/);
	if (minuteMatch?.[1]) {
		totalSeconds += Number.parseInt(minuteMatch[1]) * 60;
	}

	// 秒の抽出
	const secondMatch = text.match(/(\d+)秒/);
	if (secondMatch?.[1]) {
		totalSeconds += Number.parseInt(secondMatch[1]);
	}

	return totalSeconds > 0 ? totalSeconds : undefined;
}

/**
 * ファイルサイズテキストをバイト数に変換
 * 例: "3.71 GB" → 3984588800, "245 MB" → 256901120
 */
export function parseFileSizeToBytes(sizeText: string): number | undefined {
	if (!sizeText || sizeText.trim() === "") {
		return undefined;
	}

	const text = sizeText.trim().toUpperCase();
	const match = text.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)$/);

	if (!match?.[1] || !match?.[2]) {
		return undefined;
	}

	const value = Number.parseFloat(match[1]);
	const unit = match[2];

	const multipliers = {
		B: 1,
		KB: 1024,
		MB: 1024 * 1024,
		GB: 1024 * 1024 * 1024,
		TB: 1024 * 1024 * 1024 * 1024,
	};

	return Math.round(value * multipliers[unit as keyof typeof multipliers]);
}

/**
 * ファイル情報を抽出
 */
export function extractFileInfo($: cheerio.CheerioAPI): FileInfo {
	const fileInfo: FileInfo = {
		formats: [],
		additionalFiles: [],
	};

	// ファイル情報テーブルを探す（#work_outlineを追加してbasicInfoと同じソースを参照）
	$("table.work_parts_table tr, .work_outline_table tr, #work_outline tr").each((_, element) => {
		const $row = $(element);
		const headerText = $row.find("th").text().trim();
		const contentText = $row.find("td").text().trim();

		// ファイルサイズ
		if (/ファイル容量|ファイルサイズ|総容量/.test(headerText)) {
			fileInfo.totalSizeText = contentText;
			fileInfo.totalSizeBytes = parseFileSizeToBytes(contentText);
		}

		// 再生時間
		if (/再生時間|総時間|収録時間/.test(headerText)) {
			fileInfo.totalDurationText = contentText;
			fileInfo.totalDuration = parseDurationToSeconds(contentText);
		}

		// ファイル形式
		if (/ファイル形式|音声形式|フォーマット/.test(headerText)) {
			const formats = contentText
				.split(/[、,/\s]+/)
				.map((f) => f.trim())
				.filter((f) => f && /^[A-Z0-9]{2,5}$/i.test(f)); // WAV, MP3等の形式のみ
			fileInfo.formats.push(...formats);
		}

		// 付属ファイル
		if (/付属|おまけ|同梱|追加/.test(headerText)) {
			const additionalFiles = contentText
				.split(/[、,\n]+/)
				.map((f) => f.trim())
				.filter((f) => f && f.length > 1);
			fileInfo.additionalFiles.push(...additionalFiles);
		}
	});

	// work_partsセクションからもファイル情報を抽出
	$(".work_parts").each((_index, element) => {
		const $section = $(element);
		const headingText = $section.find(".work_parts_heading").text().trim();
		const contentText = $section.find(".work_parts_area").text().trim();

		// トラック説明セクションからファイル情報を抽出
		if (/トラック|収録|時間|形式/i.test(headingText)) {
			// 総再生時間の抽出
			const durationMatch = contentText.match(/収録時間[：:]?\s*(\d+分)/);
			if (durationMatch?.[1] && !fileInfo.totalDurationText) {
				fileInfo.totalDurationText = durationMatch[1];
				fileInfo.totalDuration = parseDurationToSeconds(durationMatch[1]);
			}

			// ファイル形式の抽出
			if (/wav|mp3|flac|ogg|aac/i.test(contentText)) {
				const formatMatches = contentText.match(
					/(?:ハイレゾ版\s*\()?(wav|mp3|flac|ogg|aac)(?:\)|版)?/gi,
				);
				if (formatMatches) {
					const extractedFormats = formatMatches.map((f) =>
						f.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
					);
					fileInfo.formats.push(...extractedFormats);
				}
			}
		}
	});

	// 作品説明からもファイル情報を抽出
	const description = $(".work_parts_area .work_parts").text();

	// ファイル形式の抽出（説明文から）
	const formatMatches = description.match(/(?:WAV|MP3|FLAC|OGG|AAC|M4A)(?:\s*\([^)]*\))?/gi);
	if (formatMatches) {
		const additionalFormats = formatMatches.map((f) =>
			f.replace(/\s*\([^)]*\)/g, "").toUpperCase(),
		);
		fileInfo.formats.push(...additionalFormats);
	}

	// 重複除去
	fileInfo.formats = [...new Set(fileInfo.formats)];
	fileInfo.additionalFiles = [...new Set(fileInfo.additionalFiles)];

	logger.debug(
		`ファイル情報抽出完了: ${fileInfo.formats.length}形式, ${fileInfo.additionalFiles.length}付属ファイル`,
	);
	return fileInfo;
}

/**
 * クリエイター名のテキストを正しく分割する
 * DLsiteでは「柚木つばめ / 橘きの / おおきなこびと」のようにスラッシュ区切りで記載される
 */
export function parseCreatorNames(text: string): string[] {
	if (!text || !text.trim()) return [];

	// スラッシュ、カンマ、改行で分割
	const names = text
		.split(/[/、,\n]+/)
		.map((name) => name.trim())
		.filter((name) => name && name.length > 1 && name.length < 50); // 妥当な長さの名前のみ

	// デバッグログで分割結果を確認
	if (names.length > 1) {
		logger.debug(`クリエイター名分割: "${text}" → [${names.join(", ")}]`);
	}

	return names;
}

/**
 * 詳細クリエイター情報を抽出
 * @returns 統合されたクリエイター情報（メインフィールド用 + レガシーother）
 */
export function extractDetailedCreatorInfo($: cheerio.CheerioAPI): {
	voiceActors: string[];
	scenario: string[];
	illustration: string[];
	music: string[];
	design: string[];
	otherCreators: Record<string, string[]>;
} {
	const creators = {
		voiceActors: [] as string[],
		scenario: [] as string[],
		illustration: [] as string[],
		music: [] as string[],
		design: [] as string[],
		otherCreators: {} as Record<string, string[]>,
	};

	// クリエイター情報テーブルを探す（#work_outlineを追加してbasicInfoと同じソースを参照）
	$("table.work_parts_table tr, .work_outline_table tr, #work_outline tr").each((_, element) => {
		const $row = $(element);
		const headerText = $row.find("th").text().trim();
		const contentText = $row.find("td").text().trim();

		if (!contentText) return;

		// スラッシュ区切りのクリエイター名を正しく分割
		const names = parseCreatorNames(contentText);

		if (names.length === 0) return;

		// 声優（CV）
		if (/声優|CV|ボイス|出演/.test(headerText)) {
			creators.voiceActors.push(...names);
		}
		// シナリオ
		else if (/シナリオ|脚本|原作|ストーリー/.test(headerText)) {
			creators.scenario.push(...names);
		}
		// イラスト
		else if (/イラスト|絵|原画|キャラクター.*デザイン/.test(headerText)) {
			creators.illustration.push(...names);
		}
		// 音楽
		else if (/音楽|BGM|効果音|サウンド/.test(headerText)) {
			creators.music.push(...names);
		}
		// デザイン
		else if (/デザイン|UI|ロゴ/.test(headerText)) {
			creators.design.push(...names);
		}
		// その他
		else if (names.length > 0 && /制作|企画|プロデュース|編集|監修/.test(headerText)) {
			creators.otherCreators[headerText] = names;
		}
	});

	// 重複除去
	creators.voiceActors = [...new Set(creators.voiceActors)];
	creators.scenario = [...new Set(creators.scenario)];
	creators.illustration = [...new Set(creators.illustration)];
	creators.music = [...new Set(creators.music)];
	creators.design = [...new Set(creators.design)];

	const totalCreators =
		creators.voiceActors.length +
		creators.scenario.length +
		creators.illustration.length +
		creators.music.length +
		creators.design.length +
		Object.values(creators.otherCreators).flat().length;

	logger.debug(`詳細クリエイター情報抽出完了: ${totalCreators}名`);
	return creators;
}

/**
 * 特典情報を抽出
 */
export function extractBonusContent($: cheerio.CheerioAPI): BonusContent[] {
	const bonusContent: BonusContent[] = [];

	// 特典情報を探す（#work_outlineを追加してbasicInfoと同じソースを参照）
	$("table.work_parts_table tr, .work_outline_table tr, #work_outline tr").each((_, element) => {
		const $row = $(element);
		const headerText = $row.find("th").text().trim();
		const contentText = $row.find("td").text().trim();

		if (/特典|おまけ|ボーナス|限定|購入.*特典/.test(headerText) && contentText) {
			bonusContent.push({
				title: headerText,
				description: contentText,
				type: determineBonusType(contentText),
			});
		}
	});

	// 作品説明からも特典情報を抽出
	const description = $(".work_parts_area .work_parts").text();
	const bonusMatches = description.match(/(?:特典|おまけ|ボーナス)[^。\n]*(?:[。\n]|$)/g);
	if (bonusMatches) {
		bonusMatches.forEach((match) => {
			const content = match.trim();
			if (content.length > 10) {
				// ある程度の長さがあるもののみ
				bonusContent.push({
					title: "購入者特典",
					description: content,
					type: determineBonusType(content),
				});
			}
		});
	}

	logger.debug(`特典情報抽出完了: ${bonusContent.length}件`);
	return bonusContent;
}

/**
 * 特典タイプを判定
 */
function determineBonusType(content: string): string {
	if (/画像|イラスト|CG|壁紙/.test(content)) return "画像";
	if (/音声|ボイス|音楽|BGM/.test(content)) return "音声";
	if (/テキスト|小説|設定資料|台本/.test(content)) return "テキスト";
	if (/動画|ムービー/.test(content)) return "動画";
	return "その他";
}

/**
 * 画像URLを正規化して高解像度版に変換
 */
function normalizeImageUrl(imageUrl: string): string {
	let fullUrl = imageUrl;
	if (imageUrl.startsWith("//")) {
		fullUrl = `https:${imageUrl}`;
	} else if (imageUrl.startsWith("/")) {
		fullUrl = `https://img.dlsite.jp${imageUrl}`;
	}

	// サムネイルサイズのURLを高解像度版に変換
	return fullUrl.replace(/_\d+x\d+(\.[a-z]+)$/i, "$1");
}

/**
 * メインジャケット画像URLを検索
 */
function findMainJacketImage($: cheerio.CheerioAPI): string | undefined {
	const mainImageSelectors = [
		"#work_img img", // メインのジャケット画像
		".work_img img", // 別パターン
		"img[src*='img_main']", // img_mainを含むsrc
		".product_image img", // 商品画像
		"[id*='main'] img", // mainを含むID
	];

	for (const selector of mainImageSelectors) {
		const $img = $(selector).first();
		if ($img.length > 0) {
			const imageUrl = $img.attr("src") || $img.attr("data-src");
			if (imageUrl) {
				const highResUrl = normalizeImageUrl(imageUrl);
				logger.debug(`高解像度ジャケット画像URL抽出: ${highResUrl}`);
				return highResUrl;
			}
		}
	}

	return undefined;
}

/**
 * modpub形式の画像URLを検索
 */
// cSpell:disable-next-line modpub
function findModpubImage($: cheerio.CheerioAPI): string | undefined {
	// cSpell:disable-next-line
	let modpubUrl: string | undefined;
	// cSpell:disable-next-line
	let modpubMainUrl: string | undefined;

	$("img").each((_, element) => {
		const $img = $(element);
		const src = $img.attr("src") || $img.attr("data-src");

		// cSpell:disable-next-line
		if (src?.includes("img.dlsite.jp/modpub/images2/")) {
			let fullUrl = src;
			if (src.startsWith("//")) {
				fullUrl = `https:${src}`;
			}

			// work/doujin パターンのメイン画像を優先
			if (fullUrl.includes("/work/doujin/") && fullUrl.includes("_img_main")) {
				// cSpell:disable-next-line
				logger.debug(`modpub高解像度メイン画像URL抽出: ${fullUrl}`);
				// cSpell:disable-next-line
				modpubMainUrl = fullUrl;
				return false; // 最優先なので即座に終了
			}

			// parts パターンも記録（フォールバック用）
			if (!modpubUrl) {
				// cSpell:disable-next-line
				logger.debug(`modpub高解像度画像URL抽出: ${fullUrl}`);
				// cSpell:disable-next-line
				modpubUrl = fullUrl;
			}
		}

		return undefined;
	});

	// メイン画像を優先、なければ最初に見つかったものを返す
	// cSpell:disable-next-line
	return modpubMainUrl || modpubUrl;
}

/**
 * 高解像度ジャケット画像URLを抽出
 */
export function extractHighResImageUrl($: cheerio.CheerioAPI): string | undefined {
	// HTMLからの画像URL抽出のみを行う（検証は後で別途実行）
	// メインジャケット画像を検索
	const mainImage = findMainJacketImage($);
	if (mainImage) {
		return mainImage;
	}

	// modpub形式の画像を検索
	// cSpell:disable-next-line modpub
	const modpubImage = findModpubImage($);
	// cSpell:disable-next-line
	if (modpubImage) {
		// cSpell:disable-next-line
		return modpubImage;
	}

	logger.debug("高解像度ジャケット画像URLが見つかりませんでした");
	return undefined;
}

/**
 * テキストが有効な作品説明かどうかを判定
 */
function isValidDescription(text: string): boolean {
	if (!text || text.length < 10) {
		return false;
	}

	// 除外すべきパターン
	const invalidPatterns = [
		/^[0-9,]+円/, // 価格情報
		/^[0-9]+MB/, // ファイルサイズ
		/^[0-9]+分/, // 時間情報
		/^(MP3|WAV|FLAC|OGG)/, // ファイル形式
		/^(CV|声優)[：:]/, // 声優情報
		/^(シナリオ|原画|音楽)[：:]/, // スタッフ情報
		/^(更新履歴|バージョン)/, // 更新情報
		/^(注意|警告|免責)/, // 注意事項
		/work_outlineテーブル/, // デバッグテキスト
		/抽出された詳細情報/, // デバッグテキスト
		/^(タグ|ジャンル)[：:]/, // タグ情報
		/^[0-9]{4}年[0-9]{1,2}月/, // 日付
		/^(ダウンロード|DL)数/, // DL数
		/^★[0-9.]+/, // 評価
		/^(対応OS|動作環境)/, // 動作環境
		/^(同人サークル|サークル名)/, // サークル情報
	];

	// 無効パターンをチェック
	for (const pattern of invalidPatterns) {
		if (pattern.test(text)) {
			return false;
		}
	}

	// 有効な説明の特徴
	const validFeatures = [
		text.length >= 10, // 最低限の長さ（テスト対応で緩和）
		text.length <= 5000, // 長すぎない
		!/^[0-9\s,]+$/.test(text), // 数字だけではない
	];

	// より長いテキストに対してはより厳密な判定
	if (text.length >= 30) {
		validFeatures.push(/[。！？]/.test(text)); // 句読点がある
	}

	// すべての特徴を満たすかチェック
	return validFeatures.every(Boolean);
}

/**
 * 詳細説明文を抽出
 */
export function extractDetailedDescription($: cheerio.CheerioAPI): string {
	// 複数のパターンで作品説明を抽出（DLsite構造変化対応）
	const descriptionSelectors = [
		// DLsiteの典型的な作品説明エリア（従来）
		".work_parts_area .work_parts",
		".work_parts",
		".product_summary",
		".work_article",
		"#work_outline_inner .work_article",

		// 新しいDLsite構造対応
		".work_outline .work_parts",
		".work_outline .description",
		".work_outline .summary",
		".work_outline .story",
		".work_outline p",
		".product_detail .description",
		".product_detail .summary",
		".product_detail p",
		".main_content .description",
		".main_content .summary",
		".content_area .description",
		".content_area .summary",

		// より汎用的なパターン（拡張）
		".story",
		".description",
		".summary",
		".synopsis",
		".outline",
		".plot",
		".intro",
		".overview",

		// クラス名の部分一致（新構造対応）
		"[class*='description']",
		"[class*='summary']",
		"[class*='story']",
		"[class*='synopsis']",
		"[class*='outline']",
		"[class*='work']",

		// より広範囲な検索（フォールバック）
		".work_outline p",
		".work_outline div",
		".main_content p",
		".content p",
		"#work_outline p",
		"#main_content p",
		"p",
	];

	// セレクターを順番に試す
	for (const selector of descriptionSelectors) {
		const $element = $(selector);
		if ($element.length > 0) {
			// 複数の要素がある場合は最も長いテキストを選ぶ
			let bestText = "";

			$element.each((_, el) => {
				const text = $(el).text().trim();

				// 品質チェック: 適切な作品説明かどうか判定
				if (isValidDescription(text) && text.length > bestText.length) {
					bestText = text;
				}
			});

			if (bestText) {
				logger.debug(`作品説明を抽出 (${selector}): ${bestText.substring(0, 50)}...`);
				return bestText;
			}
		}
	}

	// より高度なフォールバック戦略
	logger.debug("基本セレクターで抽出できませんでした。フォールバック戦略を実行...");

	// 1. 長いテキストを含むp要素を探す
	const paragraphs = $("p");
	let bestParagraph = "";

	paragraphs.each((_, el) => {
		const text = $(el).text().trim();
		if (isValidDescription(text) && text.length > bestParagraph.length) {
			bestParagraph = text;
		}
	});

	if (bestParagraph) {
		logger.debug(`p要素から作品説明を抽出: ${bestParagraph.substring(0, 50)}...`);
		return bestParagraph;
	}

	// 2. div要素で長いテキストを探す
	const divs = $("div");
	let bestDiv = "";

	divs.each((_, el) => {
		const $el = $(el);
		// 子要素が少ないdivを優先（純粋なテキストコンテナの可能性が高い）
		if ($el.children().length <= 2) {
			const text = $el.text().trim();
			if (isValidDescription(text) && text.length > bestDiv.length) {
				bestDiv = text;
			}
		}
	});

	if (bestDiv) {
		logger.debug(`div要素から作品説明を抽出: ${bestDiv.substring(0, 50)}...`);
		return bestDiv;
	}

	// 3. 全体のページテキストから作品説明らしい部分を探す
	const pageText = $("body").text();

	// 強化されたパターンマッチング
	const storyPatterns = [
		/あらすじ[:\s]*([^。]+。[^。]*。?[^。]*。?)/, // より長い文章を取得
		/ストーリー[:\s]*([^。]+。[^。]*。?[^。]*。?)/,
		/内容[:\s]*([^。]+。[^。]*。?[^。]*。?)/,
		/概要[:\s]*([^。]+。[^。]*。?[^。]*。?)/,
		/物語[:\s]*([^。]+。[^。]*。?[^。]*。?)/,
		/シナリオ[:\s]*([^。]+。[^。]*。?[^。]*。?)/,
		// より広範囲なパターン
		/「([^」]{50,500})」/, // 引用符内の長いテキスト
		/([^。]{100,500}。[^。]{30,200}。)/, // 長い文章パターン
	];

	for (const pattern of storyPatterns) {
		const match = pageText.match(pattern);
		if (match?.[1] && isValidDescription(match[1].trim())) {
			logger.debug(`パターンマッチで作品説明を抽出: ${match[1].substring(0, 50)}...`);
			return match[1].trim();
		}
	}

	logger.debug("作品説明を抽出できませんでした");
	return "";
}

/**
 * 詳細ページから精密な評価情報を抽出
 * DLsite詳細ページでは小数点以下を含む正確な評価（例: 4.91）が表示される
 */
export function extractDetailedRating($: cheerio.CheerioAPI): DetailedRatingInfo {
	const ratingInfo: DetailedRatingInfo = {};

	// 評価スコアを複数のパターンで検索
	const ratingSelectors = [
		// 一般的な評価表示エリア
		".work_rating .star_rating",
		".star_rating",
		".rating_area .star_rating",
		".rating .star_rating",
		// 評価数値を含む可能性があるエリア
		".work_outline tr:contains('評価') td",
		".evaluation_data",
		// より汎用的なパターン
		"*[data-rating]",
		"*[data-score]",
	];

	// 評価数値のテキストパターンを探す
	const textSelectors = [
		".work_rating",
		".rating_area",
		".star_rating_text",
		".evaluation_text",
		".work_outline",
	];

	// セレクターベースの検索
	for (const selector of ratingSelectors) {
		const $element = $(selector);
		if ($element.length > 0) {
			// data-rating や data-score 属性から数値を取得
			const dataRating = $element.attr("data-rating") || $element.attr("data-score");
			if (dataRating) {
				const rating = Number.parseFloat(dataRating);
				if (!Number.isNaN(rating) && rating >= 0 && rating <= 5) {
					ratingInfo.stars = rating;
					logger.debug(`評価数値をdata属性から抽出: ${rating}`);
					break;
				}
			}

			// クラス名から評価を抽出（例: star_491 → 4.91）
			const className = $element.attr("class") || "";
			const match = className.match(/star_(\d+)/);
			if (match?.[1]) {
				const rating = Number.parseInt(match[1], 10) / 100; // star_491 -> 4.91
				if (rating >= 0 && rating <= 5) {
					ratingInfo.stars = rating;
					logger.debug(`評価数値をクラス名から抽出: ${rating} (${className})`);
					break;
				}
			}
		}
	}

	// テキストベースの検索（例: "4.91" "評価: 4.9"）
	if (!ratingInfo.stars) {
		for (const selector of textSelectors) {
			const $element = $(selector);
			const text = $element.text();

			// パターン1: 数値のみ（例: "4.91"）
			const numericMatch = text.match(/\b([0-5](?:\.\d{1,2})?)\b/);
			if (numericMatch?.[1]) {
				const rating = Number.parseFloat(numericMatch[1]);
				if (!Number.isNaN(rating) && rating >= 0 && rating <= 5) {
					ratingInfo.stars = rating;
					logger.debug(`評価数値をテキストから抽出: ${rating} (${numericMatch[1]})`);
					break;
				}
			}

			// パターン2: "評価: 4.91" のような形式
			const ratingMatch = text.match(/評価[:\s]*([0-5](?:\.\d{1,2})?)/);
			if (ratingMatch?.[1]) {
				const rating = Number.parseFloat(ratingMatch[1]);
				if (!Number.isNaN(rating) && rating >= 0 && rating <= 5) {
					ratingInfo.stars = rating;
					logger.debug(`評価数値を評価テキストから抽出: ${rating}`);
					break;
				}
			}
		}
	}

	// 評価数の抽出
	const ratingCountSelectors = [
		".work_rating .rating_count",
		".star_rating + .count",
		".evaluation_count",
	];

	for (const selector of ratingCountSelectors) {
		const $element = $(selector);
		const text = $element.text();
		const countMatch = text.match(/\((\d+(?:,\d+)*)\)/);
		if (countMatch?.[1]) {
			ratingInfo.ratingCount = Number.parseInt(countMatch[1].replace(/,/g, ""), 10);
			logger.debug(`評価数を抽出: ${ratingInfo.ratingCount}`);
			break;
		}
	}

	// 全体のテキストからも評価数を探す
	if (!ratingInfo.ratingCount) {
		const fullText = $("body").text();
		const globalCountMatch = fullText.match(/(\d+(?:,\d+)*)\s*件?\s*の評価/);
		if (globalCountMatch?.[1]) {
			ratingInfo.ratingCount = Number.parseInt(globalCountMatch[1].replace(/,/g, ""), 10);
			logger.debug(`評価数を全体テキストから抽出: ${ratingInfo.ratingCount}`);
		}
	}

	if (ratingInfo.stars) {
		logger.debug(
			`詳細評価情報抽出完了: 評価=${ratingInfo.stars}, 評価数=${ratingInfo.ratingCount || "不明"}`,
		);
	} else {
		logger.debug("詳細評価情報が見つかりませんでした");
	}

	return ratingInfo;
}

/**
 * 詳細ページからタグ情報を抽出
 */
function extractDetailTagsInfo($: cheerio.CheerioAPI, basicInfo: BasicWorkInfo): void {
	// タグ情報を取得する可能性のあるセレクター
	const tagSelectors = [
		// DLsiteでよく使われるタグ表示エリア
		".tag_list a",
		".tag-list a",
		"[data-tag] a",
		".genre_list a",
		".genre-list a",
		// 作品詳細のタグエリア
		".work_article .tag a",
		".work_parts .tag a",
		// より汎用的なパターン
		"a[href*='/search/?keyword']",
		"a[href*='tag=']",
		"a[href*='genre=']",
	];

	for (const selector of tagSelectors) {
		$(selector).each((_index, element) => {
			const $tag = $(element);
			const tagText = $tag.text().trim();

			// 空でない、ある程度の文字数のタグのみ採用
			if (tagText && tagText.length > 0 && tagText.length < 50) {
				// 重複チェック（ジャンルと同じものは除外）
				if (
					basicInfo.genres &&
					!basicInfo.genres.includes(tagText) &&
					!basicInfo.detailTags.includes(tagText)
				) {
					basicInfo.detailTags.push(tagText);
				}
			}
		});
	}

	// より一般的なタグパターンも探す
	$("*").each((_index, element) => {
		const $el = $(element);
		const className = $el.attr("class") || "";
		const text = $el.text().trim();

		// "tag"という文字列を含むクラス名で、短いテキストを持つ要素
		if (/tag/i.test(className) && text.length > 0 && text.length < 30) {
			if (
				basicInfo.genres &&
				!basicInfo.genres.includes(text) &&
				!basicInfo.detailTags.includes(text)
			) {
				basicInfo.detailTags.push(text);
			}
		}
	});

	logger.debug(`詳細タグ抽出: ${basicInfo.detailTags.length}件`);
}

/**
 * 基本作品情報を抽出（work_outlineテーブルから）
 */
export function extractBasicWorkInfo($: cheerio.CheerioAPI): BasicWorkInfo {
	const basicInfo: BasicWorkInfo = {
		scenario: [],
		illustration: [],
		voiceActors: [],
		music: [],
		genres: [],
		detailTags: [],
		other: {},
	};

	// work_outlineテーブル内の情報を抽出
	$("#work_outline tr").each((_index, element) => {
		const $row = $(element);
		const headerText = $row.find("th").text().trim();
		const $cell = $row.find("td");

		switch (headerText) {
			case "販売日":
				basicInfo.releaseDate = $cell.text().trim();
				logger.debug(`販売日抽出: ${basicInfo.releaseDate}`);
				break;

			case "シリーズ名":
				basicInfo.seriesName = $cell.find("a").text().trim() || $cell.text().trim();
				logger.debug(`シリーズ名抽出: ${basicInfo.seriesName}`);
				break;

			case "作者": {
				// リンクテキストとセル全体のテキストの両方をチェック
				const linkNames: string[] = [];
				$cell.find("a").each((_i, link) => {
					const name = $(link).text().trim();
					if (name) linkNames.push(name);
				});

				// リンクが見つからない場合はセル全体のテキストを分割
				// 作者情報は extractDetailedCreatorInfo で処理
				// const names = linkNames.length > 0 ? linkNames : parseCreatorNames($cell.text().trim());
				break;
			}

			case "シナリオ": {
				const linkNames: string[] = [];
				$cell.find("a").each((_i, link) => {
					const name = $(link).text().trim();
					if (name) linkNames.push(name);
				});

				const names = linkNames.length > 0 ? linkNames : parseCreatorNames($cell.text().trim());
				if (basicInfo.scenario) {
					basicInfo.scenario.push(...names);
					logger.debug(`シナリオ抽出: ${basicInfo.scenario.length}名`);
				}
				break;
			}

			case "イラスト": {
				const linkNames: string[] = [];
				$cell.find("a").each((_i, link) => {
					const name = $(link).text().trim();
					if (name) linkNames.push(name);
				});

				const names = linkNames.length > 0 ? linkNames : parseCreatorNames($cell.text().trim());
				if (basicInfo.illustration) {
					basicInfo.illustration.push(...names);
					logger.debug(`イラスト抽出: ${basicInfo.illustration.length}名`);
				}
				break;
			}

			case "声優": {
				const linkNames: string[] = [];
				$cell.find("a").each((_i, link) => {
					const name = $(link).text().trim();
					if (name) linkNames.push(name);
				});

				const names = linkNames.length > 0 ? linkNames : parseCreatorNames($cell.text().trim());
				if (basicInfo.voiceActors) {
					basicInfo.voiceActors.push(...names);
					logger.debug(`声優抽出: ${basicInfo.voiceActors.length}名`);
				}
				break;
			}

			case "音楽": {
				const linkNames: string[] = [];
				$cell.find("a").each((_i, link) => {
					const name = $(link).text().trim();
					if (name) linkNames.push(name);
				});

				const names = linkNames.length > 0 ? linkNames : parseCreatorNames($cell.text().trim());
				if (basicInfo.music) {
					basicInfo.music.push(...names);
					logger.debug(`音楽抽出: ${basicInfo.music.length}名`);
				}
				break;
			}

			case "年齢指定": {
				// 複数の方法で年齢指定を抽出
				const spanTitle = $cell.find("span").attr("title");
				const spanText = $cell.find("span").text().trim();
				const cellText = $cell.text().trim();
				const imageAlt = $cell.find("img").attr("alt");

				basicInfo.ageRating = spanTitle || spanText || imageAlt || cellText || "";
				logger.debug(
					`年齢指定抽出: ${basicInfo.ageRating} (span title: ${spanTitle}, span text: ${spanText}, img alt: ${imageAlt}, cell text: ${cellText})`,
				);
				break;
			}

			case "作品形式":
				basicInfo.workFormat = $cell.find("span").attr("title") || $cell.text().trim();
				logger.debug(`作品形式抽出: ${basicInfo.workFormat}`);
				break;

			case "ファイル形式": {
				const mainFormat = $cell.find("span").attr("title") || "";
				const additionalInfo = $cell.find(".additional_info").text().trim();
				basicInfo.fileFormat = mainFormat + (additionalInfo ? ` ${additionalInfo}` : "");
				logger.debug(`ファイル形式抽出: ${basicInfo.fileFormat}`);
				break;
			}

			case "ジャンル":
				$cell.find("a").each((_i, link) => {
					const genre = $(link).text().trim();
					if (genre && basicInfo.genres) basicInfo.genres.push(genre);
				});
				if (basicInfo.genres) {
					logger.debug(`ジャンル抽出: ${basicInfo.genres.length}件`);
				}
				break;

			case "ファイル容量":
				basicInfo.fileSize = $cell.text().trim();
				logger.debug(`ファイル容量抽出: ${basicInfo.fileSize}`);
				break;
		}
	});

	// 詳細ページからタグ情報も抽出（work_outline以外からも）
	extractDetailTagsInfo($, basicInfo);

	return basicInfo;
}

/**
 * メイン関数: 詳細ページHTMLから拡張データを抽出
 */
export function parseWorkDetailFromHTML(html: string): DetailPageData {
	const $ = cheerio.load(html);

	logger.debug("詳細ページHTMLパース開始");

	const basicInfo = extractBasicWorkInfo($);
	const fileInfo = extractFileInfo($);
	const creatorInfo = extractDetailedCreatorInfo($);
	const bonusContent = extractBonusContent($);
	const detailedDescription = extractDetailedDescription($);
	const highResImageUrl = extractHighResImageUrl($);
	const detailedRating = extractDetailedRating($);

	logger.debug("詳細ページHTMLパース完了");

	return {
		basicInfo,
		fileInfo,
		voiceActors: creatorInfo.voiceActors,
		scenario: creatorInfo.scenario,
		illustration: creatorInfo.illustration,
		music: creatorInfo.music,
		author: [], // 作者情報は詳細ページには通常含まれない
		bonusContent,
		detailedDescription,
		highResImageUrl,
		detailedRating,
	};
}

/**
 * 作品IDから詳細データを取得して解析（画像検証含む）
 */
export async function fetchAndParseWorkDetail(productId: string): Promise<DetailPageData | null> {
	try {
		const html = await fetchWorkDetailPage(productId);
		const detailData = parseWorkDetailFromHTML(html);

		// 画像検証を実行
		try {
			const imageVerification = await verifyTranslationWorkImage(
				productId,
				detailData.highResImageUrl,
			);

			// 検証済みURLが存在する場合は更新
			if (imageVerification.verifiedUrl) {
				detailData.highResImageUrl = imageVerification.verifiedUrl;
				detailData.imageVerification = imageVerification;

				logger.info(`作品${productId}の画像検証成功`, {
					method: imageVerification.method,
					verifiedUrl: imageVerification.verifiedUrl,
					originalProductId: imageVerification.originalProductId,
				});
			} else {
				detailData.imageVerification = imageVerification;
				logger.warn(`作品${productId}の画像検証失敗`, {
					attemptedUrls: imageVerification.attemptedUrls,
				});
			}
		} catch (imageError) {
			logger.warn(`作品${productId}の画像検証中にエラー`, {
				error: imageError instanceof Error ? imageError.message : String(imageError),
			});
		}

		logger.info(`作品${productId}の詳細データ取得完了`);
		return detailData;
	} catch (error) {
		logger.error(`作品${productId}の詳細データ取得に失敗:`, error);
		return null;
	}
}
