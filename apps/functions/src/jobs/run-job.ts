/**
 * Cloud Run Jobs 用の入口（イベント無しで起動する。SPR-415 / 設計は SPR-358）
 *
 * Functions の CloudEvent ハンドラ（endpoints/）と同じ本体を、引数のモードで呼び分ける。
 * 開始・完了のログは、ハンドラと共有する `*WithReport` が出す。**揃うのは `message` とキーだけ**。
 * ログベースメトリクスとアラートのフィルタは `resource.type="cloud_run_revision"` と `service_name` に絞ってあり、
 * Jobs のログ（`cloud_run_job` / `job_name`）は拾わない。ジョブへ切り替えるときに、フィルタを直す（SPR-417）。
 *
 * - 重複配信の判定（`event.id`）は通らない。Pub/Sub を経由しないため。実行の重なりは「実行中」の印で防ぐ
 *   （`runUnifiedDataCollectionWithReport`・SPR-417）。
 * - DLsite のモードは `JOB_RUN_BUDGET`（55 分・レート制限を待って続ける）で走る。
 * - YouTube のモードは無い。YouTube は Functions に残す（SPR-358）。
 */

import { runIntegrityCheckWithReport } from "../endpoints/data-integrity/check-data-integrity";
import {
	runUnifiedDataCollectionWithReport,
	WEEKLY_FULL_SWEEP_MODE,
} from "../endpoints/dlsite/fetch-dlsite-unified-data";
import { JOB_RUN_BUDGET } from "../endpoints/dlsite/process-batch";
import * as logger from "../shared/logger";
import { logRuntimeMemoryLimits } from "../shared/memory-diagnostics";

/** ジョブの引数に渡すモード。ジョブの定義（Terraform）がこの値を渡す */
const JOB_MODES = ["dlsite", "dlsite-full-sweep", "integrity"] as const;
export type JobMode = (typeof JOB_MODES)[number];

/** 通常の取り込みの mode 値（Scheduler が Functions へ渡しているペイロードと同じ文字列） */
const DLSITE_NORMAL_MODE = "individual_info_api_unified";

function isJobMode(value: string | undefined): value is JobMode {
	return JOB_MODES.includes(value as JobMode);
}

/**
 * Jobs が入れる環境変数から、起動元の情報を作る（開始ログに載る）
 *
 * ローカルで起動したときは `execution` / `job` が undefined になる。
 */
function jobTrigger(mode: JobMode): Record<string, unknown> {
	return {
		jobMode: mode,
		job: process.env.CLOUD_RUN_JOB,
		execution: process.env.CLOUD_RUN_EXECUTION,
	};
}

/**
 * モードに対応する処理を 1 回走らせる
 *
 * @returns 成功したら true。Jobs の終了コードに使う
 */
export async function runJob(mode: JobMode): Promise<boolean> {
	const trigger = jobTrigger(mode);
	// ローカルで起動したときは実行名が無いので、起動ごとに違う値を作る
	const dlsiteRun = {
		trigger,
		runId: process.env.CLOUD_RUN_EXECUTION ?? `local-${process.pid}-${Date.now()}`,
		budget: JOB_RUN_BUDGET,
	};

	switch (mode) {
		case "dlsite":
			return runUnifiedDataCollectionWithReport({ mode: DLSITE_NORMAL_MODE, ...dlsiteRun });
		case "dlsite-full-sweep":
			return runUnifiedDataCollectionWithReport({ mode: WEEKLY_FULL_SWEEP_MODE, ...dlsiteRun });
		case "integrity":
			await runIntegrityCheckWithReport(trigger);
			return true;
	}
}

/**
 * 引数（`process.argv.slice(2)`）からモードを読み、走らせて、終了コードを返す
 *
 * - 0: 成功
 * - 1: 処理が失敗した（Jobs は終了コードで実行の成否を決める）
 * - 2: モードの指定が不正（設定の誤り。走らせない）
 */
export async function main(args: readonly string[]): Promise<number> {
	const [mode] = args;
	if (!isJobMode(mode)) {
		logger.error("ジョブのモードが不正です", { mode, validModes: JOB_MODES });
		return 2;
	}

	logRuntimeMemoryLimits();

	try {
		return (await runJob(mode)) ? 0 : 1;
	} catch (error) {
		logger.error("ジョブが失敗しました", { jobMode: mode, error });
		return 1;
	}
}
