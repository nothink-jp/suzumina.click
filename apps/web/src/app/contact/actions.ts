"use server";

import { type ContactFormData, ContactFormDataSchema } from "@suzumina.click/shared-types";
import { headers } from "next/headers";
import { z } from "zod";
import { sendContactNotification } from "@/lib/email";
import { getFirestore } from "@/lib/firestore";
import { error as logError } from "@/lib/logger";

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
		// Cloudflare 経由なら cf-connecting-ip が正（x-forwarded-for の先頭はクライアントが偽装できる）。
		// ただしオリジン迂回（SPR-366/367）では cf-connecting-ip もクライアントが付けられるため信頼キーにしない
		const clientIp =
			headersList.get("cf-connecting-ip")?.trim() ||
			headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
			"unknown";
		const userAgent = headersList.get("user-agent") || "unknown";

		// Firestoreに保存するデータ
		const now = new Date().toISOString();
		// status/priority は admin 撤去後に読み手が無く SPR-241 で廃止（通知は下の Resend メールが正）
		const contactData = {
			...validatedData,
			// 空文字の場合はundefinedに変換
			email: validatedData.email || undefined,
			ipAddress: clientIp,
			userAgent,
			timestamp: now,
			createdAt: now,
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
			logError("Failed to send contact notification email", emailError);
		}

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
