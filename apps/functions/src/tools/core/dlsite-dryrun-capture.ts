#!/usr/bin/env tsx
/**
 * DLsite dry-run + raw 捕捉ツール（SPR-139）
 *
 * 実 DLsite Individual Info API を日本IP（ローカル）から叩き、
 *   - Firestore へは一切書かない（dry-run・観測専用）
 *   - 取得した raw レスポンスを JSON で保存（スキーマ差分の入力／統合テストの fixture 兼用）
 *   - スキーマ差分（未知フィールド / 存在率 / 消失フィールド）と取得不可作品をレポート
 * する。
 *
 * 目的:
 *   - 動機②: GCP（海外IP）では取得できない地域/レーティング制限作品を、日本IPで観測・証跡化する。
 *   - 動機③: DLsite API の不定期なスキーマ変更（フィールド増減）を捕捉する。
 *
 * 使い方（実 API を叩くため件数を絞ること。Firestore/ADC は不要）:
 *   pnpm --filter @suzumina.click/functions tools:capture -- --limit 20
 *   pnpm --filter @suzumina.click/functions tools:capture -- --workid RJ01234567,RJ07654321
 *   pnpm --filter @suzumina.click/functions tools:capture -- --limit 50 --out apps/functions/tmp/x --no-save
 *   # 前回比 drift: 前回の baseline(JSON配列 / report.json) と比較
 *   pnpm --filter @suzumina.click/functions tools:capture -- --limit 150 --baseline tmp/prev.json
 *   # 今回の観測フィールド集合を baseline として書き出す
 *   pnpm --filter @suzumina.click/functions tools:capture -- --limit 150 --update-baseline tmp/baseline.json
 *
 * ベースライン比: 既定は SPR-140 の KNOWN_FIELDS（本番 drift 検知と同じ基準）。
 *   --baseline でカスタム JSON（string[] / {fields:[]} / capture の report.json）に差し替え可能。
 *
 * 注意: 外部 API は実物（モック厳禁）。地域制限の観測は日本IPからの実行が前提。
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DLsiteApiResponse } from "@suzumina.click/shared-types";
import { batchFetchIndividualInfo } from "../../services/dlsite/individual-info-api-client";
import { KNOWN_FIELDS } from "../../services/dlsite/schema-drift";
import { collectAllWorkIds } from "../../services/dlsite/work-id-collector";
import * as logger from "../../shared/logger";

// パッケージルート（apps/functions）基準のパス
const PACKAGE_ROOT = resolve(__dirname, "../../..");
const DEFAULT_OUT_DIR = join(PACKAGE_ROOT, "tmp/dlsite-capture"); // tmp/ は .gitignore 済み
// scrape は 100件/ページ（work-id-collector の per_page）。--limit から必要ページ数を逆算する
const SCRAPE_PAGE_SIZE = 100;
const DEFAULT_LIMIT = 20;
// この件数未満で baseline を書き出すと、条件付きフィールドの取りこぼしで後の比較が誤検知しやすい
const MIN_RELIABLE_BASELINE_SAMPLE = 50;

/**
 * CLI オプション
 */
export interface CaptureOptions {
	/** 明示指定された作品ID（指定時はローカル scrape を行わない） */
	workIds?: string[];
	/** ローカル scrape（最新順）から取得する件数の上限 */
	limit: number;
	/** 出力ディレクトリ */
	outDir: string;
	/** 同時実行数 */
	concurrency: number;
	/** バッチ間隔(ms) */
	delayMs: number;
	/** raw JSON を保存するか（false でレポートのみ） */
	save: boolean;
	/** ベースライン比較に使うフィールド集合の JSON パス（未指定なら SPR-140 の KNOWN_FIELDS） */
	baselinePath?: string;
	/** 観測フィールド集合の和集合を JSON 配列で書き出すパス（前回比の baseline 更新用） */
	updateBaselinePath?: string;
}

/**
 * ベースライン比較の差分（純粋関数の出力）
 */
export interface BaselineDiff {
	/** 基準フィールド数 */
	baselineSize: number;
	/** ベースラインに無い＝今回新たに観測されたフィールド（＝真の新規 drift） */
	newFields: string[];
	/** ベースラインにあるが今回観測されなかったフィールド（少数サンプルでは条件付きフィールド多数） */
	goneFields: string[];
}

/**
 * フィールド使用状況レポート（純粋関数の出力・テスト対象）
 */
