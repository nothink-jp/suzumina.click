"use server";

import { FieldValue } from "@google-cloud/firestore";
import {
	convertToFrontendEvaluation,
	convertToFrontendTop10List,
	type EvaluationInput,
	EvaluationInputSchema,
	type EvaluationResult,
	type FirestoreWorkEvaluation,
	type FrontendUserTop10List,
	type FrontendWorkEvaluation,
	type UserTop10List,
} from "@suzumina.click/shared-types";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getFirestore } from "@/lib/firestore";

/**
 * 評価の更新（作成・変更）- revalidatePath使用（重要データ操作）
 */
export async function updateWorkEvaluation(
	workId: string,
	evaluation: EvaluationInput,
): Promise<EvaluationResult> {
	try {
		// 認証チェック
		const session = await auth();
		if (!session?.user?.discordId) {
			return { success: false, error: "認証が必要です" };
		}

		// 入力検証
		const validation = EvaluationInputSchema.safeParse(evaluation);
		if (!validation.success) {
			return {
				success: false,
				error: validation.error.issues[0]?.message || "バリデーションエラー",
			};
		}

		// トランザクション処理（スタック型10選処理含む）
		const result = await performEvaluationUpdate(workId, validation.data, session.user.discordId);

		if (result.success) {
			// キャッシュ無効化（重要データ操作）
			revalidatePath(`/works/${workId}`);
			revalidatePath("/my-evaluations");
		}

		return result;
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "評価の更新に失敗しました",
		};
	}
}

/**
 * 10選から作品を削除して順位を詰める
 */
function removeWorkFromTop10(
	rankings: UserTop10List["rankings"],
	workId: string,
): UserTop10List["rankings"] {
	const newRankings: UserTop10List["rankings"] = {};
	let currentRank = 1;

	for (let rank = 1; rank <= 10; rank++) {
		const item = rankings[rank];
		if (item && item.workId !== workId) {
			newRankings[currentRank] = item;
			currentRank++;
		}
	}

	return newRankings;
}

/**
 * ランキングをコンパクト化（空きを詰める）
 */
function compactRankings(rankings: UserTop10List["rankings"]): UserTop10List["rankings"] {
	const compacted: UserTop10List["rankings"] = {};
	let newRank = 1;

	for (let rank = 1; rank <= 10; rank++) {
		const item = rankings[rank];
		if (item) {
			compacted[newRank] = item;
			newRank++;
		}
	}

	return compacted;
}

/**
 * 10選に作品を挿入してスタック処理を行う
 */
function insertWorkToTop10(
	currentRankings: UserTop10List["rankings"],
	workId: string,
	workTitle: string,
	targetRank: number,
): {
	rankings: UserTop10List["rankings"];
	removedWork: { workId: string; workTitle: string } | null;
} {
	// 既存の同じ作品を削除
	const cleanedRankings = removeWorkFromTop10(currentRankings, workId);

	// 新しいランキング配列を作成
	const tempRankings: UserTop10List["rankings"] = {};
	let removedWork: { workId: string; workTitle: string } | null = null;

	// 指定位置に新作品を挿入
	tempRankings[targetRank] = {
		workId,
		workTitle,
		updatedAt: FieldValue.serverTimestamp() as unknown as { toDate(): Date },
	};

	// 既存作品を配置（シフト処理）
	for (const [rankStr, item] of Object.entries(cleanedRankings)) {
		const rank = Number(rankStr);
		const newRank = rank < targetRank ? rank : rank + 1;

		if (newRank <= 10) {
			tempRankings[newRank] = item;
		} else if (item) {
			removedWork = { workId: item.workId, workTitle: item.workTitle || "" };
		}
	}

	// 順位を詰める
	const finalRankings = compactRankings(tempRankings);

	return { rankings: finalRankings, removedWork };
}

/**
 * 評価削除処理
 */
async function handleEvaluationRemove(
	transaction: FirebaseFirestore.Transaction,
	evaluationRef: FirebaseFirestore.DocumentReference,
	userTop10Ref: FirebaseFirestore.DocumentReference,
	existingEval: FirebaseFirestore.DocumentSnapshot,
	workId: string,
	userId: string,
) {
	if (!existingEval.exists) {
		throw new Error("評価が見つかりません");
	}

	const evalData = existingEval.data() as FirestoreWorkEvaluation;

	// 10選から削除
	if (evalData.evaluationType === "top10") {
		const top10Doc = await transaction.get(userTop10Ref);
		if (top10Doc.exists) {
			const top10Data = top10Doc.data() as UserTop10List;
			const newRankings = removeWorkFromTop10(top10Data.rankings, workId);

			transaction.set(userTop10Ref, {
				userId,
				rankings: newRankings,
				totalCount: Object.keys(newRankings).length,
				lastUpdatedAt: FieldValue.serverTimestamp() as unknown as { toDate(): Date },
			});
		}
	}

	transaction.delete(evaluationRef);
}

