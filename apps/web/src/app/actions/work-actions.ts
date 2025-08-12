"use server";

import {
	convertToWorkPlainObject,
	type WorkDocument,
	type WorkListResultPlain,
	type WorkPaginationParams,
	WorkPaginationParamsSchema,
	type WorkPlainObject,
} from "@suzumina.click/shared-types";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/components/system/protected-route";
import { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";

// ヘルパー関数：作品更新の認証チェック
async function validateWorkUpdateAuth(
	workId: string,
): Promise<{ success: true; user: { discordId: string } } | { success: false; error: string }> {
	const user = await requireAuth();
	if (user.role !== "admin") {
		logger.warn("管理者権限が必要", { userId: user.discordId, workId });
		return {
			success: false,
			error: "この操作には管理者権限が必要です",
		};
	}

	if (!workId || typeof workId !== "string") {
		return {
			success: false,
			error: "作品IDが指定されていません",
		};
	}

	return { success: true, user };
}

// ヘルパー関数：作品の存在確認
async function validateWorkExists(
	workId: string,
): Promise<{ success: true } | { success: false; error: string }> {
	const firestore = getFirestore();
	const workRef = firestore.collection("works").doc(workId);
	const workDoc = await workRef.get();

	if (!workDoc.exists) {
		return {
			success: false,
			error: "指定された作品が見つかりません",
		};
	}

	return { success: true };
}

// ヘルパー関数：作品更新データの構築
function buildWorkUpdateData(input: {
	title?: string;
	description?: string;
	price?: { current: number; original?: number; discount?: number };
	tags?: string[];
	isOnSale?: boolean;
}): Record<string, unknown> {
	const updateData: Record<string, unknown> = {
		updatedAt: new Date().toISOString(),
	};

	if (input.title !== undefined) {
		updateData.title = input.title;
	}
	if (input.description !== undefined) {
		updateData.description = input.description;
	}
	if (input.price !== undefined) {
		updateData.price = input.price;
	}
	if (input.tags !== undefined) {
		updateData.genres = input.tags; // DLsite作品のタグはgenresフィールド
	}
	if (input.isOnSale !== undefined) {
		updateData.onSale = input.isOnSale ? 1 : 0; // DLsiteのonSaleは数値
	}

	return updateData;
}

/**
 * 管理者用：作品情報を更新するServer Action
 */
export async function updateWork(
	workId: string,
	input: {
		title?: string;
		description?: string;
		price?: { current: number; original?: number; discount?: number };
		tags?: string[];
		isOnSale?: boolean;
	},
): Promise<{ success: true; data: { message: string } } | { success: false; error: string }> {
	try {
		logger.info("作品情報更新を開始", { workId });

		// 認証チェック
		const authResult = await validateWorkUpdateAuth(workId);
		if (!authResult.success) {
			return authResult;
		}

		// 作品存在確認
		const existsResult = await validateWorkExists(workId);
		if (!existsResult.success) {
			return existsResult;
		}

		// 更新データの構築
		const updateData = buildWorkUpdateData(input);

		// Firestoreを更新
		const firestore = getFirestore();
		const workRef = firestore.collection("works").doc(workId);
		await workRef.update(updateData);

		// キャッシュの無効化
		revalidatePath("/admin/works");
		revalidatePath(`/works/${workId}`);

		logger.info("作品情報更新が正常に完了", {
			workId,
			updatedBy: authResult.user.discordId,
			updatedFields: Object.keys(updateData),
		});

		return {
			success: true,
			data: { message: "作品情報を更新しました" },
		};
	} catch (error) {
		logger.error("作品情報更新でエラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			workId,
		});

		return {
			success: false,
			error: "作品情報の更新に失敗しました。しばらく時間をおいてから再度お試しください。",
		};
	}
}

/**
 * 管理者用：作品を削除するServer Action
 */
export async function deleteWork(
	workId: string,
): Promise<{ success: true; data: { message: string } } | { success: false; error: string }> {
	try {
		logger.info("作品削除を開始", { workId });

		// 認証チェック（管理者権限必須）
		const user = await requireAuth();
		if (user.role !== "admin") {
			logger.warn("管理者権限が必要", { userId: user.discordId, workId });
			return {
				success: false,
				error: "この操作には管理者権限が必要です",
			};
		}

		if (!workId || typeof workId !== "string") {
			return {
				success: false,
				error: "作品IDが指定されていません",
			};
		}

		const firestore = getFirestore();
		const workRef = firestore.collection("works").doc(workId);

		// 作品の存在確認
		const workDoc = await workRef.get();
		if (!workDoc.exists) {
			return {
				success: false,
				error: "指定された作品が見つかりません",
			};
		}

		// 作品削除
		await workRef.delete();

		// キャッシュの無効化
		revalidatePath("/admin/works");
		revalidatePath(`/works/${workId}`);
		revalidatePath("/works");

		logger.info("作品削除が正常に完了", {
			workId,
			deletedBy: user.discordId,
		});

		return {
			success: true,
			data: { message: "作品を削除しました" },
		};
	} catch (error) {
		logger.error("作品削除でエラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			workId,
		});

		return {
			success: false,
			error: "作品の削除に失敗しました。しばらく時間をおいてから再度お試しください。",
		};
	}
}

