/**
 * DLsite作品詳細ページパーサー
 *
 * 作品詳細ページから収録内容・ファイル情報・詳細クリエイター情報を抽出します。
 */

import type {
	BonusContent,
	DetailedCreatorInfo,
	FileInfo,
	TrackInfo,
} from "@suzumina.click/shared-types";
import * as cheerio from "cheerio";
import * as logger from "./logger";

/**
 * 基本作品情報（work_outlineテーブルから抽出）
 */
export interface BasicWorkInfo {
	/** 販売日 */
	releaseDate?: string;
	/** シリーズ名 */
	seriesName?: string;
	/** 作者（複数） */
	author: string[];
	/** シナリオ担当者（複数） */
	scenario: string[];
	/** イラスト担当者（複数） */
	illustration: string[];
	/** 声優（複数） */
	voiceActors: string[];
	/** 音楽担当者（複数） */
	music: string[];
	/** 年齢指定 */
	ageRating?: string;
	/** 作品形式 */
	workFormat?: string;
	/** ファイル形式 */
	fileFormat?: string;
	/** ジャンル（複数） */
	genres: string[];
	/** 詳細タグ（複数） */
	detailTags: string[];
	/** ファイル容量 */
	fileSize?: string;
}

/**
 * 詳細ページから抽出される拡張データ構造
 */
export interface ExtendedWorkData {
	/** 基本作品情報 */
	basicInfo: BasicWorkInfo;
	/** 収録内容（トラック情報） */
	trackInfo: TrackInfo[];
	/** ファイル情報 */
	fileInfo: FileInfo;
	/** 詳細クリエイター情報 */
	detailedCreators: DetailedCreatorInfo;
	/** 特典情報 */
	bonusContent: BonusContent[];
	/** 詳細説明文 */
	detailedDescription: string;
	/** 高解像度ジャケット画像URL */
	highResImageUrl?: string;
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
 * 収録内容（トラック情報）を抽出
 */
export function extractTrackInfo($: cheerio.CheerioAPI): TrackInfo[] {
	const tracks: TrackInfo[] = [];

	// 収録内容セクションを探す
	const trackSections = [
		"table.work_parts_table tr", // 一般的なトラック表示
		".work_outline_table tr", // 作品概要表の行
		".track_list li", // リスト形式のトラック
		'[class*="track"] tr', // トラックを含むクラス名のテーブル
		".work_parts", // DLsiteの作品パーツ（新発見）
	];

	for (const selector of trackSections) {
		$(selector).each((_index, element) => {
			const $row = $(element);
			const rowText = $row.text().trim();

			// トラック情報らしき行を判定
			if (
				/^\d+\./.test(rowText) || // "1. タイトル" 形式
				/^第?\d+話/.test(rowText) || // "第1話" 形式
				/^track\s*\d+/i.test(rowText) || // "Track 1" 形式
				/\(\d+[分秒]/i.test(rowText) // 時間情報を含む
			) {
				const track = parseTrackFromRow($row, tracks.length + 1);
				if (track) {
					tracks.push(track);
				}
			}
		});

		if (tracks.length > 0) {
			break; // 最初に見つかったセクションでトラックが取得できれば終了
		}
	}

	// 作品説明文からもトラック情報を抽出（フォールバック）
	if (tracks.length === 0) {
		// 特に「トラックリスト」セクションを探す
		$(".work_parts").each((_index, element) => {
			const $section = $(element);
			const headingText = $section.find(".work_parts_heading").text().trim();
			const contentText = $section.find(".work_parts_area").text().trim();

			// トラックリストセクションを特定
			// 見出しにトラック関連のキーワードがある場合、または
			// 内容に「◆トラック」「【トラック」「[時間]」のパターンがある場合
			if (
				/トラック|収録|リスト|track/i.test(headingText) ||
				/◆トラック|【トラック\d+|【本編総再生時間|\[\d+:\d+\]/i.test(contentText)
			) {
				logger.debug(`トラックリストセクションを発見: ${headingText || "(見出しなし)"}`);
				const sectionTracks = extractTracksFromWorkPartsSection(contentText);
				tracks.push(...sectionTracks);
			}
		});

		// それでも見つからない場合は説明文全体から抽出
		if (tracks.length === 0) {
			const description = $(".work_parts_area .work_parts").text();
			const extractedTracks = extractTracksFromDescription(description);
			tracks.push(...extractedTracks);
		}
	}

	logger.debug(`収録内容抽出完了: ${tracks.length}件のトラック`);
	return tracks;
}

/**
 * テーブル行からトラック情報を解析
 */
function parseTrackFromRow(
	// biome-ignore lint/suspicious/noExplicitAny: Cheerio element type compatibility
	$row: cheerio.Cheerio<any>,
	defaultTrackNumber: number,
): TrackInfo | null {
	const rowText = $row.text().trim();

	// トラック番号の抽出
	let trackNumber = defaultTrackNumber;
	const trackNumMatch = rowText.match(/(?:^|第?)(\d+)(?:話|\.|\s)/);
	if (trackNumMatch?.[1]) {
		trackNumber = Number.parseInt(trackNumMatch[1]);
	}

	// タイトルの抽出（括弧内時間情報を除く）
	let title = rowText.replace(/\(\d+[分秒時間:：]+[^)]*\)/g, "").trim();

	// 番号プレフィックスを除去
	title = title.replace(/^(?:第?)?\d+(?:話|[.、。\s])\s*/, "").trim();

	if (!title || title.length < 2) {
		return null; // 有効なタイトルがない場合はスキップ
	}

	// 再生時間の抽出
	const durationMatch = rowText.match(/\(([^)]*(?:\d+[分秒時間:：]+[^)]*)+)\)/);
	const durationText = durationMatch ? durationMatch[1] : undefined;
	const duration = durationText ? parseDurationToSeconds(durationText) : undefined;

	// 説明文の抽出（次の行があれば）
	const description = $row.next("tr").find("td").text().trim() || undefined;

	return {
		trackNumber,
		title,
		duration,
		durationText,
		description,
	};
}

