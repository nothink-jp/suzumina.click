"use server";

import {
	type ContactFormData,
	ContactFormDataSchema,
	type ContactPriority,
	type ContactStatus,
	type FrontendContactData,
} from "@suzumina.click/shared-types/src/contact";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAuth } from "@/components/system/protected-route";
import { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";

/**
 * お問い合わせフォームを送信するServer Action（既存のcontact/actions.tsと統合）
 */
export async function submitContactForm(
	data: ContactFormData,
): Promise<
	{ success: true; data: { id: string; message: string } } | { success: false; error: string }
> {
	try {
		// バリデーション
		const validationResult = ContactFormDataSchema.safeParse(data);
		if (!validationResult.success) {
			logger.warn("お問い合わせフォームのバリデーション失敗", {
				errors: validationResult.error.issues,
				data,
			});
			return {
				success: false,
				error: `入力データが無効です: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
			};
		}

		const validatedData = validationResult.data;

		// ヘッダー情報の取得（スパム対策用）
		const headersList = await headers();
		const forwardedFor = headersList.get("x-forwarded-for");
		const clientIp = forwardedFor ? (forwardedFor.split(",")[0] || "unknown").trim() : "unknown";
		const userAgent = headersList.get("user-agent") || "unknown";

		// Firestoreに保存するデータ
		const now = new Date().toISOString();
		const contactData = {
			category: validatedData.category,
			subject: validatedData.subject,
			content: validatedData.content,
			email:
				validatedData.email && validatedData.email.trim() !== "" ? validatedData.email : undefined,
			ipAddress: clientIp,
			userAgent: userAgent,
			timestamp: now,
			createdAt: now,
			status: "new" as const,
			priority: "medium" as const,
		};

		// Firestoreに保存
		const firestore = getFirestore();
		const contactRef = await firestore.collection("contacts").add(contactData);

		// キャッシュの無効化
		revalidatePath("/contact");
		revalidatePath("/admin/contacts");

		logger.info("お問い合わせ送信が正常に完了", {
			contactId: contactRef.id,
			category: validatedData.category,
			subject: validatedData.subject,
		});

		return {
			success: true,
			data: {
				id: contactRef.id,
				message: "お問い合わせを受け付けました",
			},
		};
	} catch (error) {
		logger.error("お問い合わせ送信でエラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		return {
			success: false,
			error: "お問い合わせの送信に失敗しました。しばらく時間をおいてから再度お試しください。",
		};
	}
}

/**
 * 管理者用：お問い合わせ状態を更新するServer Action
 */
export async function updateContactStatus(
	contactId: string,
	input: {
		status?: ContactStatus;
		priority?: ContactPriority;
		adminNote?: string;
	},
): Promise<{ success: true; data: { message: string } } | { success: false; error: string }> {
	try {
		logger.info("お問い合わせ状態更新を開始", { contactId });

		// 認証チェック（管理者権限必須）
		const user = await requireAuth();
		if (user.role !== "admin") {
			logger.warn("管理者権限が必要", { userId: user.discordId, contactId });
			return {
				success: false,
				error: "この操作には管理者権限が必要です",
			};
		}

		if (!contactId || typeof contactId !== "string") {
			return {
				success: false,
				error: "お問い合わせIDが指定されていません",
			};
		}

		const firestore = getFirestore();
		const contactRef = firestore.collection("contacts").doc(contactId);

		// お問い合わせの存在確認
		const contactDoc = await contactRef.get();
		if (!contactDoc.exists) {
			return {
				success: false,
				error: "指定されたお問い合わせが見つかりません",
			};
		}

		// 更新データの構築
		const updateData: Record<string, unknown> = {
			updatedAt: new Date().toISOString(),
			handledBy: user.discordId,
		};

		if (input.status !== undefined) {
			const validStatuses: ContactStatus[] = ["new", "reviewing", "resolved"];
			if (!validStatuses.includes(input.status)) {
				return {
					success: false,
					error: "無効なステータスが指定されました",
				};
			}
			updateData.status = input.status;
		}

		if (input.priority !== undefined) {
			const validPriorities: ContactPriority[] = ["low", "medium", "high"];
			if (!validPriorities.includes(input.priority)) {
				return {
					success: false,
					error: "無効な優先度が指定されました",
				};
			}
			updateData.priority = input.priority;
		}

		if (input.adminNote !== undefined) {
			updateData.adminNote = input.adminNote;
		}

		// Firestoreを更新
		await contactRef.update(updateData);

		// キャッシュの無効化
		revalidatePath("/admin/contacts");

		logger.info("お問い合わせ状態更新が正常に完了", {
			contactId,
			updatedBy: user.discordId,
			updatedFields: Object.keys(updateData),
		});

		return {
			success: true,
			data: { message: "お問い合わせ状態を更新しました" },
		};
	} catch (error) {
		logger.error("お問い合わせ状態更新でエラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			contactId,
		});

		return {
			success: false,
			error: "お問い合わせ状態の更新に失敗しました。しばらく時間をおいてから再度お試しください。",
		};
	}
}

/**
 * 管理者用：お問い合わせを削除するServer Action
 */
export async function deleteContact(
	contactId: string,
): Promise<{ success: true; data: { message: string } } | { success: false; error: string }> {
	try {
		logger.info("お問い合わせ削除を開始", { contactId });

		// 認証チェック（管理者権限必須）
		const user = await requireAuth();
		if (user.role !== "admin") {
			logger.warn("管理者権限が必要", { userId: user.discordId, contactId });
			return {
				success: false,
				error: "この操作には管理者権限が必要です",
			};
		}

		if (!contactId || typeof contactId !== "string") {
			return {
				success: false,
				error: "お問い合わせIDが指定されていません",
			};
		}

		const firestore = getFirestore();
		const contactRef = firestore.collection("contacts").doc(contactId);

		// お問い合わせの存在確認
		const contactDoc = await contactRef.get();
		if (!contactDoc.exists) {
			return {
				success: false,
				error: "指定されたお問い合わせが見つかりません",
			};
		}

		// お問い合わせ削除
		await contactRef.delete();

		// キャッシュの無効化
		revalidatePath("/admin/contacts");

		logger.info("お問い合わせ削除が正常に完了", {
			contactId,
			deletedBy: user.discordId,
		});

		return {
			success: true,
			data: { message: "お問い合わせを削除しました" },
		};
	} catch (error) {
		logger.error("お問い合わせ削除でエラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			contactId,
		});

		return {
			success: false,
			error: "お問い合わせの削除に失敗しました。しばらく時間をおいてから再度お試しください。",
		};
	}
}

/**
 * 管理者用：お問い合わせ一覧を取得するServer Action
 */
export async function getContactsForAdmin(params?: {
	status?: ContactStatus;
	priority?: ContactPriority;
	limit?: number;
	startAfter?: string;
}): Promise<
	| { success: true; data: { contacts: FrontendContactData[]; hasMore: boolean } }
	| { success: false; error: string }
> {
	try {
		// 認証チェック（管理者権限必須）
		const user = await requireAuth();
		if (user.role !== "admin") {
			return {
				success: false,
				error: "この操作には管理者権限が必要です",
			};
		}

		const firestore = getFirestore();
		let query = firestore.collection("contacts").orderBy("createdAt", "desc");

		// ステータスフィルター
		if (params?.status) {
			query = query.where("status", "==", params.status);
		}

		// 優先度フィルター
		if (params?.priority) {
			query = query.where("priority", "==", params.priority);
		}

		// ページネーション
		if (params?.startAfter) {
			const startAfterDoc = await firestore.collection("contacts").doc(params.startAfter).get();
			if (startAfterDoc.exists) {
				query = query.startAfter(startAfterDoc);
			}
		}

		// limit+1を取得して、次のページがあるかどうかを判定
		const limit = params?.limit || 20;
		const snapshot = await query.limit(limit + 1).get();

		if (snapshot.empty) {
			return {
				success: true,
				data: { contacts: [], hasMore: false },
			};
		}

		const docs = snapshot.docs;
		const hasMore = docs.length > limit;
		const contactDocs = hasMore ? docs.slice(0, -1) : docs;

		// データ変換
		const contacts: FrontendContactData[] = contactDocs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		})) as FrontendContactData[];

		return {
			success: true,
			data: {
				contacts,
				hasMore,
			},
		};
	} catch (error) {
		logger.error("管理者用お問い合わせ一覧取得でエラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		return {
			success: false,
			error: "お問い合わせ一覧の取得に失敗しました。",
		};
	}
}

/**
 * 管理者用：特定のお問い合わせを取得するServer Action
 */
export async function getContactById(
	contactId: string,
): Promise<{ success: true; data: FrontendContactData } | { success: false; error: string }> {
	try {
		// 認証チェック（管理者権限必須）
		const user = await requireAuth();
		if (user.role !== "admin") {
			return {
				success: false,
				error: "この操作には管理者権限が必要です",
			};
		}

		if (!contactId || typeof contactId !== "string") {
			return {
				success: false,
				error: "お問い合わせIDが指定されていません",
			};
		}

		const firestore = getFirestore();
		const doc = await firestore.collection("contacts").doc(contactId).get();

		if (!doc.exists) {
			return {
				success: false,
				error: "指定されたお問い合わせが見つかりません",
			};
		}

		const contactData: FrontendContactData = {
			id: doc.id,
			...doc.data(),
		} as FrontendContactData;

		return {
			success: true,
			data: contactData,
		};
	} catch (error) {
		logger.error("getContactById failed", {
			contactId,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return {
			success: false,
			error: "お問い合わせの取得に失敗しました",
		};
	}
}

/**
 * 管理者用：お問い合わせ統計を取得するServer Action
 */
export async function getContactStats(): Promise<
	| {
			success: true;
			data: {
				total: number;
				new: number;
				reviewing: number;
				resolved: number;
				highPriority: number;
			};
	  }
	| { success: false; error: string }
> {
	try {
		// 認証チェック（管理者権限必須）
		const user = await requireAuth();
		if (user.role !== "admin") {
			return {
				success: false,
				error: "この操作には管理者権限が必要です",
			};
		}

		const firestore = getFirestore();

		// 並列でクエリを実行
		const [totalSnapshot, newSnapshot, reviewingSnapshot, resolvedSnapshot, highPrioritySnapshot] =
			await Promise.all([
				firestore.collection("contacts").get(),
				firestore.collection("contacts").where("status", "==", "new").get(),
				firestore.collection("contacts").where("status", "==", "reviewing").get(),
				firestore.collection("contacts").where("status", "==", "resolved").get(),
				firestore.collection("contacts").where("priority", "==", "high").get(),
			]);

		return {
			success: true,
			data: {
				total: totalSnapshot.size,
				new: newSnapshot.size,
				reviewing: reviewingSnapshot.size,
				resolved: resolvedSnapshot.size,
				highPriority: highPrioritySnapshot.size,
			},
		};
	} catch (error) {
		logger.error("お問い合わせ統計取得でエラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		return {
			success: false,
			error: "お問い合わせ統計の取得に失敗しました。",
		};
	}
}
