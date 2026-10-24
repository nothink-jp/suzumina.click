/**
 * 作品関連の共通定数
 */

import { WORK_CATEGORY_DISPLAY_NAMES, type WorkCategory } from "@suzumina.click/shared-types";

/** 作品一覧の絞り込みに出すカテゴリ（このサイトの作品に出てくる種別に絞る。表示名の正本は shared-types） */
const WORK_CATEGORY_FILTER_CODES = [
	"SOU",
	"ADV",
	"RPG",
	"MOV",
	"MNG",
	"ICG",
	"TOL",
	"ET3",
	"SLN",
	"ACN",
	"PZL",
	"QIZ",
	"TBL",
	"DNV",
	"etc",
] as const satisfies readonly WorkCategory[];

export const WORK_CATEGORY_OPTIONS = WORK_CATEGORY_FILTER_CODES.map((value) => ({
	value,
	label: WORK_CATEGORY_DISPLAY_NAMES[value],
}));

// 言語オプション
export const WORK_LANGUAGE_OPTIONS = [
	{ value: "ja", label: "日本語" },
	{ value: "en", label: "英語" },
	{ value: "zh-cn", label: "簡体中文" },
	{ value: "zh-tw", label: "繁體中文" },
	{ value: "ko", label: "한국어" },
	{ value: "es", label: "Español" },
	{ value: "not-required", label: "言語不要" },
	{ value: "dlsite-official", label: "DLsite公式" },
	{ value: "other", label: "その他言語" },
];