export interface FieldUsageReport {
	/** 解析対象の成功レスポンス数 */
	total: number;
	/** 既知フィールドの出現数・出現率（多い順） */
	presence: Array<{ field: string; count: number; ratio: number }>;
	/** スキーマ未定義（＝新規/未知）フィールドの出現数（多い順） */
	unknownFields: Array<{ field: string; count: number }>;
	/** 既知フィールドのうち今回1件も出現しなかったもの（＝消失の可能性） */
	absentKnownFields: string[];
}

const toInt = (value: string, fallback: number, min: number): number =>
	Math.max(min, Number.parseInt(value, 10) || fallback);

const splitIds = (value: string): string[] =>
	value
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);

/**
 * 値を取る各フラグの適用ロジック（switch のネストを避けてフラットに保つ）
 */
const VALUE_FLAGS: Record<string, (opts: CaptureOptions, value: string) => void> = {
	"--workid": (opts, v) => opts.workIds?.push(...splitIds(v)),
	"--workids": (opts, v) => opts.workIds?.push(...splitIds(v)),
	"--limit": (opts, v) => {
		opts.limit = toInt(v, DEFAULT_LIMIT, 1);
	},
	"--out": (opts, v) => {
		opts.outDir = resolve(v);
	},
	"--concurrency": (opts, v) => {
		opts.concurrency = toInt(v, opts.concurrency, 1);
	},
	"--delay": (opts, v) => {
		opts.delayMs = toInt(v, opts.delayMs, 0);
	},
	"--baseline": (opts, v) => {
		opts.baselinePath = resolve(v);
	},
	"--update-baseline": (opts, v) => {
		opts.updateBaselinePath = resolve(v);
	},
};

/**
 * 引数をパースする（純粋関数）
 */
export function parseArgs(argv: string[]): CaptureOptions {
	// workIds は一旦空配列で受けておき、VALUE_FLAGS から push する。最後に空なら undefined に戻す。
	const opts: CaptureOptions = {
		workIds: [],
		limit: DEFAULT_LIMIT,
		outDir: DEFAULT_OUT_DIR,
		concurrency: 5,
		delayMs: 400,
		save: true,
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === undefined) {
			continue;
		}
		if (arg === "--no-save") {
			opts.save = false;
			continue;
		}
		const apply = VALUE_FLAGS[arg];
		const next = argv[i + 1];
		if (apply && next !== undefined) {
			apply(opts, next);
			i++;
		}
	}

	if (!opts.workIds || opts.workIds.length === 0) {
		opts.workIds = undefined;
	}
	return opts;
}

/**
 * DLsiteApiResponse スキーマの既知トップレベルフィールド集合（純粋関数）
 */
export function knownTopLevelFields(): Set<string> {
	return new Set(Object.keys(DLsiteApiResponse.shape));
}

/**
 * 取得した raw レスポンス群からフィールド使用状況を解析する（純粋関数）。
 *
 * トップレベルのキーのみを対象とする（ネストの drift はスコープ外）。
 */
export function analyzeFields(
	responses: Array<Record<string, unknown>>,
	knownFields: Set<string>,
): FieldUsageReport {
	const total = responses.length;
	const counts = new Map<string, number>();
	const unknownCounts = new Map<string, number>();

	for (const res of responses) {
		for (const key of Object.keys(res)) {
			if (knownFields.has(key)) {
				counts.set(key, (counts.get(key) ?? 0) + 1);
			} else {
				unknownCounts.set(key, (unknownCounts.get(key) ?? 0) + 1);
			}
		}
	}

	const byCountThenName = (
		a: { field: string; count: number },
		b: { field: string; count: number },
	) => b.count - a.count || a.field.localeCompare(b.field);

	const presence = Array.from(counts.entries())
		.map(([field, count]) => ({ field, count, ratio: total > 0 ? count / total : 0 }))
		.sort(byCountThenName);

	const unknownFields = Array.from(unknownCounts.entries())
		.map(([field, count]) => ({ field, count }))
		.sort(byCountThenName);

	const seen = new Set(counts.keys());
	const absentKnownFields = Array.from(knownFields)
		.filter((f) => !seen.has(f))
		.sort();

	return { total, presence, unknownFields, absentKnownFields };
}

/**
 * 取得した raw レスポンス群から観測されたトップレベルフィールドの和集合を返す（純粋関数・ソート済み）
 */
export function observedFieldSet(responses: Array<Record<string, unknown>>): string[] {
	const fields = new Set<string>();
	for (const res of responses) {
		if (!res || typeof res !== "object") continue;
		for (const key of Object.keys(res)) {
			fields.add(key);
		}
	}
	return Array.from(fields).sort();
}

/**
 * 観測フィールドをベースラインと比較し、新規/消失を算出する（純粋関数）
 */
