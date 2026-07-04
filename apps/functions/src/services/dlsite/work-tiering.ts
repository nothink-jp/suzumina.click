/**
 * dlsite 作品のティア分類ユーティリティ（SPR-229）
 *
 * 作品を「変化の質×頻度」で new/volatile/stable に分類し、per-run で取得すべき
 * 作品ID（due-set）を絞り込む。ティア判定は既に取得済みの existingWorksMap のみを見て行い、
 * 追加の Firestore 読み取りは発生しない。stable ティアのみ、当日分 priceHistory が
 * 存在するかどうかで実際の取得要否（due）を決める（この Firestore 読み取り自体は
 * 呼び出し側であらかじめバルク確認した結果を Set として受け取る。cf. dlsite-individual-info-api.ts）。
 */

import type { WorkDocument } from "@suzumina.click/shared-types";

export type WorkTier = "new" | "volatile" | "stable";

/** volatile 判定に使うリリース直近日数の閾値（暫定値、SPR-229 Stage③で本番実測を見て調整） */
export const VOLATILE_RELEASE_WINDOW_DAYS = 90;

/**
 * releaseDateISO が基準日から直近 windowDays 日以内かどうかを判定する
 *
 * @param releaseDateISO ISO8601形式のリリース日時
 * @param windowDays 直近とみなす日数
 * @param today 基準日時（テスト容易性のため注入。JST/UTCどちらでも日数差分は変わらない）
 */
function isWithinRecentDays(
	releaseDateISO: string | undefined,
	windowDays: number,
	today: Date,
): boolean {
	if (!releaseDateISO) {
		// リリース日不明は情報不足であり、stable（低頻度）に倒すと更新機会を失うリスクが
		// あるため安全側（volatile）に倒す。本番実測ではreleaseDateISO欠損率は0%（2026-07-05確認）。
		return true;
	}

	const releaseDate = new Date(releaseDateISO);
	if (Number.isNaN(releaseDate.getTime())) {
		return true;
	}

	const diffDays = (today.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24);
	return diffDays <= windowDays;
}

/**
 * 既存作品情報からティアを判定する
 *
 * @param existing 既存のWorkDocument（`works` 不在なら undefined）
 * @param today 基準日時（テスト容易性のため注入）
 */
export function classifyWorkTier(existing: WorkDocument | undefined, today: Date): WorkTier {
	if (!existing) {
		return "new";
	}
	if (existing.salesStatus?.isSale === true) {
		return "volatile";
	}
	if (isWithinRecentDays(existing.releaseDateISO, VOLATILE_RELEASE_WINDOW_DAYS, today)) {
		return "volatile";
	}
	return "stable";
}

/**
 * 作品IDをティアへ一括分類する（各IDにつき classifyWorkTier は1回だけ呼ぶ）
 *
 * `getStableCandidateIds` と `classifyAndFilterStableTier` はこの結果（Map）を再利用する。
 * 呼び出し側で個別に分類し直すと同じ作品を2回ずつ分類することになるため、
 * 分類は必ずここで1回だけ行う。
 */
export function classifyWorkTiers(
	workIds: string[],
	existingWorksMap: Map<string, WorkDocument>,
	today: Date,
): Map<string, WorkTier> {
	const tiers = new Map<string, WorkTier>();
	for (const id of workIds) {
		tiers.set(id, classifyWorkTier(existingWorksMap.get(id), today));
	}
	return tiers;
}

/**
 * stable候補（= new/volatile以外）の作品IDを抽出する
 *
 * 呼び出し側（dlsite-individual-info-api.ts）はこの結果に対してのみ
 * `priceHistory/{today}` の存在確認をバルクで行う（stable候補以外は対象外にすることで
 * 無駄な読み取りを避ける）。
 *
 * @param workIds 対象の作品ID
 * @param tiers `classifyWorkTiers` で事前に計算したティア分類結果
 */
export function getStableCandidateIds(workIds: string[], tiers: Map<string, WorkTier>): string[] {
	return workIds.filter((id) => tiers.get(id) === "stable");
}

/** ティア別に振り分けた作品ID */
export interface TieredWorkIds {
	newIds: string[];
	volatileIds: string[];
	/** stable のうち当日分 priceHistory が不在 → 今回取得対象 */
	stableDueIds: string[];
	/** stable のうち当日分 priceHistory が存在 → 今回スキップ */
	stableSkippedIds: string[];
}

/**
 * 作品IDをティア別に分類し、stableティアは当日分priceHistoryの有無でdue/skipに振り分ける
 *
 * @param workIds 対象の全作品ID（scrape順）
 * @param tiers `classifyWorkTiers` で事前に計算したティア分類結果（`getStableCandidateIds` と
 *   同じ結果を再利用し、作品ごとの分類を2回行わない）
 * @param priceHistoryTodayExists 当日分 priceHistory が既に存在する作品IDの集合
 *   （`getStableCandidateIds` で絞った候補のみを対象にあらかじめバルク確認した結果を渡す）
 */
export function classifyAndFilterStableTier(
	workIds: string[],
	tiers: Map<string, WorkTier>,
	priceHistoryTodayExists: Set<string>,
): TieredWorkIds {
	const newIds: string[] = [];
	const volatileIds: string[] = [];
	const stableDueIds: string[] = [];
	const stableSkippedIds: string[] = [];

	for (const workId of workIds) {
		// tiers に無い workId は呼び出し側の不整合（classifyWorkTiers に渡した workIds と
		// 異なる集合を渡した場合）。安全側（毎run取得＝new扱い）に倒し、stable-skipへの
		// 誤混入を防ぐ。
		const tier = tiers.get(workId) ?? "new";
		if (tier === "new") {
			newIds.push(workId);
		} else if (tier === "volatile") {
			volatileIds.push(workId);
		} else if (priceHistoryTodayExists.has(workId)) {
			stableSkippedIds.push(workId);
		} else {
			stableDueIds.push(workId);
		}
	}

	return { newIds, volatileIds, stableDueIds, stableSkippedIds };
}

/**
 * ティア分類の結果から、今回のrunで実際に取得すべき作品ID（due-set）を組み立てる
 *
 * 並び順は new → volatile → stable の順を保つ（新作fast-lane・work-ordering.tsの意図を踏襲）。
 */
export function toDueWorkIds(tiered: TieredWorkIds): string[] {
	return [...tiered.newIds, ...tiered.volatileIds, ...tiered.stableDueIds];
}
