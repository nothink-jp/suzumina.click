/**
 * SPR-137 の成功指標を算出する純関数群（SPR-298）。
 *
 * GA4 のカスタムイベントは consent ゲートにより本番で0件（SPR-281 で確定・同意率 3.3%）。
 * そのため成功指標は **同意に依存しない Firestore のサーバー側データ**から算出する。
 * ここには Firestore I/O を持ち込まない（読み取りは report.ts が行い、ここは値の変換だけ）。
 *
 * SPR-137 が再定義した指標は 2 つ:
 *   - 「労力あたりの作成ボタン数」 → 作成バースト（セッション）と連続作成間隔で近似する
 *   - 「常連の継続利用」           → 書き込み行動の活動日で近似する
 */

/** 集計の時間軸は JST 固定（運用者・配信の生活時間に合わせる） */
const JST_TIME_ZONE = "Asia/Tokyo";

/**
 * 作成セッションの区切り（分）。
 * これ以上間隔が空いたら「別の機会に座り直した」とみなす。
 * SPR-145 実測の作成フロー（動画を開く→頭出し→保存）は数分単位のため、
 * 30 分は「同じ作業のつもりで続けている」と読める上限として置いた閾値であり、実測由来ではない。
 */
export const DEFAULT_SESSION_GAP_MINUTES = 30;

export type ActivityKind = "create" | "favorite" | "like" | "dislike" | "draft" | "evaluation";

/** audioButtons/{id} の集計に必要な部分だけを取り出した形 */
export interface ButtonRecord {
	id: string;
	creatorId: string;
	creatorName: string;
	createdAt: Date;
	playCount: number;
	likeCount: number;
	favoriteCount: number;
	videoId: string;
}

/** ユーザーの書き込み行動 1 件（作成・お気に入り・リアクション・下書き・作品評価） */
export interface ActivityRecord {
	userId: string;
	at: Date;
	kind: ActivityKind;
}

/** 連続して作られたボタンのまとまり＝「一度座って作った分」 */
export interface CreationSession {
	creatorId: string;
	startedAt: Date;
	endedAt: Date;
	buttonCount: number;
	/** セッション内の連続作成間隔（秒）。要素数は buttonCount - 1 */
	intervalsSeconds: number[];
}

export interface EffortSummary {
	sessions: number;
	buttons: number;
	/** 1 セッション（＝一度の作業）あたり何個作れたか */
	buttonsPerSession: number;
	/**
	 * 連続作成間隔の中央値（秒）＝ 1 ボタンあたりの実作業時間の代理。
	 * 単独作成しかない期間は間隔が存在しないため null。
	 */
	medianIntervalSeconds: number | null;
}

export interface MonthlyCreation {
	month: string;
	buttons: number;
	creators: number;
	/**
	 * 作成があった日数（JST）。セッション閾値に依存しない分母で、
	 * DEFAULT_SESSION_GAP_MINUTES の取り方に結論が左右されていないかの裏取りに使う。
	 */
	days: number;
}

export interface UserActivitySummary {
	userId: string;
	firstAt: Date;
	lastAt: Date;
	/** 何らかの書き込みをした日の数（JST 日付のユニーク数） */
	activeDays: number;
	activeMonths: number;
	counts: Record<ActivityKind, number>;
}

export interface MonthlyActiveUsers {
	month: string;
	users: number;
	/** その月に「作成」を行ったユーザー数（消費だけの月と区別する） */
	creators: number;
}

export interface PlaybackSummary {
	buttons: number;
	totalPlays: number;
	meanPlays: number;
	medianPlays: number;
	zeroPlayButtons: number;
	maxPlays: number;
}

/**
 * 日時フィールドを Date に正規化する。
 *
 * このプロジェクトの日時は型が混在している（CLAUDE.md §1・SPR-75 実測）:
 *   string ISO … audioButtons.createdAt / favorites.addedAt / likes.createdAt / users.*
 *   Timestamp … buttonDrafts.createdAt / evaluations.createdAt
 * 一括移行はしない方針なので、**読み取り側で吸収する**のが正しい置き場所。
 * 解釈できない値は捨てずに null を返し、呼び出し側で件数を報告する（黙って0件にしない）。
 */
export function parseTimestamp(value: unknown): Date | null {
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
	if (typeof value === "string") {
		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}
	if (typeof value === "object" && value !== null) {
		const candidate = value as { toDate?: () => Date; _seconds?: number };
		if (typeof candidate.toDate === "function") return parseTimestamp(candidate.toDate());
		if (typeof candidate._seconds === "number") return new Date(candidate._seconds * 1000);
	}
	return null;
}