/**
 * 10選更新処理
 */
async function handleTop10Update(
	transaction: FirebaseFirestore.Transaction,
	userTop10Ref: FirebaseFirestore.DocumentReference,
	top10Doc: FirebaseFirestore.DocumentSnapshot,
	workId: string,
	workTitle: string,
	targetRank: number,
	userId: string,
	firestore: FirebaseFirestore.Firestore,
	removedWorkEvalData?: FirebaseFirestore.DocumentSnapshot,
) {
	const currentData = top10Doc.exists
		? (top10Doc.data() as UserTop10List)
		: { userId, rankings: {}, totalCount: 0 };

	const { rankings, removedWork } = insertWorkToTop10(
		currentData.rankings,
		workId,
		workTitle,
		targetRank,
	);

	// 10選データ更新
	transaction.set(userTop10Ref, {
		userId,
		rankings,
		totalCount: Object.keys(rankings).length,
		lastUpdatedAt: FieldValue.serverTimestamp() as unknown as { toDate(): Date },
	});

	// 押し出された作品を星3つ評価に変換
	if (removedWork && removedWork.workId !== workId && removedWorkEvalData) {
		const removedEvalId = `${userId}_${removedWork.workId}`;
		const removedEvalRef = firestore.collection("evaluations").doc(removedEvalId);

		const evaluationData: FirestoreWorkEvaluation = {
			id: removedEvalId,
			workId: removedWork.workId,
			userId,
			evaluationType: "star" as const,
			starRating: 3,
			updatedAt: FieldValue.serverTimestamp() as unknown as { toDate(): Date },
			createdAt: removedWorkEvalData.exists
				? (removedWorkEvalData.data() as FirestoreWorkEvaluation).createdAt
				: (FieldValue.serverTimestamp() as unknown as { toDate(): Date }),
		};

		transaction.set(removedEvalRef, evaluationData);
	}
}

/**
 * 評価タイプ変更時の10選データクリーンアップ処理
 */
async function handleEvaluationTypeChange(
	transaction: FirebaseFirestore.Transaction,
	userTop10Ref: FirebaseFirestore.DocumentReference,
	existingEval: FirebaseFirestore.DocumentSnapshot,
	top10Doc: FirebaseFirestore.DocumentSnapshot,
	evaluation: EvaluationInput,
	workId: string,
	userId: string,
) {
	if (!existingEval.exists) return;

	const existingData = existingEval.data() as FirestoreWorkEvaluation;

	// 既存が10選で、新しい評価が10選以外の場合は10選から削除
	if (existingData.evaluationType === "top10" && evaluation.type !== "top10") {
		const top10Data = top10Doc.exists ? (top10Doc.data() as UserTop10List) : null;
		if (top10Data) {
			const newRankings = removeWorkFromTop10(top10Data.rankings, workId);
			transaction.set(userTop10Ref, {
				userId,
				rankings: newRankings,
				totalCount: Object.keys(newRankings).length,
				lastUpdatedAt: FieldValue.serverTimestamp() as unknown as { toDate(): Date },
			});
		}
	}
}

/**
 * 削除される可能性のある作品の評価データを事前読み取り
 */
async function getRemovedWorkEvalData(
	transaction: FirebaseFirestore.Transaction,
	firestore: FirebaseFirestore.Firestore,
	evaluation: EvaluationInput,
	top10Doc: FirebaseFirestore.DocumentSnapshot,
	workId: string,
	userId: string,
): Promise<FirebaseFirestore.DocumentSnapshot | undefined> {
	if (evaluation.type !== "top10" || !evaluation.top10Rank) return undefined;

	const currentData = top10Doc.exists
		? (top10Doc.data() as UserTop10List)
		: { userId, rankings: {}, totalCount: 0 };

	const { removedWork } = insertWorkToTop10(
		currentData.rankings,
		workId,
		evaluation.workTitle || "",
		evaluation.top10Rank,
	);

	if (removedWork && removedWork.workId !== workId) {
		const removedEvalId = `${userId}_${removedWork.workId}`;
		const removedEvalRef = firestore.collection("evaluations").doc(removedEvalId);
		return await transaction.get(removedEvalRef);
	}

	return undefined;
}

/**
 * 10選スタック型更新の内部実装
 */
