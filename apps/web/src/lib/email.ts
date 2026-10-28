import type { ContactCategory } from "@suzumina.click/shared-types";
import { Resend } from "resend";
import { escapeHtml } from "@/utils/escape-html";
import { error as logError } from "./logger";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface ContactEmailData {
	category: ContactCategory;
	subject: string;
	content: string;
	email?: string;
	ipAddress: string;
	userAgent: string;
	timestamp: string;
}

const categoryLabels: Record<ContactCategory, string> = {
	bug: "🐛 バグ報告",
	feature: "💡 機能要望",
	usage: "❓ 使い方",
	other: "📢 その他",
};

/**
 * 運営宛てにお問い合わせの通知メールを送る
 *
 * 失敗しても throw せず false を返す（通知は best-effort で、保存済みのお問い合わせを巻き戻さないため）
 */
export async function sendContactNotification(data: ContactEmailData): Promise<boolean> {
	try {
		const categoryLabel = categoryLabels[data.category];
		const senderEmail = data.email || "未入力";
		// Cloud Run は UTC で動くので、タイムゾーンを明示しないと UTC の時刻がそのまま出る
		const submittedAt = new Date(data.timestamp).toLocaleString("ja-JP", {
			timeZone: "Asia/Tokyo",
		});

		// 件名・本文・UA 等は送信者が自由に決められるため、HTML 版だけエスケープする（テキスト版は生のまま）
		const html = {
			subject: escapeHtml(data.subject),
			content: escapeHtml(data.content),
			email: escapeHtml(senderEmail),
			ipAddress: escapeHtml(data.ipAddress),
			userAgent: escapeHtml(data.userAgent),
		};

		const emailHtml = `
			<h2>新しいお問い合わせ</h2>
			<div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
				<h3 style="color: #333; margin-top: 0;">お問い合わせ情報</h3>
				<p><strong>種別:</strong> ${categoryLabel}</p>
				<p><strong>件名:</strong> ${html.subject}</p>
				<p><strong>送信者メール:</strong> ${html.email}</p>
				<p><strong>送信時刻:</strong> ${submittedAt}</p>
			</div>
			
			<div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0;">
				<h3 style="color: #333; margin-top: 0;">お問い合わせ内容</h3>
				<div style="white-space: pre-wrap; font-family: monospace; background-color: #f9f9f9; padding: 15px; border-radius: 4px;">
${html.content}
				</div>
			</div>
			
			<div style="background-color: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
				<h4 style="color: #666; margin-top: 0;">技術情報</h4>
				<p><strong>IP Address:</strong> ${html.ipAddress}</p>
				<p><strong>User Agent:</strong> ${html.userAgent}</p>
			</div>
			
			<hr style="margin: 30px 0;">
			<p style="color: #666; font-size: 12px;">
				このメールは suzumina.click のお問い合わせフォームから自動送信されています。
			</p>
		`;

		const emailText = `
新しいお問い合わせ

種別: ${categoryLabel}
件名: ${data.subject}
送信者メール: ${senderEmail}
送信時刻: ${submittedAt}

お問い合わせ内容:
${data.content}

技術情報:
IP Address: ${data.ipAddress}
User Agent: ${data.userAgent}

このメールは suzumina.click のお問い合わせフォームから自動送信されています。
		`;

		// 送信先メールアドレスを環境変数から取得（デフォルト値付き）
		const recipients = process.env.CONTACT_EMAIL_RECIPIENTS
			? process.env.CONTACT_EMAIL_RECIPIENTS.split(",").map((email) => email.trim())
			: ["nothink@nothink.jp"];

		// Resend は API エラー（鍵・ドメイン・レート制限等）では throw せず { error } を返すので、明示的に見る
		const { error } = await resend.emails.send({
			from: "suzumina.click <no-reply@suzumina.click>",
			to: recipients,
			subject: `[suzumina.click] ${categoryLabel} - ${data.subject}`,
			html: emailHtml,
			text: emailText,
		});
		if (error) {
			logError("Resend rejected contact notification email", { error });
			return false;
		}

		return true;
	} catch (error) {
		logError("Failed to send contact notification email", error);
		return false;
	}
}