/** audioButtons ドキュメントの正規化結果。失敗は理由つきで返し、レポートに件数を出す */
export type ButtonRecordResult =
	| { ok: true; record: ButtonRecord }
	| { ok: false; reason: "createdAt" | "creatorId" };

function firstNonEmptyString(...values: unknown[]): string | null {
	for (const value of values) {
		if (typeof value === "string" && value !== "") return value;
	}
	return null;
}

function firstNumber(...values: unknown[]): number {
	for (const value of values) {
		if (typeof value === "number" && Number.isFinite(value)) return value;
	}
	return 0;
}

/**
 * Firestore の audioButtons ドキュメントを ButtonRecord に正規化する。
 *
 * 旧形式のフィールド揺れ（`createdBy` / `createdByName` / フラットな `playCount`）を吸収する。
 * 正本の変換は `@suzumina.click/shared-types` の `audioButtonTransformers.fromFirestore` だが、
 * **ここでは意図的に流用しない**。あちらは creator を決められないとき `"unknown"` に丸めるため、
 * 作成者不明のドキュメントが複数あると全部 1 人の偽クリエイターに集約され、
 * セッション分割と作成者数が歪む（このレポートの主目的そのものが壊れる）。
 * 表示用には妥当な既定値でも、集計用には**丸めずに落として件数を報告する**のが正しい。
 *
 * 実測（2026-08-02・本番132件）では旧形式は0件だが、静かに壊れる経路を残さないために防御する。
 */
export function toButtonRecord(id: string, data: Record<string, unknown>): ButtonRecordResult {
	const createdAt = parseTimestamp(data.createdAt);
	if (!createdAt) return { ok: false, reason: "createdAt" };

	const creatorId = firstNonEmptyString(data.creatorId, data.createdBy);
	if (!creatorId) return { ok: false, reason: "creatorId" };

	const stats = (data.stats ?? {}) as Record<string, unknown>;
	return {
		ok: true,
		record: {
			id,
			creatorId,
			creatorName: firstNonEmptyString(data.creatorName, data.createdByName) ?? "(不明)",
			createdAt,
			playCount: firstNumber(stats.playCount, data.playCount),
			likeCount: firstNumber(stats.likeCount, data.likeCount),
			favoriteCount: firstNumber(stats.favoriteCount, data.favoriteCount),
			videoId: firstNonEmptyString(data.videoId, data.sourceVideoId) ?? "",
		},
	};
}

/** JST の日付キー（YYYY-MM-DD） */
export function toJstDateKey(date: Date): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: JST_TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(date);
}

/** JST の月キー（YYYY-MM） */
export function toJstMonthKey(date: Date): string {
	return toJstDateKey(date).slice(0, 7);
}

export function median(values: number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 1) return sorted[mid] as number;
	return ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

/**
 * 作成を creator ごとの「セッション」に切り分ける。
 * gapMinutes 以上間隔が空いたら別セッションとして扱う。
 */
export function detectCreationSessions(
	buttons: ButtonRecord[],
	gapMinutes: number = DEFAULT_SESSION_GAP_MINUTES,
): CreationSession[] {
	const gapMs = gapMinutes * 60_000;
	const byCreator = new Map<string, ButtonRecord[]>();
	for (const button of buttons) {
		const list = byCreator.get(button.creatorId);
		if (list) list.push(button);
		else byCreator.set(button.creatorId, [button]);
	}

	const sessions: CreationSession[] = [];
	for (const [creatorId, records] of byCreator) {
		const sorted = [...records].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
		let current: CreationSession | null = null;
		let previousAt: number | null = null;

		for (const record of sorted) {
			const at = record.createdAt.getTime();
			if (current && previousAt !== null && at - previousAt < gapMs) {
				current.buttonCount += 1;
				current.endedAt = record.createdAt;
				current.intervalsSeconds.push((at - previousAt) / 1000);
			} else {
				current = {
					creatorId,
					startedAt: record.createdAt,
					endedAt: record.createdAt,
					buttonCount: 1,
					intervalsSeconds: [],
				};
				sessions.push(current);
			}
			previousAt = at;
		}
	}

	return sessions.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
}