/**
 * work_partsセクションからトラック情報を抽出
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: DLsite parsing requires multiple patterns
function extractTracksFromWorkPartsSection(content: string): TrackInfo[] {
	const tracks: TrackInfo[] = [];

	// DLsite特有のパターンに対応
	const dlsitePatterns = [
		// パターン1: "【トラック1:タイトル】[7:34]" 形式（最優先、スペース考慮）
		/【トラック(\d+):([^】]+)】\s*\[(\d+:\d+)\]/g,
		// パターン2: "1:タイトル(30:48)"
		/(\d+):([^(]+)\((\d+:\d+)\)/g,
		// パターン3: "1. タイトル (30分48秒)"
		/(\d+)\.?\s*([^(]+)\s*\(([^)]*(?:\d+[分秒時間]+[^)]*)+)\)/g,
		// パターン4: "Track 1: タイトル (30:48)"
		/Track\s*(\d+):\s*([^(]+)\s*\((\d+:\d+)\)/gi,
	];

	for (const pattern of dlsitePatterns) {
		let match: RegExpExecArray | null;
		// biome-ignore lint/suspicious/noAssignInExpressions: needed for regex exec pattern
		while ((match = pattern.exec(content)) !== null) {
			if (!match[1] || !match[2] || !match[3]) continue;

			const trackNumber = Number.parseInt(match[1]);
			const title = match[2].trim();
			const durationText = match[3].trim();

			// 時間形式を秒数に変換
			let duration: number | undefined;
			if (/^\d+:\d+$/.test(durationText)) {
				// "30:48" 形式
				const timeParts = durationText.split(":");
				if (timeParts.length === 2 && timeParts[0] && timeParts[1]) {
					const minutes = Number.parseInt(timeParts[0]);
					const seconds = Number.parseInt(timeParts[1]);
					if (!Number.isNaN(minutes) && !Number.isNaN(seconds)) {
						duration = minutes * 60 + seconds;
					}
				}
			} else {
				// "30分48秒" 形式
				duration = parseDurationToSeconds(durationText);
			}

			if (title && title.length > 1) {
				tracks.push({
					trackNumber,
					title: title.replace(/^[\s\u3000]*/, "").replace(/[\s\u3000]*$/, ""), // 全角・半角スペース除去
					duration,
					durationText,
				});
			}
		}

		// パターンにマッチした場合は他のパターンを試さない
		if (tracks.length > 0) {
			break;
		}
	}

	// 重複除去（トラック番号でソート）
	const uniqueTracks = tracks
		.filter(
			(track, index, self) => index === self.findIndex((t) => t.trackNumber === track.trackNumber),
		)
		.sort((a, b) => a.trackNumber - b.trackNumber);

	return uniqueTracks;
}

/**
 * 作品説明文からトラック情報を抽出（正規表現ベース）
 */
