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
 *
 * 注意: 外部 API は実物（モック厳禁）。地域制限の観測は日本IPからの実行が前提。
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DLsiteApiResponse } from "@suzumina.click/shared-types";
import { batchFetchIndividualInfo } from "../../services/dlsite/individual-info-api-client";
import * as logger from "../../shared/logger";

// パッケージルート（apps/functions）基準のパス
const PACKAGE_ROOT = resolve(__dirname, "../../..");
const DEFAULT_OUT_DIR = join(PACKAGE_ROOT, "tmp/dlsite-capture"); // tmp/ は .gitignore 済み
const ASSET_FILE = join(PACKAGE_ROOT, "src/assets/dlsite-work-ids.json");
const DEFAULT_LIMIT = 20;

/**
 * CLI オプション
 */
export interface CaptureOptions {
	/** 明示指定された作品ID（指定時はアセットファイルを使わない） */
	workIds?: string[];
	/** アセットファイルから取得する件数の上限 */
	limit: number;
	/** 出力ディレクトリ */
	outDir: string;
	/** 同時実行数 */
	concurrency: number;
	/** バッチ間隔(ms) */
	delayMs: number;
	/** raw JSON を保存するか（false でレポートのみ） */
	save: boolean;
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
 * 人間可読のレポート文字列を組み立てる（純粋関数）
 */
export function formatReport(report: FieldUsageReport, unavailableWorkIds: string[]): string {
	const lines: string[] = [];
	lines.push("=====================================");
	lines.push(
		`📊 DLsite dry-run 捕捉レポート（成功 ${report.total} 件 / 取得不可 ${unavailableWorkIds.length} 件）`,
	);
	lines.push("=====================================");

	lines.push("");
	lines.push(
		`🆕 スキーマ未モデルのフィールド（${report.unknownFields.length}種・新規 drift はここに現れる）:`,
	);
	if (report.unknownFields.length === 0) {
		lines.push("  なし");
	} else {
		const shown = report.unknownFields.slice(0, 25);
		lines.push(`  ${shown.map((u) => u.field).join(", ")}`);
		if (report.unknownFields.length > 25) {
			lines.push(`  ... 他${report.unknownFields.length - 25}種（全量は report.json 参照）`);
		}
		lines.push(
			"  ※ DLsite API は約254フィールド。本スキーマは必要分のみモデル化のため、既存の未モデル分を多く含む。",
		);
		lines.push("  ※ 継続的な drift 監視は前回 report.json との差分で行うこと。");
	}

	lines.push("");
	lines.push("⚠️  消失フィールド（既知だが今回1件も出現せず）:");
	if (report.absentKnownFields.length === 0) {
		lines.push("  なし");
	} else {
		lines.push(`  ${report.absentKnownFields.join(", ")}`);
		lines.push(
			"  ※ 少数サンプルでは条件付き出現フィールド（prices/sales_status/rate_* 等）が多数並ぶ。" +
				"消失（drift）の判定は十分な件数で行うこと。",
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
 * アセットファイルから作品IDを読み込む
 */
function loadAssetWorkIds(): string[] {
	const data = JSON.parse(readFileSync(ASSET_FILE, "utf-8"));
	return (data.workIds ?? []) as string[];
}

/**
 * 解析対象の作品IDを決定する
 */
function resolveTargetWorkIds(opts: CaptureOptions): string[] {
	if (opts.workIds && opts.workIds.length > 0) {
		return opts.workIds;
	}
	const all = loadAssetWorkIds();
	return all.slice(0, opts.limit);
}

async function main(): Promise<void> {
	const opts = parseArgs(process.argv.slice(2));
	const workIds = resolveTargetWorkIds(opts);

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
					fieldUsage: report,
				},
				null,
				2,
			),
		);
	}

	process.stdout.write(`${formatReport(report, failedWorkIds)}\n`);
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