export function summarizeEffort(sessions: CreationSession[]): EffortSummary {
	const buttons = sessions.reduce((sum, s) => sum + s.buttonCount, 0);
	const intervals = sessions.flatMap((s) => s.intervalsSeconds);
	return {
		sessions: sessions.length,
		buttons,
		buttonsPerSession: sessions.length === 0 ? 0 : buttons / sessions.length,
		medianIntervalSeconds: median(intervals),
	};
}

/** セッションを開始月（JST）で束ねて労力指標を出す。作成コストの推移を見るための軸 */
export function summarizeEffortByMonth(
	sessions: CreationSession[],
): Array<{ month: string } & EffortSummary> {
	const byMonth = new Map<string, CreationSession[]>();
	for (const session of sessions) {
		const month = toJstMonthKey(session.startedAt);
		const list = byMonth.get(month);
		if (list) list.push(session);
		else byMonth.set(month, [session]);
	}
	return [...byMonth.entries()]
		.map(([month, list]) => ({ month, ...summarizeEffort(list) }))
		.sort((a, b) => a.month.localeCompare(b.month));
}

export function summarizeCreationByMonth(buttons: ButtonRecord[]): MonthlyCreation[] {
	const byMonth = new Map<string, { creators: Set<string>; days: Set<string>; buttons: number }>();
	for (const button of buttons) {
		const month = toJstMonthKey(button.createdAt);
		const entry = byMonth.get(month) ?? {
			creators: new Set<string>(),
			days: new Set<string>(),
			buttons: 0,
		};
		entry.creators.add(button.creatorId);
		entry.days.add(toJstDateKey(button.createdAt));
		entry.buttons += 1;
		byMonth.set(month, entry);
	}
	return [...byMonth.entries()]
		.map(([month, entry]) => ({
			month,
			buttons: entry.buttons,
			creators: entry.creators.size,
			days: entry.days.size,
		}))
		.sort((a, b) => a.month.localeCompare(b.month));
}

function emptyCounts(): Record<ActivityKind, number> {
	return { create: 0, favorite: 0, like: 0, dislike: 0, draft: 0, evaluation: 0 };
}

export function summarizeUserActivity(activities: ActivityRecord[]): UserActivitySummary[] {
	const byUser = new Map<
		string,
		{ days: Set<string>; months: Set<string>; counts: Record<ActivityKind, number>; ats: number[] }
	>();

	for (const activity of activities) {
		const entry = byUser.get(activity.userId) ?? {
			days: new Set<string>(),
			months: new Set<string>(),
			counts: emptyCounts(),
			ats: [],
		};
		entry.days.add(toJstDateKey(activity.at));
		entry.months.add(toJstMonthKey(activity.at));
		entry.counts[activity.kind] += 1;
		entry.ats.push(activity.at.getTime());
		byUser.set(activity.userId, entry);
	}

	return [...byUser.entries()]
		.map(([userId, entry]) => ({
			userId,
			firstAt: new Date(Math.min(...entry.ats)),
			lastAt: new Date(Math.max(...entry.ats)),
			activeDays: entry.days.size,
			activeMonths: entry.months.size,
			counts: entry.counts,
		}))
		.sort((a, b) => b.activeDays - a.activeDays);
}

export function summarizeMonthlyActiveUsers(activities: ActivityRecord[]): MonthlyActiveUsers[] {
	const byMonth = new Map<string, { users: Set<string>; creators: Set<string> }>();
	for (const activity of activities) {
		const month = toJstMonthKey(activity.at);
		const entry = byMonth.get(month) ?? { users: new Set<string>(), creators: new Set<string>() };
		entry.users.add(activity.userId);
		if (activity.kind === "create") entry.creators.add(activity.userId);
		byMonth.set(month, entry);
	}
	return [...byMonth.entries()]
		.map(([month, entry]) => ({ month, users: entry.users.size, creators: entry.creators.size }))
		.sort((a, b) => a.month.localeCompare(b.month));
}

export function summarizePlayback(buttons: ButtonRecord[]): PlaybackSummary {
	const plays = buttons.map((b) => b.playCount);
	const total = plays.reduce((sum, n) => sum + n, 0);
	return {
		buttons: buttons.length,
		totalPlays: total,
		meanPlays: buttons.length === 0 ? 0 : total / buttons.length,
		medianPlays: median(plays) ?? 0,
		zeroPlayButtons: plays.filter((n) => n === 0).length,
		maxPlays: plays.length === 0 ? 0 : Math.max(...plays),
	};
}