function extractTracksFromDescription(description: string): TrackInfo[] {
	const tracks: TrackInfo[] = [];

	// 複数パターンでトラック情報を検索
	const trackPatterns = [
		/(?:^|\n)\s*(\d+)\.?\s*([^\n]+?)\s*\(([^)]*(?:\d+[分秒時間]+[^)]*)+)\)/gm,
		/(?:^|\n)\s*(?:第?)(\d+)話\s*([^\n]+?)\s*\(([^)]*(?:\d+[分秒時間]+[^)]*)+)\)/gm,
		/(?:^|\n)\s*track\s*(\d+)\s*:?\s*([^\n]+?)\s*\(([^)]*(?:\d+[分秒時間]+[^)]*)+)\)/gim,
	];

	for (const pattern of trackPatterns) {
		let match: RegExpExecArray | null;
		// biome-ignore lint/suspicious/noAssignInExpressions: needed for regex exec pattern
		while ((match = pattern.exec(description)) !== null) {
			if (!match[1] || !match[2] || !match[3]) continue;

			const trackNumber = Number.parseInt(match[1]);
			const title = match[2].trim();
			const durationText = match[3].trim();
			const duration = parseDurationToSeconds(durationText);

			if (title && title.length > 1) {
				tracks.push({
					trackNumber,
					title,
					duration,
					durationText,
				});
			}
		}
	}

	// 重複除去（トラック番号でソート）
	const uniqueTracks = tracks
		.filter(
			(track, index, self) => index === self.findIndex((t) => t.trackNumber === track.trackNumber),
		)
		.sort((a, b) => a.trackNumber - b.trackNumber);

	return uniqueTracks;
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
 * 詳細クリエイター情報を抽出
 */
