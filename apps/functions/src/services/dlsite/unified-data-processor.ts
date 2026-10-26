/**
 * DLsite統合データ処理
 *
 * 1つのAPIデータから全ての関連データを統合的に更新
 * Work、Circle、Creator、価格履歴の更新を一元管理
 */

import type { DLsiteApiResponse, WorkDocument } from "@suzumina.click/shared-types";
import * as logger from "../../shared/logger";
import { WorkMapper } from "../mappers/work-mapper";
import { savePriceHistory } from "../price-history";
import { updateCircleWithWork } from "./circle-firestore";
import { updateCreatorWorkMapping } from "./creator-firestore";
import { getWorkFromFirestore, saveWorksToFirestore } from "./dlsite-firestore";
import { listChangedWorkPaths } from "./work-change-paths";

/**
 * 統合処理の結果
 */
export interface ProcessingResult {
	workId: string;
	success: boolean;
	updates: {
		work: boolean;
		circle: boolean;
		creators: boolean;
		priceHistory: boolean;
	};
	errors: string[];
}

/**
 * 処理オプション
 */
export interface ProcessingOptions {
	/** 価格履歴の保存をスキップ */
	skipPriceHistory?: boolean;
	/** 差分チェックをスキップして強制更新 */
	forceUpdate?: boolean;
	/** 既存作品のマップ（パフォーマンス最適化用） */
	existingWorksMap?: Map<string, WorkDocument>;
}

/**
 * 処理結果を初期化
 */
function initializeResult(workId: string | undefined): ProcessingResult {
	return {
		workId: workId || "UNKNOWN",
		success: false,
		updates: {
			work: false,
			circle: false,
			creators: false,
			priceHistory: false,
		},
		errors: [],
	};
}

/**
 * Work更新処理
 */
async function updateWork(workData: WorkDocument, result: ProcessingResult): Promise<void> {
	try {
		await saveWorksToFirestore([workData]);
		result.updates.work = true;
	} catch (error) {
		result.errors.push(`Work更新エラー: ${error instanceof Error ? error.message : String(error)}`);
		logger.error(`Work更新エラー: ${workData.productId}`, { error });
	}
}

/**
 * Circle更新処理
 */
async function updateCircle(
	apiData: DLsiteApiResponse,
	workId: string,
	result: ProcessingResult,
): Promise<void> {
	try {
		await updateCircleWithWork(
			apiData.maker_id || "UNKNOWN",
			workId,
			apiData.maker_name || "UNKNOWN",
			apiData.maker_name_en || "",
		);
		result.updates.circle = true;
	} catch (error) {
		result.errors.push(
			`Circle更新エラー: ${error instanceof Error ? error.message : String(error)}`,
		);
		logger.error(`Circle更新エラー: ${workId}`, { error });
	}
}

/**
 * Creator更新処理
 */
async function updateCreators(
	apiData: DLsiteApiResponse,
	workId: string,
	result: ProcessingResult,
): Promise<void> {
	try {
		const creatorResult = await updateCreatorWorkMapping(apiData, workId);
		if (creatorResult.success) {
			result.updates.creators = true;
		} else if (creatorResult.error) {
			result.errors.push(`Creator更新エラー: ${creatorResult.error}`);
		}
	} catch (error) {
		result.errors.push(
			`Creator更新エラー: ${error instanceof Error ? error.message : String(error)}`,
		);
		logger.error(`Creator更新エラー: ${workId}`, { error });
	}
}

/**
 * 価格履歴更新処理
 */
async function updatePriceHistory(
	workId: string,
	apiData: DLsiteApiResponse,
	result: ProcessingResult,
): Promise<void> {
	try {
		logger.debug(`価格履歴更新開始: ${workId}`);
		const saved = await savePriceHistory(workId, apiData);
		if (saved) {
			result.updates.priceHistory = true;
			logger.debug(`価格履歴更新成功: ${workId}`);
		} else {
			logger.debug(`価格履歴更新失敗: ${workId}`);
		}
	} catch (error) {
		result.errors.push(`価格履歴エラー: ${error instanceof Error ? error.message : String(error)}`);
		logger.warn(`価格履歴保存エラー: ${workId}`, { error });
	}
}

/**
 * この作品で書き込む対象（works / circles / creators）
 */
interface UpdatePlan {
	work: boolean;
	circle: boolean;
	creators: boolean;
}

