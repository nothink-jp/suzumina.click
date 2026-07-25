/**
 * メモリ診断ログ（SPR-277）
 *
 * 目的は2つで、どちらも「本番のウォームインスタンスでしか観測できない」ものを可視化する。
 *
 *   1. **V8 が容器サイズを見ているか**（cold start 時に1回）。`--max-old-space-size` 未指定のとき
 *      V8 は cgroup 上限ではなくホストの物理メモリからヒープ上限を決めることがある。その場合
 *      「使用量が容器上限に迫っても V8 は余裕があると判断して full GC を急がない」ため、RSS が
 *      単調に伸びてコンテナ側に殺される。`heap_size_limit_mb` が容器サイズ（512Mi）を大きく
 *      超えていればこれが起きている＝`NODE_OPTIONS=--max-old-space-size` の設定が是正手段になる。
 *   2. **増加が run 回数に比例するか、経過時間に比例するか**（run ごと）。`run_index` は
 *      このインスタンスで何回目の run かを表すため、`rss_mb` を run_index で回帰すれば
 *      「run あたり何 MB 増えるか」が直接出る。`uptime_sec` と併せて見ることで、
 *      run 起因（処理が残す何か）と時間起因（アイドル中も伸びる何か）を切り分けられる。
 *
 * ここは**診断専用**でアラートは持たない（使用率のアラートは SPR-235 の
 * `YouTube Function Memory Pressure` が Cloud Run のメトリクスから既に見ている）。
 *
 * 数値キーを英語にしているのは §1 の「監視の契約になるキーは英語」に従うため。
 * log-based メトリクス化するときにそのままフィルタ・数値比較の対象にできる。
 */

import { getHeapStatistics } from "node:v8";
import * as logger from "./logger";

const BYTES_PER_MB = 1024 * 1024;

/** このインスタンスが処理した run の回数（プロセス生存中のみ単調増加する有界なカウンタ） */
let runCount = 0;

function toMb(bytes: number): number {
	return Math.round((bytes / BYTES_PER_MB) * 10) / 10;
}

/**
 * V8 / プロセスに見えているメモリ上限を1回だけログに出す（cold start 診断）
 *
 * `constrained_memory_mb` が 0 のときは cgroup 上限を検出できていない＝V8 はホストの
 * 物理メモリを基準にヒープを設計している。この値と `heap_size_limit_mb` の組み合わせが
 * 「GC 圧が掛からないまま RSS が伸びる」仮説の判定材料になる。
 */
export function logRuntimeMemoryLimits(): void {
	const constrainedMemory = process.constrainedMemory?.() ?? 0;

	logger.info("Node.js runtime memory limits", {
		metric_type: "runtime_memory_limits",
		heap_size_limit_mb: toMb(getHeapStatistics().heap_size_limit),
		constrained_memory_mb: toMb(constrainedMemory),
		available_memory_mb: toMb(process.availableMemory?.() ?? 0),
		function_target: process.env.FUNCTION_TARGET ?? "unknown",
	});
}

/**
 * run 完了時のメモリ使用量をログに出す
 *
 * 成功・失敗どちらの経路でも必ず出す（失敗した run だけが何かを残している可能性を
 * 潰せなくなるため）。呼び出し側は finally から呼ぶ。
 *
 * @param mode run の実行モード（normal / fast_recheck / weekly_full_sweep など）。
 *   モードごとに処理量が違うため、混ぜたまま回帰すると傾きがぼやける
 */
export function logRunMemoryUsage(mode: string): void {
	runCount += 1;
	const usage = process.memoryUsage();

	logger.info("Run memory usage", {
		metric_type: "run_memory_usage",
		mode,
		run_index: runCount,
		uptime_sec: Math.round(process.uptime()),
		rss_mb: toMb(usage.rss),
		heap_used_mb: toMb(usage.heapUsed),
		heap_total_mb: toMb(usage.heapTotal),
		external_mb: toMb(usage.external),
		array_buffers_mb: toMb(usage.arrayBuffers),
		function_target: process.env.FUNCTION_TARGET ?? "unknown",
	});
}

/**
 * テスト用に run カウンタをリセットする（本番コードでは使用しない）
 */
export function resetRunCountForTest(): void {
	runCount = 0;
}
