"use server";

import { type ContactFormData, ContactFormDataSchema } from "@suzumina.click/shared-types";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { sendContactNotification } from "@/lib/email";
import { getFirestore } from "@/lib/firestore";

export interface ContactSubmissionResult {
	success: boolean;
	message: string;
	id?: string;
	errors?: z.ZodIssue[];
}

/**
 * お問い合わせフォームを送信するServer Action
 */
export async function submitContactForm(data: ContactFormData): Promise<ContactSubmissionResult> {
	try {
		// バリデーション
		const validatedData = ContactFormDataSchema.parse(data);

		// ヘッダー情報の取得（スパム対策用）
		const headersList = await headers();
		const forwardedFor = headersList.get("x-forwarded-for");
		const clientIp = forwardedFor?.split(",")[0]?.trim() || "unknown";
		const userAgent = headersList.get("user-agent") || "unknown";

		// Firestoreに保存するデータ
		const now = new Date().toISOString();
		const contactData = {
			...validatedData,
			// 空文字の場合はundefinedに変換
			email: validatedData.email || undefined,
			ipAddress: clientIp,
			userAgent,
			timestamp: now,
			createdAt: now,
			status: "new" as const, // new, reviewing, resolved
			priority: "medium" as const, // デフォルト優先度
		};

		// Firestoreに保存
		const firestoreDb = getFirestore();
		const contactRef = await firestoreDb.collection("contacts").add(contactData);

		// メール通知送信（非同期、失敗してもメイン処理は続行）
		try {
			await sendContactNotification({
				category: validatedData.category,
				subject: validatedData.subject,
				content: validatedData.content,
				email: validatedData.email === "" ? undefined : validatedData.email,
				ipAddress: clientIp,
				userAgent,
				timestamp: now,
			});
		} catch (emailError) {
			// メール送信失敗はログに記録するが、メイン処理は続行
			// biome-ignore lint/suspicious/noConsole: Server-side error logging
			console.error("Failed to send contact notification email:", emailError);
		}

		// キャッシュの無効化（重要な操作なので即座に反映）
		revalidatePath("/contact");

		return {
			success: true,
			message: "お問い合わせを受け付けました",
			id: contactRef.id,
		};
	} catch (error) {
		if (error instanceof z.ZodError) {
			return {
				success: false,
				message: "入力内容に不備があります",
				errors: error.issues,
			};
		}

		return {
			success: false,
			message: "お問い合わせの送信に失敗しました",
		};
	}
}