/**
 * 管理者権限チェックヘルパー関数
 */
async function checkAdminPermissionForWorks(): Promise<
	{ success: true } | { success: false; error: string }
> {
	const user = await requireAuth();
	if (user.role !== "admin") {
		return {
			success: false,
			error: "この操作には管理者権限が必要です",
		};
	}
	return { success: true };
}

/**
 * 作品検索用クエリ構築ヘルパー関数
 */
function buildWorksQuery(
	worksRef: FirebaseFirestore.CollectionReference,
	params: WorkPaginationParams,
) {
	let query = worksRef.orderBy("createdAt", "desc");

	// 声優フィルター
	// TODO: creators.voice_byは配列内のオブジェクト構造のため、
	// Firestoreのarray-containsでは直接検索できない。
	// 将来的に検索用の正規化フィールド（voiceActorNames等）を追加する必要がある。
	if (params.author) {
		// 現在は動作しないが、後方互換性のためクエリは残す
		// query = query.where("voiceActors", "array-contains", params.author);
		logger.warn("Voice actor filtering is currently not supported due to data structure changes");
	}

	// カテゴリフィルター
	if (params.category) {
		query = query.where("category", "==", params.category);
	}

	return query;
}

/**
 * ページネーション設定ヘルパー関数
 */
async function applyPagination(
	query: FirebaseFirestore.Query,
	firestore: FirebaseFirestore.Firestore,
	params: WorkPaginationParams,
) {
	if (params.startAfter) {
		const startAfterDoc = await firestore.collection("works").doc(params.startAfter).get();
		if (startAfterDoc.exists) {
			return query.startAfter(startAfterDoc);
		}
	}
	return query;
}

/**
 * 作品ドキュメントを変換するヘルパー関数
 */
function processWorkDocuments(
	workDocs: FirebaseFirestore.QueryDocumentSnapshot[],
): WorkPlainObject[] {
	const works: WorkPlainObject[] = [];

	for (const doc of workDocs) {
		try {
			const data = { id: doc.id, ...doc.data() } as WorkDocument;
			const result = convertToWorkPlainObject(data);
			if (result.isOk()) {
				works.push(result.value);
			} else {
				logger.warn("作品データ変換エラー", {
					docId: doc.id,
					error:
						result.error.type === "DatabaseError"
							? result.error.detail
							: `${result.error.resource} not found: ${result.error.id}`,
				});
				// 変換エラーは無視して次の作品を処理
			}
		} catch (conversionError) {
			logger.warn("作品データ変換エラー", {
				docId: doc.id,
				error: conversionError instanceof Error ? conversionError.message : String(conversionError),
			});
			// 変換エラーは無視して次の作品を処理
		}
	}

	return works;
}

/**
 * 総件数取得ヘルパー関数
 */
async function getTotalWorksCount(
	firestore: FirebaseFirestore.Firestore,
): Promise<number | undefined> {
	try {
		const countSnapshot = await firestore.collection("works").get();
		return countSnapshot.size;
	} catch (countError) {
		logger.warn("総件数取得エラー", {
			error: countError instanceof Error ? countError.message : String(countError),
		});
		return undefined;
	}
}

/**
 * 管理者用：作品一覧を取得するServer Action
 */