const UPDATE_ALL: UpdatePlan = { work: true, circle: true, creators: true };

/**
 * `updateCircleWithWork` が使う値（maker_id / maker_name）に対応するパス。
 * maker_name_en は WorkDocument に写していない（circleEn は常に undefined）ため検知できない。
 */
const CIRCLE_PATH = /^(circleId|circle)$/;
/** `updateCreatorWorkMapping` が使う値（creaters / maker_id）に対応するパス */
const CREATORS_PATH = /^(creators(\.|$)|circleId$)/;

/**
 * 既存作品との差分から、書き込む対象を決める
 *
 * SPR-346: 変更検知を全フィールドに広げたため、評価・説明だけの変化でも Circle / Creator の
 * 同期（circle doc の get/set、collectionGroup QUERY）が走ると reads が評価変動数に比例して増える。
 * それぞれが使う値が変わったときだけ同期する。新規作品と forceUpdate は従来どおり全部書く。
 *
 * 副作用の注意: works は Circle / Creator の同期より先に書くため、同期だけが失敗した作品は
 * 次の run で差分が出ず再試行されない。週次の整合性 cron（`checkDataIntegrity`）が直すのは
 * 欠けた creator mapping と circle.workIds の追加だけで、作者の削除・roles の変更・circleId の移動・
 * 名前の変更は、その作品の関係する値が次に変わるか forceUpdate するまで残る。
 */
async function planUpdates(
	workData: WorkDocument,
	options: ProcessingOptions,
): Promise<UpdatePlan> {
	if (options.forceUpdate) {
		return UPDATE_ALL;
	}

	// 既存作品マップが提供されている場合は優先的に使用
	let existingWork: WorkDocument | null = null;

	if (options.existingWorksMap) {
		existingWork = options.existingWorksMap.get(workData.productId) || null;
	} else {
		// マップがない場合は個別に取得（パフォーマンス低下）
		existingWork = await getWorkFromFirestore(workData.productId);
	}

	if (!existingWork) {
		return UPDATE_ALL;
	}

	const { changedPaths } = detectChanges(existingWork, workData);
	return {
		work: changedPaths.length > 0,
		circle: changedPaths.some((path) => CIRCLE_PATH.test(path)),
		creators: changedPaths.some((path) => CREATORS_PATH.test(path)),
	};
}

/**
 * 関連データの更新処理を実行
 */
async function performUpdates(
	apiData: DLsiteApiResponse,
	workData: WorkDocument,
	options: ProcessingOptions,
	result: ProcessingResult,
	plan: UpdatePlan,
): Promise<void> {
	logger.debug(`performUpdates開始: ${workData.productId}`, {
		plan,
		skipPriceHistory: options.skipPriceHistory,
	});

	if (plan.work) {
		await updateWork(workData, result);
	} else {
		logger.debug(`Work/Circle/Creator更新をスキップ: ${workData.productId} (変更なし)`);
	}
	if (plan.circle) {
		await updateCircle(apiData, workData.productId, result);
	}
	if (plan.creators) {
		await updateCreators(apiData, workData.productId, result);
	}

	// 価格履歴は常に保存を試みる（既存チェックは価格履歴保存側で行う）
	if (!options.skipPriceHistory) {
		logger.debug(`価格履歴更新を実行: ${workData.productId}`);
		await updatePriceHistory(workData.productId, apiData, result);
	} else {
		logger.debug(`価格履歴更新をスキップ: ${workData.productId}`);
	}
}

/**
 * DLsite APIデータから全ての関連データを統合的に更新
 *
 * この関数が責任を持つこと:
 * 1. Workデータの更新
 * 2. Circleデータの更新（workIds配列の管理）
 * 3. Creatorマッピングの更新（差分更新）
 * 4. 価格履歴の記録
 *
 * @param apiData DLsite APIレスポンス
 * @param options 処理オプション
 * @returns 処理結果
 */
