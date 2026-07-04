import { z } from "zod";

/**
 * お問い合わせカテゴリ
 */
export const ContactCategorySchema = z.enum(["bug", "feature", "usage", "other"]);
export type ContactCategory = z.infer<typeof ContactCategorySchema>;

// 運用は Resend メール通知のみ（apps/web/src/lib/email.ts）。Firestore の contacts は送信記録の
// アーカイブで読み手を持たない。admin 撤去（SPR-164）で死んだ status/priority/adminNote/handledBy と
// 表示ヘルパー群は SPR-241 で撤去した。

/**
 * Firestoreに保存するお問い合わせデータ
 * 書き込み元: apps/web/src/app/contact/actions.ts
 */
export const FirestoreContactDataSchema = z.object({
	category: ContactCategorySchema,
	subject: z.string().min(1).max(100),
	content: z.string().min(10).max(2000),
	email: z.string().email().optional(),
	ipAddress: z.string(),
	userAgent: z.string(),
	createdAt: z.string(),
	timestamp: z.string(),
});

export type FirestoreContactData = z.infer<typeof FirestoreContactDataSchema>;

/**
 * お問い合わせフォーム送信データ
 */
export const ContactFormDataSchema = z.object({
	category: ContactCategorySchema,
	subject: z.string().min(1).max(100),
	content: z.string().min(10).max(2000),
	email: z.string().email().optional().or(z.literal("")),
});

export type ContactFormData = z.infer<typeof ContactFormDataSchema>;
