import { z } from "zod";

/**
 * お問い合わせカテゴリ
 */
export const ContactCategorySchema = z.enum(["bug", "feature", "usage", "other"]);
export type ContactCategory = z.infer<typeof ContactCategorySchema>;

/**
 * お問い合わせステータス
 */
export const ContactStatusSchema = z.enum(["new", "reviewing", "resolved"]);
export type ContactStatus = z.infer<typeof ContactStatusSchema>;

/**
 * Firestoreに保存するお問い合わせデータ
 */
export const FirestoreContactDataSchema = z.object({
	category: ContactCategorySchema,
	subject: z.string().min(1).max(100),
	content: z.string().min(10).max(2000),
	email: z.string().email().optional(),
	ipAddress: z.string(),
	userAgent: z.string(),
	status: ContactStatusSchema,
	createdAt: z.string(),
	timestamp: z.string(),
});

export type FirestoreContactData = z.infer<typeof FirestoreContactDataSchema>;

/**
 * フロントエンド用お問い合わせデータ（ID付き）
 */
export const FrontendContactDataSchema = FirestoreContactDataSchema.extend({
	id: z.string(),
});

export type FrontendContactData = z.infer<typeof FrontendContactDataSchema>;

/**
 * お問い合わせフォーム送信データ
 */
export const ContactFormDataSchema = z.object({
	category: ContactCategorySchema,
	subject: z.string().min(1).max(100),
	content: z.string().min(10).max(2000),
	email: z.string().email().optional().or(z.literal("")),
	timestamp: z.string(),
});

export type ContactFormData = z.infer<typeof ContactFormDataSchema>;

/**
 * カテゴリ表示名の取得
 */
export function getCategoryDisplayName(category: ContactCategory): string {
	const categoryNames: Record<ContactCategory, string> = {
		bug: "🐛 バグ報告",
		feature: "💡 機能要望",
		usage: "❓ 使い方",
		other: "📢 その他",
	};
	return categoryNames[category];
}

/**
 * ステータス表示名の取得
 */
export function getStatusDisplayName(status: ContactStatus): string {
	const statusNames: Record<ContactStatus, string> = {
		new: "新規",
		reviewing: "確認中",
		resolved: "対応済み",
	};
	return statusNames[status];
}