export async function getWorksForAdmin(
	params: Partial<WorkPaginationParams> = {},
): Promise<{ success: true; data: WorkListResultPlain } | { success: false; error: string }> {
	try {
		// 認証チェック（管理者権限必須）
		const authCheck = await checkAdminPermissionForWorks();
		if (!authCheck.success) {
			return authCheck;
		}

		// パラメータのバリデーション
		const validationResult = WorkPaginationParamsSchema.safeParse(params);
		if (!validationResult.success) {
			return {
				success: false,
				error: `検索条件が無効です: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
			};
		}

		const validatedParams = validationResult.data;
		const firestore = getFirestore();
		const worksRef = firestore.collection("works");

		// クエリ構築
		let query = buildWorksQuery(worksRef, validatedParams);
		query = await applyPagination(query, firestore, validatedParams);

		// limit+1を取得して、次のページがあるかどうかを判定
		const snapshot = await query.limit(validatedParams.limit + 1).get();

		if (snapshot.empty) {
			return {
				success: true,
				data: { works: [], hasMore: false },
			};
		}

		const docs = snapshot.docs;
		const hasMore = docs.length > validatedParams.limit;
		const workDocs = hasMore ? docs.slice(0, -1) : docs;

		// データ変換
		const works = processWorkDocuments(workDocs);
		const lastWork = works.length > 0 ? works[works.length - 1] : undefined;

		// 総件数の取得
		const totalCount = await getTotalWorksCount(firestore);

		return {
			success: true,
			data: {
				works,
				hasMore,
				lastWork,
				totalCount,
				filteredCount: totalCount, // 管理者画面ではフィルタリング前後の件数は同じ
			},
		};
	} catch (error) {
		logger.error("管理者用作品一覧取得でエラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		return {
			success: false,
			error: "作品一覧の取得に失敗しました。",
		};
	}
}

/**
 * 管理者用：作品データをリフレッシュするServer Action
 */
export async function refreshWorkData(
	workId: string,
): Promise<{ success: true; data: { message: string } } | { success: false; error: string }> {
	try {
		logger.info("作品データリフレッシュを開始", { workId });

		// 認証チェック（管理者権限必須）
		const user = await requireAuth();
		if (user.role !== "admin") {
			logger.warn("管理者権限が必要", { userId: user.discordId, workId });
			return {
				success: false,
				error: "この操作には管理者権限が必要です",
			};
		}

		if (!workId || typeof workId !== "string") {
			return {
				success: false,
				error: "作品IDが指定されていません",
			};
		}

		const firestore = getFirestore();
		const workRef = firestore.collection("works").doc(workId);

		// 作品の存在確認
		const workDoc = await workRef.get();
		if (!workDoc.exists) {
			return {
				success: false,
				error: "指定された作品が見つかりません",
			};
		}

		const workData = workDoc.data() as WorkDocument;

		// DLsite Individual Info APIから最新情報を取得
		// 実際の実装では、Cloud Functionsのエンドポイントを呼び出すか、
		// DLsite APIを直接呼び出す
		try {
			// Individual Info APIエンドポイントを呼び出し
			const response = await fetch(`${process.env.FUNCTIONS_URL}/dlsite-individual-info-api`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					productIds: [workData.productId],
				}),
			});

			if (!response.ok) {
				throw new Error(`API呼び出し失敗: ${response.status}`);
			}

			// 更新日時をマーク
			await workRef.update({
				lastFetchedAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});

			// キャッシュの無効化
			revalidatePath("/admin/works");
			revalidatePath(`/works/${workId}`);

			logger.info("作品データリフレッシュが正常に完了", {
				workId,
				productId: workData.productId,
				refreshedBy: user.discordId,
			});

			return {
				success: true,
				data: { message: "作品データをリフレッシュしました" },
			};
		} catch (apiError) {
			logger.error("DLsite API呼び出しエラー", {
				workId,
				productId: workData.productId,
				error: apiError instanceof Error ? apiError.message : String(apiError),
			});

			return {
				success: false,
				error: "DLsiteからの最新データ取得に失敗しました",
			};
		}
	} catch (error) {
		logger.error("作品データリフレッシュでエラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			workId,
		});

		return {
			success: false,
			error: "作品データのリフレッシュに失敗しました。しばらく時間をおいてから再度お試しください。",
		};
	}
}

/**
 * 管理者用：全作品データを一括リフレッシュするServer Action
 */
export async function refreshAllWorksData(): Promise<
	{ success: true; data: { message: string } } | { success: false; error: string }
> {
	try {
		logger.info("全作品データ一括リフレッシュを開始");

		// 認証チェック（管理者権限必須）
		const user = await requireAuth();
		if (user.role !== "admin") {
			logger.warn("管理者権限が必要", { userId: user.discordId });
			return {
				success: false,
				error: "この操作には管理者権限が必要です",
			};
		}

		// Cloud FunctionsのIndividual Info APIエンドポイントを呼び出し
		try {
			const response = await fetch(`${process.env.FUNCTIONS_URL}/dlsite-individual-info-api`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					refreshAll: true,
				}),
			});

			if (!response.ok) {
				throw new Error(`API呼び出し失敗: ${response.status}`);
			}

			// キャッシュの無効化
			revalidatePath("/admin/works");
			revalidatePath("/works");

			logger.info("全作品データ一括リフレッシュが正常に完了", {
				triggeredBy: user.discordId,
			});

			return {
				success: true,
				data: { message: "全作品データの一括リフレッシュを開始しました" },
			};
		} catch (apiError) {
			logger.error("DLsite一括リフレッシュAPI呼び出しエラー", {
				error: apiError instanceof Error ? apiError.message : String(apiError),
			});

			return {
				success: false,
				error: "DLsiteからの一括データ更新に失敗しました",
			};
		}
	} catch (error) {
		logger.error("全作品データ一括リフレッシュでエラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		return {
			success: false,
			error:
				"全作品データの一括リフレッシュに失敗しました。しばらく時間をおいてから再度お試しください。",
		};
	}
}
