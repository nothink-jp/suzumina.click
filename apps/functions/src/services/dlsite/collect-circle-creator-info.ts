/**
 * サークル・クリエイター情報収集サービス
 *
 * DLsite Individual Info APIから取得した作品データをもとに、
 * サークル情報とクリエイター・作品マッピング情報を収集・保存します。
 */

import { FieldValue, Firestore } from "@google-cloud/firestore";
import type {
	CircleData,
	CreatorType,
	CreatorWorkMapping,
	DLsiteRawApiResponse,
	WorkDocument,
} from "@suzumina.click/shared-types";
import { CircleEntity, isValidCircleId, isValidCreatorId } from "@suzumina.click/shared-types";
import { CircleRepository } from "../../repositories/circle-repository";
import * as logger from "../../shared/logger";

const adminDb = new Firestore();
const circleRepository = new CircleRepository(adminDb);

/**
 * サークル・クリエイター情報を収集・保存
 * @param workData Firestore用に変換された作品データ
 * @param apiData Individual Info APIの生データ
 * @param isNewWork 新規作品かどうか
 * @returns 処理結果
 */
export async function collectCircleAndCreatorInfo(
	workData: WorkDocument,
	apiData: DLsiteRawApiResponse,
	isNewWork: boolean,
): Promise<{ success: boolean; error?: string }> {
	try {
		const batch = adminDb.batch();

		// 1. サークル情報の更新（Fire-and-Forget パターン）
		await updateCircleInfo(batch, apiData, isNewWork);

		// 2. クリエイターマッピングの更新
		await updateCreatorMappings(batch, apiData, workData.id);

		// バッチコミット（最大500操作）
		await batch.commit();

		// 個別作品の収集完了ログは省略（ログ削減）

		return { success: true };
	} catch (error) {
		logger.error("サークル・クリエイター情報収集エラー:", {
			workId: workData.id,
			error: error instanceof Error ? error.message : String(error),
		});
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * サークル情報を更新（Repositoryパターン使用）
 */
async function updateCircleInfo(
	batch: FirebaseFirestore.WriteBatch,
	apiData: DLsiteRawApiResponse,
	isNewWork: boolean,
): Promise<void> {
	const circleId = apiData.maker_id;
	if (!circleId) return;

	// 入力検証
	if (!isValidCircleId(circleId)) {
		logger.warn(`無効なサークルID: ${circleId}`);
		return;
	}

	// Repositoryを使ってサークルを取得
	const existingCircle = await circleRepository.findById(circleId);
	const circleRef = adminDb.collection("circles").doc(circleId);

	if (!existingCircle) {
		// 新規サークル作成
		const newCircle = CircleEntity.create(
			circleId,
			apiData.maker_name || "",
			undefined, // nameEnは現時点で取得できない
			1,
		);

		// バッチに追加（ServerTimestampを使用）
		const circleData = newCircle.toFirestore();
		batch.set(circleRef, {
			...circleData,
			lastUpdated: FieldValue.serverTimestamp(),
			createdAt: FieldValue.serverTimestamp(),
		});
	} else {
		// 既存サークルの更新
		let updatedCircle = existingCircle;

		// 名前が変更されている場合は更新
		if (apiData.maker_name && apiData.maker_name !== existingCircle.circleName) {
			updatedCircle = existingCircle.updateName(apiData.maker_name, existingCircle.circleNameEn);
		}

		// 新規作品の場合はwork countを増加
		if (isNewWork) {
			updatedCircle = updatedCircle.incrementWorkCount();
		}

		// 変更があった場合のみバッチに追加
		if (updatedCircle !== existingCircle) {
			const updateData = {
				name: updatedCircle.circleName,
				workCount: updatedCircle.workCountNumber,
				lastUpdated: FieldValue.serverTimestamp(),
			};

			batch.update(circleRef, updateData);
		}
	}
}

/**
 * クリエイターマッピング情報を更新
 */
async function updateCreatorMappings(
	batch: FirebaseFirestore.WriteBatch,
	apiData: DLsiteRawApiResponse,
	workId: string,
): Promise<void> {
	const creatorTypeMap: Array<[string, CreatorType]> = [
		["voice_by", "voice"],
		["illust_by", "illustration"],
		["scenario_by", "scenario"],
		["music_by", "music"],
		["others_by", "other"],
		["directed_by", "other"],
	];

	const circleId = apiData.maker_id || "UNKNOWN";
	const processedCreators = new Set<string>(); // 重複処理防止

	// Check if creaters is an object with fields, not an array
	if (!apiData.creaters || Array.isArray(apiData.creaters)) {
		return;
	}

	for (const [field, type] of creatorTypeMap) {
		const creators = (apiData.creaters as any)?.[field] || [];

		for (const creator of creators) {
			if (!creator.id || processedCreators.has(creator.id)) continue;

			// 入力検証
			if (!isValidCreatorId(creator.id)) {
				logger.warn(`無効なクリエイターID: ${creator.id}`);
				continue;
			}

			// マッピングドキュメントの作成/更新
			const mappingId = `${creator.id}_${workId}`;
			const mappingRef = adminDb.collection("creatorWorkMappings").doc(mappingId);

			const existingMapping = await mappingRef.get();
			const existingTypes = existingMapping.exists
				? (existingMapping.data()?.types as CreatorType[]) || []
				: [];

			const updatedTypes = Array.from(new Set([...existingTypes, type]));

			const mappingData: CreatorWorkMapping = {
				creatorId: creator.id,
				workId,
				creatorName: creator.name,
				types: updatedTypes,
				circleId,
				createdAt: FieldValue.serverTimestamp(),
			};

			batch.set(mappingRef, mappingData, { merge: true });

			processedCreators.add(creator.id);
		}
	}

	if (processedCreators.size > 0) {
		// クリエイターマッピング更新ログは省略（ログ削減）
	}
}

/**
 * バッチ処理用：複数の作品からサークル・クリエイター情報を一括収集
 * ローカル開発環境での一括処理に使用
 */
export async function batchCollectCircleAndCreatorInfo(
	works: Array<{
		workData: WorkDocument;
		apiData: DLsiteRawApiResponse;
		isNewWork: boolean;
	}>,
): Promise<{
	success: boolean;
	processed: number;
	errors: Array<{ workId: string; error: string }>;
}> {
	const errors: Array<{ workId: string; error: string }> = [];
	let processed = 0;

	// バッチ処理（500操作ごとに分割）
	const batchSize = 100; // 1作品あたり複数の操作があるため、安全に100作品ずつ処理
	for (let i = 0; i < works.length; i += batchSize) {
		const batchWorks = works.slice(i, i + batchSize);
		const batch = adminDb.batch();

		for (const { workData, apiData, isNewWork } of batchWorks) {
			try {
				// サークル情報の更新
				await updateCircleInfo(batch, apiData, isNewWork);

				// クリエイターマッピングの更新
				await updateCreatorMappings(batch, apiData, workData.id);

				processed++;
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				errors.push({
					workId: workData.id,
					error: errorMessage,
				});
				logger.error("バッチ処理中のエラー:", {
					workId: workData.id,
					errorMessage,
					errorType: error instanceof Error ? error.constructor.name : typeof error,
					errorStack: error instanceof Error ? error.stack : undefined,
				});
			}
		}

		// バッチコミット
		try {
			await batch.commit();
			logger.info(
				`バッチコミット完了: ${i + 1}-${Math.min(i + batchSize, works.length)}/${works.length}`,
			);
		} catch (error) {
			logger.error("バッチコミットエラー:", error);
			// バッチ内のすべての作品をエラーとして記録
			for (const { workData } of batchWorks) {
				errors.push({
					workId: workData.id,
					error: "Batch commit failed",
				});
			}
		}
	}

	return {
		success: errors.length === 0,
		processed,
		errors,
	};
}