export function diffBaseline(observed: string[], baseline: ReadonlySet<string>): BaselineDiff {
	const observedSet = new Set(observed);
	const newFields = observed.filter((f) => !baseline.has(f)).sort();
	const goneFields = Array.from(baseline)
		.filter((f) => !observedSet.has(f))
		.sort();
	return { baselineSize: baseline.size, newFields, goneFields };
}

/**
 * baseline JSON の中身からフィールド名配列を取り出す（純粋関数）。
 * 受理する形式: string[] / { fields: string[] } / capture の report.json（fieldUsage を持つ）。
 */
export function extractFieldsFromBaselineJson(parsed: unknown): string[] {
	if (Array.isArray(parsed)) {
		return parsed.filter((x): x is string => typeof x === "string");
	}
	if (parsed && typeof parsed === "object") {
		const obj = parsed as Record<string, unknown>;
		if (Array.isArray(obj.fields)) {
			return obj.fields.filter((x): x is string => typeof x === "string");
		}
		const fu = obj.fieldUsage as
			| { presence?: Array<{ field?: unknown }>; unknownFields?: Array<{ field?: unknown }> }
			| undefined;
		if (fu) {
			return [...(fu.presence ?? []), ...(fu.unknownFields ?? [])]
				.map((e) => e.field)
				.filter((x): x is string => typeof x === "string");
		}
	}
	throw new Error(
		"baseline ファイルの形式を認識できません（string[] / {fields:[]} / capture の report.json）",
	);
}

/**
 * baseline JSON ファイルを読み、フィールド集合を返す
 */
function loadBaselineFields(path: string): Set<string> {
	const parsed = JSON.parse(readFileSync(path, "utf-8"));
	return new Set(extractFieldsFromBaselineJson(parsed));
}

/**
 * 人間可読のレポート文字列を組み立てる（純粋関数）
 */
export function formatReport(
	report: FieldUsageReport,
	baselineDiff: BaselineDiff,
	unavailableWorkIds: string[],
): string {
	const lines: string[] = [];
	lines.push("=====================================");
	lines.push(
		`📊 DLsite dry-run 捕捉レポート（成功 ${report.total} 件 / 取得不可 ${unavailableWorkIds.length} 件）`,
	);
	lines.push("=====================================");

	// 主シグナル: ベースライン比（新規＝真の drift / 消失）
	lines.push("");
	lines.push(`🔎 ベースライン比（基準 ${baselineDiff.baselineSize} フィールド）:`);
	lines.push(
		`  🆕 新規（ベースライン外＝真の drift）: ${
			baselineDiff.newFields.length === 0 ? "なし" : baselineDiff.newFields.join(", ")
		}`,
	);
	if (baselineDiff.goneFields.length === 0) {
		lines.push("  ⚠️  消失（今回未観測）: なし");
	} else {
		const shownGone = baselineDiff.goneFields.slice(0, 25);
		lines.push(
			`  ⚠️  消失（今回未観測・${baselineDiff.goneFields.length}種）: ${shownGone.join(", ")}${
				baselineDiff.goneFields.length > 25 ? ` ... 他${baselineDiff.goneFields.length - 25}種` : ""
			}`,
		);
		lines.push(
			"  ※ 少数サンプルでは条件付き出現フィールド（prices/sales_status/rate_* 等）が多数並ぶ。" +
				"消失 drift の判定は十分な件数で行うこと。",
		);
	}

	lines.push("");
	lines.push(`🧬 スキーマ未モデルのフィールド（vs Zod・${report.unknownFields.length}種・参考）:`);
	if (report.unknownFields.length === 0) {
		lines.push("  なし");
	} else {
		const shown = report.unknownFields.slice(0, 25);
		lines.push(`  ${shown.map((u) => u.field).join(", ")}`);
		if (report.unknownFields.length > 25) {
			lines.push(`  ... 他${report.unknownFields.length - 25}種（全量は report.json 参照）`);
		}
		lines.push(
			"  ※ DLsite API は約254フィールド。本スキーマは必要分のみモデル化のため未モデル分を多く含む（drift 判定はベースライン比を参照）。",
		);
	}

	lines.push("");
	lines.push("📈 既知フィールドの出現率（低い順の下位10件＝偏りの兆候）:");
	const lowest = [...report.presence].sort((a, b) => a.ratio - b.ratio).slice(0, 10);
	for (const { field, count, ratio } of lowest) {
		lines.push(`  - ${field}: ${count}/${report.total} (${(ratio * 100).toFixed(0)}%)`);
	}

	lines.push("");
	lines.push("🚫 取得不可（404/検証失敗等。日本IPでも取れない＝真に不在の基準）:");
	if (unavailableWorkIds.length === 0) {
		lines.push("  なし");
	} else {
		const shown = unavailableWorkIds.slice(0, 30);
		lines.push(
			`  ${shown.join(", ")}${unavailableWorkIds.length > 30 ? ` ... 他${unavailableWorkIds.length - 30}件` : ""}`,
		);
		lines.push(
			"  ※ レーティング起因 vs 地理起因の区別は Individual Info API の 404 からは判定不可（要 search API 突合）。",
		);
	}
	lines.push("=====================================");
	return lines.join("\n");
}

