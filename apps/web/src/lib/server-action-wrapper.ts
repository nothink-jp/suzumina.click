"use server";

import * as logger from "@/lib/logger";

/**
 * Server Action用の統一エラーハンドリングラッパー
 *
 * このラッパーを使用することで、Server Actions全体で一貫したエラーハンドリングを実現します。
 *
 * @example
 * ```typescript
 * export async function getWorks(params: EnhancedSearchParams) {
 *   return withErrorHandling(
 *     async () => {
 *       const firestore = getFirestore();
 *       // ビジネスロジック
 *       return { works, hasMore, totalCount };
 *     },
 *     {
 *       action: "getWorks",
 *       errorMessage: "作品データの取得に失敗しました",
 *       logContext: { params },
 *     }
 *   );
 * }
 * ```
 */
export async function withErrorHandling<T>(
	fn: () => Promise<T>,
	options: {
		/** アクション名（ログ出力用） */
		action: string;
		/** ユーザー向けエラーメッセージ */
		errorMessage: string;
		/** ログに含める追加コンテキスト */
		logContext?: Record<string, unknown>;
	},
): Promise<{ success: true; data: T } | { success: false; error: string }> {
	try {
		const result = await fn();
		return { success: true, data: result };
	} catch (error) {
		// エラーログ出力（構造化ログ）
		logger.error(`${options.action}でエラーが発生`, {
			action: options.action,
			...options.logContext,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack?.split("\n").slice(0, 3).join("\n") : undefined,
		});

		// ユーザー向けエラーレスポンス
		// 具体的なエラーメッセージが投げられた場合はそれを使用
		const errorMessage = error instanceof Error ? error.message : options.errorMessage;
		return {
			success: false,
			error: errorMessage,
		};
	}
}

/**
 * 認証が必要なServer Action用ラッパー
 *
 * @example
 * ```typescript
 * export async function updateUserProfile(data: UpdateProfileData) {
 *   return withAuthenticatedAction(
 *     async (user) => {
 *       // userが自動的に利用可能
 *       const firestore = getFirestore();
 *       await firestore.collection("users").doc(user.discordId).update(data);
 *       return { updated: true };
 *     },
 *     {
 *       action: "updateUserProfile",
 *       errorMessage: "プロフィールの更新に失敗しました",
 *       authErrorMessage: "ログインが必要です",
 *     }
 *   );
 * }
 * ```
 */
export async function withAuthenticatedAction<T>(
	fn: (user: { discordId: string; username?: string; displayName?: string }) => Promise<T>,
	options: {
		/** アクション名 */
		action: string;
		/** 通常のエラーメッセージ */
		errorMessage: string;
		/** 認証エラー時のメッセージ */
		authErrorMessage?: string;
		/** ログコンテキスト */
		logContext?: Record<string, unknown>;
	},
): Promise<{ success: true; data: T } | { success: false; error: string }> {
	try {
		// 認証チェック（authモジュールは後で適切にインポート）
		const { auth } = await import("@/auth");
		const session = await auth();

		if (!session?.user) {
			logger.warn(`${options.action}: 未認証のアクセス`, options.logContext);
			return {
				success: false,
				error: options.authErrorMessage || "ログインが必要です",
			};
		}

		// 認証済みの場合、本処理を実行
		const result = await fn(session.user);
		return { success: true, data: result };
	} catch (error) {
		logger.error(`${options.action}でエラーが発生`, {
			action: options.action,
			...options.logContext,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack?.split("\n").slice(0, 3).join("\n") : undefined,
		});

		const errorMessage = error instanceof Error ? error.message : options.errorMessage;
		return {
			success: false,
			error: errorMessage,
		};
	}
}