export function extractDetailedCreatorInfo($: cheerio.CheerioAPI): DetailedCreatorInfo {
	const creators: DetailedCreatorInfo = {
		voiceActors: [],
		scenario: [],
		illustration: [],
		music: [],
		design: [],
		other: {},
	};

	// クリエイター情報テーブルを探す（#work_outlineを追加してbasicInfoと同じソースを参照）
	$("table.work_parts_table tr, .work_outline_table tr, #work_outline tr").each((_, element) => {
		const $row = $(element);
		const headerText = $row.find("th").text().trim();
		const contentText = $row.find("td").text().trim();

		if (!contentText) return;

		const names = contentText
			.split(/[、,\n]+/)
			.map((name) => name.trim())
			.filter((name) => name && name.length > 1);

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
			creators.other[headerText] = names;
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
		Object.values(creators.other).flat().length;

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
 * 作品IDから標準的な高解像度画像URLを構築
 */
function constructHighResImageUrl(productId: string): string {
	// 作品IDから範囲IDを計算（例: RJ01411411 → RJ01412000）
	const numericPart = productId.replace(/^RJ0?/, "");
	const productNumber = Number.parseInt(numericPart);
	// 1000単位で切り上げ（例: 1411 → 1412, 236 → 237）
	const rangeStart = Math.ceil(productNumber / 1000) * 1000;
	const rangeId = `RJ${rangeStart.toString().padStart(8, "0")}`;

	// cSpell:disable-next-line
	const baseUrl = `https://img.dlsite.jp/modpub/images2/work/doujin/${rangeId}/${productId}_img_main`;

	// WebP形式を優先的に試す
	logger.debug(`構築された高解像度画像URL: ${baseUrl}.webp`);
	return `${baseUrl}.webp`;
}

/**
 * HTMLから作品IDを抽出
 */
function extractProductId($: cheerio.CheerioAPI): string | undefined {
	// より確実な作品ID抽出のための複数のパターンを試す
	const patterns = [
		// URLからの作品ID抽出 (最も確実)
		() => {
			const url =
				$("link[rel='canonical']").attr("href") ||
				$("meta[property='og:url']").attr("content") ||
				$("base").attr("href");
			return url?.match(/\/product_id\/([A-Z]{2}\d{6,8})/)?.[1];
		},
		// 作品情報テーブルからの抽出
		() => {
			const workTable = $(".work_outline_table, .product_outline_table");
			const productIdText = workTable
				.find("th:contains('作品番号'), th:contains('商品ID')")
				.next("td")
				.text();
			return productIdText.match(/([A-Z]{2}\d{6,8})/)?.[1];
		},
		// ページタイトルからの抽出
		() => {
			const title = $("title").text();
			return title.match(/\[([A-Z]{2}\d{6,8})\]/)?.[1];
		},
		// より広範囲でのHTML検索（最後の手段）
		() => {
			const bodyText = $("body").text();
			const matches = bodyText.match(/[A-Z]{2}\d{6,8}/g);
			// 最も短い番号を選択（RJ01411411よりRJ01412000のような範囲IDは除外）
			return matches?.sort((a, b) => a.length - b.length || a.localeCompare(b))?.[0];
		},
	];

	for (const pattern of patterns) {
		const productId = pattern();
		if (productId) {
			logger.debug(`作品ID抽出成功: ${productId}`);
			return productId;
		}
	}

	logger.debug("作品IDを抽出できませんでした");
	return undefined;
}

/**
 * 高解像度ジャケット画像URLを抽出
 */
export function extractHighResImageUrl($: cheerio.CheerioAPI): string | undefined {
	// まず作品IDを取得してWebPフォーマットのURLを構築
	const productId = extractProductId($);
	if (productId) {
		const constructedUrl = constructHighResImageUrl(productId);
		logger.debug(`作品ID ${productId} から構築されたURL: ${constructedUrl}`);
		// 構築されたURLを最優先で返す
		return constructedUrl;
	}

	// メインジャケット画像を次に検索
	const mainImage = findMainJacketImage($);
	if (mainImage) {
		return mainImage;
	}

	// modpub形式の画像を最後に検索
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
 * 詳細説明文を抽出
 */
export function extractDetailedDescription($: cheerio.CheerioAPI): string {
	// 作品説明の主要セクションを取得
	const description = $(".work_parts_area .work_parts").text().trim();
	return description || "";
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
				if (!basicInfo.genres.includes(tagText) && !basicInfo.detailTags.includes(tagText)) {
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
			if (!basicInfo.genres.includes(text) && !basicInfo.detailTags.includes(text)) {
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
		author: [],
		scenario: [],
		illustration: [],
		voiceActors: [],
		music: [],
		genres: [],
		detailTags: [],
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

			case "作者":
				$cell.find("a").each((_i, link) => {
					const name = $(link).text().trim();
					if (name) basicInfo.author.push(name);
				});
				logger.debug(`作者抽出: ${basicInfo.author.length}名`);
				break;

			case "シナリオ":
				$cell.find("a").each((_i, link) => {
					const name = $(link).text().trim();
					if (name) basicInfo.scenario.push(name);
				});
				logger.debug(`シナリオ抽出: ${basicInfo.scenario.length}名`);
				break;

			case "イラスト":
				$cell.find("a").each((_i, link) => {
					const name = $(link).text().trim();
					if (name) basicInfo.illustration.push(name);
				});
				logger.debug(`イラスト抽出: ${basicInfo.illustration.length}名`);
				break;

			case "声優":
				$cell.find("a").each((_i, link) => {
					const name = $(link).text().trim();
					if (name) basicInfo.voiceActors.push(name);
				});
				logger.debug(`声優抽出: ${basicInfo.voiceActors.length}名`);
				break;

			case "音楽":
				$cell.find("a").each((_i, link) => {
					const name = $(link).text().trim();
					if (name) basicInfo.music.push(name);
				});
				logger.debug(`音楽抽出: ${basicInfo.music.length}名`);
				break;

			case "年齢指定":
				basicInfo.ageRating = $cell.find("span").attr("title") || $cell.text().trim();
				logger.debug(`年齢指定抽出: ${basicInfo.ageRating}`);
				break;

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
					if (genre) basicInfo.genres.push(genre);
				});
				logger.debug(`ジャンル抽出: ${basicInfo.genres.length}件`);
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
export function parseWorkDetailFromHTML(html: string): ExtendedWorkData {
	const $ = cheerio.load(html);

	logger.debug("詳細ページHTMLパース開始");

	const basicInfo = extractBasicWorkInfo($);
	const trackInfo = extractTrackInfo($);
	const fileInfo = extractFileInfo($);
	const detailedCreators = extractDetailedCreatorInfo($);
	const bonusContent = extractBonusContent($);
	const detailedDescription = extractDetailedDescription($);
	const highResImageUrl = extractHighResImageUrl($);

	logger.debug("詳細ページHTMLパース完了");

	return {
		basicInfo,
		trackInfo,
		fileInfo,
		detailedCreators,
		bonusContent,
		detailedDescription,
		highResImageUrl,
	};
}

/**
 * 作品IDから詳細データを取得して解析
 */
export async function fetchAndParseWorkDetail(productId: string): Promise<ExtendedWorkData | null> {
	try {
		const html = await fetchWorkDetailPage(productId);
		const detailData = parseWorkDetailFromHTML(html);

		logger.info(`作品${productId}の詳細データ取得完了: トラック${detailData.trackInfo.length}件`);
		return detailData;
	} catch (error) {
		logger.error(`作品${productId}の詳細データ取得に失敗:`, error);
		return null;
	}
}