async function performEvaluationUpdate(
	workId: string,
	evaluation: EvaluationInput,
	userId: string,
): Promise<EvaluationResult> {
	const firestore = getFirestore();
	const result = await firestore.runTransaction(async (transaction) => {
		const evaluationId = `${userId}_${workId}`;
		const evaluationRef = firestore.collection("evaluations").doc(evaluationId);
		const userTop10Ref = firestore
			.collection("users")
			.doc(userId)
			.collection("top10")
			.doc("ranking");

		// 必要な読み取り操作をすべて最初に実行
		const existingEval = await transaction.get(evaluationRef);
		const top10Doc = await transaction.get(userTop10Ref);

		// 10選更新時に削除される可能性のある作品の評価データを事前読み取り
		const removedWorkEvalData = await getRemovedWorkEvalData(
			transaction,
			firestore,
			evaluation,
			top10Doc,
			workId,
			userId,
		);

		// 削除の場合
		if (evaluation.type === "remove") {
			await handleEvaluationRemove(
				transaction,
				evaluationRef,
				userTop10Ref,
				existingEval,
				workId,
				userId,
			);
			return null;
		}

		// 既存の評価があり、評価タイプが変わる場合の処理
		await handleEvaluationTypeChange(
			transaction,
			userTop10Ref,
			existingEval,
			top10Doc,
			evaluation,
			workId,
			userId,
		);

		// 評価の作成・更新
		if (evaluation.type === "top10" && evaluation.top10Rank) {
			await handleTop10Update(
				transaction,
				userTop10Ref,
				top10Doc,
				workId,
				evaluation.workTitle || "",
				evaluation.top10Rank,
				userId,
				firestore,
				removedWorkEvalData,
			);
		}

		// 評価データ保存
		const evaluationData: FirestoreWorkEvaluation = {
			id: evaluationId,
			workId,
			userId,
			evaluationType: evaluation.type as "top10" | "star" | "ng",
			...(evaluation.type === "top10" && { top10Rank: evaluation.top10Rank }),
			...(evaluation.type === "star" && { starRating: evaluation.starRating }),
			updatedAt: FieldValue.serverTimestamp() as unknown as { toDate(): Date },
			createdAt: FieldValue.serverTimestamp() as unknown as { toDate(): Date },
		};

		// 既存の評価がある場合は作成日時を保持
		if (existingEval.exists) {
			const existingData = existingEval.data() as FirestoreWorkEvaluation;
			evaluationData.createdAt = existingData.createdAt;
		}

		transaction.set(evaluationRef, evaluationData);
		return evaluationId;
	});

	if (result) {
		// トランザクション完了後、実際のドキュメントを読み取る
		const savedDoc = await firestore.collection("evaluations").doc(result).get();
		if (savedDoc.exists) {
			return {
				success: true,
				data: convertToFrontendEvaluation(savedDoc.data() as FirestoreWorkEvaluation),
			};
		}
	}

	return { success: true };
}

/**
 * 現在の評価を取得（認証必須）
 */
export async function getWorkEvaluation(workId: string): Promise<FrontendWorkEvaluation | null> {
	try {
		const session = await auth();
		if (!session?.user?.discordId) return null;

		const firestore = getFirestore();
		const evaluationId = `${session.user.discordId}_${workId}`;
		const doc = await firestore.collection("evaluations").doc(evaluationId).get();

		if (!doc.exists) return null;

		const data = doc.data() as FirestoreWorkEvaluation;
		return convertToFrontendEvaluation(data);
	} catch (_error) {
		return null;
	}
}

/**
 * ユーザーの10選リストを取得
 */
export async function getUserTop10List(): Promise<FrontendUserTop10List | null> {
	try {
		const session = await auth();
		if (!session?.user?.discordId) return null;

		const firestore = getFirestore();
		const doc = await firestore
			.collection("users")
			.doc(session.user.discordId)
			.collection("top10")
			.doc("ranking")
			.get();

		if (!doc.exists) return null;

		const data = doc.data() as UserTop10List;
		return convertToFrontendTop10List(data);
	} catch (_error) {
		return null;
	}
}

/**
 * 評価を削除 - revalidatePath使用（重要データ操作）
 */
export async function removeWorkEvaluation(workId: string): Promise<EvaluationResult> {
	return updateWorkEvaluation(workId, { type: "remove" });
}

/**
 * ユーザーの全評価を取得（マイページ用）
 */
export async function getUserEvaluations(): Promise<FrontendWorkEvaluation[]> {
	try {
		const session = await auth();
		if (!session?.user?.discordId) return [];

		const firestore = getFirestore();
		const snapshot = await firestore
			.collection("evaluations")
			.where("userId", "==", session.user.discordId)
			.orderBy("updatedAt", "desc")
			.get();

		return snapshot.docs.map((doc) =>
			convertToFrontendEvaluation(doc.data() as FirestoreWorkEvaluation),
		);
	} catch (_error) {
		return [];
	}
}