/**
 * バリデーション付きServer Action用ラッパー
 *
 * @example
 * ```typescript
 * export async function createAudioButton(input: CreateAudioButtonInput) {
 *   return withValidation(
 *     input,
 *     (data) => {
 *       if (!data.buttonText?.trim()) return "ボタンテキストは必須です";
 *       if (data.startTime >= data.endTime) return "開始時間は終了時間より前にしてください";
 *       return null; // バリデーション成功
 *     },
 *     async (validatedData) => {
 *       // バリデーション済みデータで処理
 *       const firestore = getFirestore();
 *       const docRef = await firestore.collection("audioButtons").add(validatedData);
 *       return { id: docRef.id };
 *     },
 *     {
 *       action: "createAudioButton",
 *       errorMessage: "音声ボタンの作成に失敗しました",
 *     }
 *   );
 * }
 * ```
 */
export async function withValidation<TInput, TOutput>(
	input: TInput,
	validator: (input: TInput) => string | null,
	fn: (validatedInput: TInput) => Promise<TOutput>,
	options: {
		/** アクション名 */
		action: string;
		/** 処理エラー時のメッセージ */
		errorMessage: string;
		/** ログコンテキスト */
		logContext?: Record<string, unknown>;
	},
): Promise<{ success: true; data: TOutput } | { success: false; error: string }> {
	// 入力バリデーション
	const validationError = validator(input);
	if (validationError) {
		logger.warn(`${options.action}: バリデーションエラー`, {
			action: options.action,
			error: validationError,
			...options.logContext,
		});
		return { success: false, error: validationError };
	}

	// バリデーション成功後、本処理を実行
	return withErrorHandling(() => fn(input), options);
}

/**
 * トランザクション処理用ラッパー
 *
 * @example
 * ```typescript
 * export async function transferCredits(from: string, to: string, amount: number) {
 *   return withTransaction(
 *     async (transaction, firestore) => {
 *       const fromDoc = await transaction.get(firestore.collection("users").doc(from));
 *       const toDoc = await transaction.get(firestore.collection("users").doc(to));
 *
 *       // トランザクション内での処理
 *       transaction.update(fromDoc.ref, { credits: fromDoc.data().credits - amount });
 *       transaction.update(toDoc.ref, { credits: toDoc.data().credits + amount });
 *
 *       return { transferred: amount };
 *     },
 *     {
 *       action: "transferCredits",
 *       errorMessage: "クレジットの転送に失敗しました",
 *     }
 *   );
 * }
 * ```
 */
export async function withTransaction<T>(
	fn: (
		transaction: FirebaseFirestore.Transaction,
		firestore: FirebaseFirestore.Firestore,
	) => Promise<T>,
	options: {
		/** アクション名 */
		action: string;
		/** エラーメッセージ */
		errorMessage: string;
		/** ログコンテキスト */
		logContext?: Record<string, unknown>;
		/** リトライ回数（デフォルト: 3） */
		maxRetries?: number;
	},
): Promise<{ success: true; data: T } | { success: false; error: string }> {
	const maxRetries = options.maxRetries || 3;
	let retryCount = 0;

	while (retryCount < maxRetries) {
		try {
			const { getFirestore } = await import("@/lib/firestore");
			const firestore = getFirestore();

			const result = await firestore.runTransaction(async (transaction) => {
				return fn(transaction, firestore);
			});

			return { success: true, data: result };
		} catch (error) {
			retryCount++;

			// トランザクション競合の場合はリトライ
			if (
				error instanceof Error &&
				error.message.includes("contention") &&
				retryCount < maxRetries
			) {
				logger.info(
					`${options.action}: トランザクション競合、リトライ ${retryCount}/${maxRetries}`,
					{
						action: options.action,
						retryCount,
						...options.logContext,
					},
				);
				// 指数バックオフ
				await new Promise((resolve) => setTimeout(resolve, 2 ** retryCount * 100));
				continue;
			}

			// それ以外のエラーまたは最大リトライ回数に達した場合
			logger.error(`${options.action}でエラーが発生`, {
				action: options.action,
				retryCount,
				...options.logContext,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack?.split("\n").slice(0, 3).join("\n") : undefined,
			});

			return {
				success: false,
				error: options.errorMessage,
			};
		}
	}

	return {
		success: false,
		error: options.errorMessage,
	};
}