/**
 * 解析対象の作品IDを決定する。
 * --workid 未指定時はローカル scrape（最新順）から limit 件を取る
 * （旧 asset `dlsite-work-ids.json` は stale のため SPR-232 で撤去済み）。
 */
async function resolveTargetWorkIds(opts: CaptureOptions): Promise<string[]> {
	if (opts.workIds && opts.workIds.length > 0) {
		return opts.workIds;
	}
	const scraped = await collectAllWorkIds({
		maxPages: Math.ceil(opts.limit / SCRAPE_PAGE_SIZE),
	});
	return scraped.workIds.slice(0, opts.limit);
}

async function main(): Promise<void> {
	const opts = parseArgs(process.argv.slice(2));
	const workIds = await resolveTargetWorkIds(opts);

	logger.info("🔍 DLsite dry-run + raw 捕捉を開始（実 API・Firestore 非書き込み）", {
		targets: workIds.length,
		concurrency: opts.concurrency,
		save: opts.save,
		outDir: opts.save ? opts.outDir : "(保存なし)",
	});

	const startTime = Date.now();
	const { results, failedWorkIds } = await batchFetchIndividualInfo(workIds, {
		maxConcurrent: opts.concurrency,
		batchDelay: opts.delayMs,
	});
	const elapsed = Date.now() - startTime;

	// 保存先ディレクトリは事前に1回だけ作成する
	const rawDir = join(opts.outDir, "raw");
	if (opts.save) {
		mkdirSync(rawDir, { recursive: true });
	}

	// 成功した raw レスポンス（未知キーを含む生オブジェクト）を収集
	const rawResponses: Array<Record<string, unknown>> = [];
	for (const [workId, data] of results.entries()) {
		const raw = data as unknown as Record<string, unknown>;
		rawResponses.push(raw);
		if (opts.save) {
			writeFileSync(join(rawDir, `${workId}.json`), JSON.stringify(raw, null, 2));
		}
	}

	const report = analyzeFields(rawResponses, knownTopLevelFields());

	// ベースライン比（既定は SPR-140 の KNOWN_FIELDS。--baseline で前回 report.json 等に差し替え可能）
	const observed = observedFieldSet(rawResponses);
	const baseline = opts.baselinePath ? loadBaselineFields(opts.baselinePath) : KNOWN_FIELDS;
	const baselineDiff = diffBaseline(observed, baseline);

	// 観測フィールド集合を baseline として書き出す（前回比の更新用）
	if (opts.updateBaselinePath) {
		if (rawResponses.length < MIN_RELIABLE_BASELINE_SAMPLE) {
			logger.warn(
				`baseline を ${rawResponses.length}件 の小サンプルから書き出します。条件付きフィールドを取りこぼし、` +
					`後の比較で実在フィールドが「新規」誤検知されやすい。--limit ${MIN_RELIABLE_BASELINE_SAMPLE} 以上を推奨。`,
			);
		}
		writeFileSync(opts.updateBaselinePath, JSON.stringify(observed, null, 2));
		logger.info(`観測フィールド集合(${observed.length}種)を baseline に書き出しました`, {
			path: opts.updateBaselinePath,
		});
	}

	if (opts.save) {
		// outDir は rawDir 作成時に併せて作られている
		writeFileSync(
			join(opts.outDir, "report.json"),
			JSON.stringify(
				{
					capturedAt: new Date().toISOString(),
					targets: workIds.length,
					succeeded: rawResponses.length,
					unavailable: failedWorkIds,
					observedFields: observed,
					baselineDiff,
					fieldUsage: report,
				},
				null,
				2,
			),
		);
	}

	process.stdout.write(`${formatReport(report, baselineDiff, failedWorkIds)}\n`);
	logger.info(
		`✅ 完了（成功 ${rawResponses.length}/${workIds.length}件・${(elapsed / 1000).toFixed(1)}s）${
			opts.save ? ` / 保存先: ${opts.outDir}` : ""
		}`,
	);
}

// スクリプト実行
if (require.main === module) {
	main().catch((error) => {
		logger.error("DLsite dry-run 捕捉エラー:", {
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	});
}
