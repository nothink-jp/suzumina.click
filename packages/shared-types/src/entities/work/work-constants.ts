/**
 * Work Constants
 *
 * Constants and display name mappings for DLsite works.
 * Separated for better maintainability.
 */

import type { WorkCategory, WorkLanguage } from "./work-types";

/**
 * DLsite作品カテゴリコードから日本語表示名へのマッピング（カテゴリ表示名の正本）
 * 表示名は DLsite の検索ファセットの表記に合わせる
 */
export const WORK_CATEGORY_DISPLAY_NAMES: Record<WorkCategory, string> = {
	ACN: "アクション",
	QIZ: "クイズ",
	ADV: "アドベンチャー",
	RPG: "ロールプレイング",
	TBL: "テーブル",
	DNV: "デジタルノベル",
	SLN: "シミュレーション",
	TYP: "タイピング",
	STG: "シューティング",
	PZL: "パズル",
	ETC: "その他ゲーム",
	MNG: "マンガ",
	SCM: "劇画",
	WBT: "タテヨミ",
	ICG: "CG・イラスト",
	NRE: "ノベル",
	KSV: "官能小説",
	MOV: "動画",
	SOU: "ボイス・ASMR",
	MUS: "音楽",
	TOL: "ツール/アクセサリ",
	IMT: "画像素材",
	AMT: "音素材",
	ET3: "その他",
	VCM: "ボイスコミック",
	etc: "未分類",
} as const;

/**
 * DLsite作品言語コードから日本語表示名へのマッピング
 */
export const WORK_LANGUAGE_DISPLAY_NAMES: Record<WorkLanguage, string> = {
	ja: "日本語",
	en: "英語",
	"zh-cn": "简体中文",
	"zh-tw": "繁體中文",
	ko: "한국어",
	es: "Español",
	th: "ไทย",
	de: "Deutsch",
	fr: "Français",
	it: "Italiano",
	pt: "Português",
	ru: "Русский",
	vi: "Tiếng Việt",
	id: "Bahasa Indonesia",
	"not-required": "言語不要",
	"dlsite-official": "DLsite公式",
	other: "その他言語",
} as const;

/**
 * Individual Info API年齢カテゴリマッピング
 */
export const AGE_CATEGORY_LABELS: Record<number, string> = {
	1: "全年齢",
	2: "R-15",
	3: "18禁",
} as const;

/**
 * Individual Info API年齢カテゴリ文字列マッピング
 */
export const AGE_CATEGORY_STRING_LABELS: Record<string, string> = {
	general: "全年齢",
	r15: "R-15",
	adult: "18禁",
} as const;

/**
 * ゲーム系作品カテゴリコード
 */
export const GAME_CATEGORY_CODES = [
	"ACN",
	"QIZ",
	"ADV",
	"RPG",
	"TBL",
	"DNV",
	"SLN",
	"TYP",
	"STG",
	"PZL",
	"ETC",
] as const satisfies readonly WorkCategory[];

/**
 * マンガ・イラスト系作品カテゴリコード
 */
export const MANGA_CATEGORY_CODES = [
	"MNG",
	"SCM",
	"WBT",
	"ICG",
] as const satisfies readonly WorkCategory[];

/**
 * サポートされている言語コード
 */
export const SUPPORTED_LANGUAGES = [
	"ja",
	"en",
	"zh-cn",
	"zh-tw",
	"ko",
	"es",
	"th",
	"de",
	"fr",
	"it",
	"pt",
	"ru",
	"vi",
	"id",
] as const;

/**
 * 言語コード変換マッピング（DLsite APIコード → 正規化コード）
 */
export const LANGUAGE_CODE_MAPPING: Record<string, WorkLanguage> = {
	// 日本語
	ja: "ja",
	"ja-jp": "ja",
	japanese: "ja",
	jpn: "ja",
	jp: "ja", // SPR-184: transformer LANGUAGE_CODE_MAP から統合

	// 英語
	en: "en",
	"en-us": "en",
	"en-gb": "en",
	english: "en",
	eng: "en",

	// 簡体中文
	"zh-cn": "zh-cn",
	zh_cn: "zh-cn",
	chinese_simplified: "zh-cn",
	chs: "zh-cn",
	chi_hans: "zh-cn",
	// SPR-184: transformer LANGUAGE_CODE_MAP から統合
	zho: "zh-cn",
	zh: "zh-cn",
	chi: "zh-cn",
	chn: "zh-cn",

	// 繁体中文
	"zh-tw": "zh-tw",
	zh_tw: "zh-tw",
	chinese_traditional: "zh-tw",
	cht: "zh-tw",
	chi_hant: "zh-tw",
	// SPR-184: transformer LANGUAGE_CODE_MAP から統合
	zht: "zh-tw",
	tw: "zh-tw",

	// 韓国語
	ko: "ko",
	"ko-kr": "ko",
	ko_kr: "ko",
	korean: "ko",
	kor: "ko",
	kr: "ko", // SPR-184: transformer LANGUAGE_CODE_MAP から統合

	// スペイン語
	es: "es",
	spanish: "es",
	spa: "es",

	// タイ語
	th: "th",
	thai: "th",
	tha: "th",

	// ドイツ語
	de: "de",
	german: "de",
	ger: "de",
	deu: "de",

	// フランス語
	fr: "fr",
	french: "fr",
	fra: "fr",
	fre: "fr",

	// イタリア語
	it: "it",
	italian: "it",
	ita: "it",

	// ポルトガル語
	pt: "pt",
	portuguese: "pt",
	por: "pt",

	// ロシア語
	ru: "ru",
	russian: "ru",
	rus: "ru",

	// ベトナム語
	vi: "vi",
	vietnamese: "vi",
	vie: "vi",
	vn: "vi", // SPR-184: transformer LANGUAGE_CODE_MAP から統合

	// インドネシア語
	id: "id",
	indonesian: "id",
	ind: "id",
	idn: "id",
} as const;
