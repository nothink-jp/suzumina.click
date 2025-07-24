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
 * お問い合わせ優先度
 */
export const ContactPrioritySchema = z.enum(["low", "medium", "high"]);
export type ContactPriority = z.infer<typeof ContactPrioritySchema>;

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
	priority: ContactPrioritySchema.default("medium"),
	adminNote: z.string().optional(),
	handledBy: z.string().optional(),
	createdAt: z.string(),
	timestamp: z.string(),
	updatedAt: z.string().optional(),
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

/**
 * 優先度表示名の取得
 */
export function getPriorityDisplayName(priority: ContactPriority): string {
	const priorityNames: Record<ContactPriority, string> = {
		low: "低",
		medium: "中",
		high: "高",
	};
	return priorityNames[priority];
}

/**
 * 優先度の色を取得
 */
export function getPriorityColor(priority: ContactPriority): string {
	const priorityColors: Record<ContactPriority, string> = {
		low: "text-green-600",
		medium: "text-yellow-600",
		high: "text-red-600",
	};
	return priorityColors[priority];
}