export async function processUnifiedDLsiteData(
	apiData: DLsiteApiResponse,
	options: ProcessingOptions = {},
): Promise<ProcessingResult> {
	const result = initializeResult(apiData.workno);

	try {
		// APIデータをWorkDocumentに変換
		const workData = WorkMapper.toWork(apiData);

		// 既存データとの差分から書き込む対象を決める
		const plan = await planUpdates(workData, options);

		// 関連データの更新処理
		await performUpdates(apiData, workData, options, result, plan);

		// 成功判定: 主要な更新（Work, Circle, Creator）または価格履歴のうち少なくとも1つが成功
		result.success =
			result.updates.work ||
			result.updates.circle ||
			result.updates.creators ||
			result.updates.priceHistory;

		// デバッグログ
		if (result.errors.length > 0) {
			logger.warn(`統合処理部分エラー: ${workData.productId}`, {
				updates: result.updates,
				errors: result.errors,
			});
		}
	} catch (error) {
		result.errors.push(`統合処理エラー: ${error instanceof Error ? error.message : String(error)}`);
		logger.error(`統合データ処理エラー: ${apiData.workno}`, { error });
	}

	return result;
}

/**
 * 変更種別の分類結果
 *
 * SPR-229 Stage①: 価格/販売状態の変化とメタ情報の変化を分離して集計する。
 * SPR-346: 判定は追跡フィールドの列挙ではなく {@link listChangedWorkPaths}（merge 書き込みで
 * 変わる全フィールド）に基づく。
 */
export interface ChangeDetectionResult {
	/** 価格・販売状態（`price.*` / `salesStatus.*`）の変化 */
	priceOrSalesChanged: boolean;
	/** それ以外（タイトル・評価・作者・説明・画像・ジャンル等）の変化 */
	metadataChanged: boolean;
	/** いずれかの変化があるか（false なら works / circles / creators の書き込みをスキップする） */
	hasAnyChange: boolean;
	/** 変化したフィールドのパス */
	changedPaths: string[];
}

function isPriceOrSalesPath(path: string): boolean {
	return /^(price|salesStatus)(\.|$)/.test(path);
}

/**
 * 既存作品と更新後データの変更種別を分類する
 *
 * @param existing 既存のWorkDocument
 * @param updated 更新されたWorkDocument
 * @returns 変更種別ごとの分類結果
 */
export function detectChanges(
	existing: WorkDocument,
	updated: WorkDocument,
): ChangeDetectionResult {
	const changedPaths = listChangedWorkPaths(existing, updated);
	const priceOrSalesChanged = changedPaths.some(isPriceOrSalesPath);
	const metadataChanged = changedPaths.some((path) => !isPriceOrSalesPath(path));

	if (changedPaths.length > 0) {
		logger.info(`作品変更検出: ${existing.productId}`, { changedPaths });
	}

	return {
		priceOrSalesChanged,
		metadataChanged,
		hasAnyChange: changedPaths.length > 0,
		changedPaths,
	};
}

/**
 * バッチ処理の結果を作成
 */
function createBatchErrorResult(reason: unknown): ProcessingResult {
	return {
		workId: "UNKNOWN",
		success: false,
		updates: {
			work: false,
			circle: false,
			creators: false,
			priceHistory: false,
		},
		errors: [`バッチ処理エラー: ${reason}`],
	};
}

/**
 * バッチ単位で処理を実行
 */
async function processBatch(
	batch: DLsiteApiResponse[],
	options: ProcessingOptions,
): Promise<ProcessingResult[]> {
	const batchPromises = batch.map((apiData) => processUnifiedDLsiteData(apiData, options));
	const batchResults = await Promise.allSettled(batchPromises);
	const results: ProcessingResult[] = [];

	for (const result of batchResults) {
		if (result.status === "fulfilled") {
			results.push(result.value);
		} else {
			results.push(createBatchErrorResult(result.reason));
		}
	}

	return results;
}

/**
 * バッチ処理用: 複数のAPIデータを統合処理
 *
 * @param apiDataList APIデータのリスト
 * @param options 処理オプション
 * @returns 処理結果のリスト
 */
export async function processBatchUnifiedDLsiteData(
	apiDataList: DLsiteApiResponse[],
	options: ProcessingOptions = {},
): Promise<ProcessingResult[]> {
	const results: ProcessingResult[] = [];
	const BATCH_SIZE = 10;

	// バッチ単位で処理
	for (let i = 0; i < apiDataList.length; i += BATCH_SIZE) {
		const batch = apiDataList.slice(i, i + BATCH_SIZE);
		const batchResults = await processBatch(batch, options);
		results.push(...batchResults);
	}

	// 統計ログ
	const successCount = results.filter((r) => r.success).length;
	const totalCount = results.length;
	logger.info(`バッチ統合処理完了: ${successCount}/${totalCount}件成功`);

	return results;
}
