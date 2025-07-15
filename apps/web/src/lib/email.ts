import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface ContactEmailData {
	category: string;
	subject: string;
	content: string;
	email?: string;
	ipAddress: string;
	userAgent: string;
	timestamp: string;
}

export async function sendContactNotification(data: ContactEmailData): Promise<boolean> {
	try {
		const categoryLabels = {
			bug: "🐛 バグ報告",
			feature: "💡 機能要望",
			usage: "❓ 使い方",
			other: "📢 その他",
		};

		const categoryLabel =
			categoryLabels[data.category as keyof typeof categoryLabels] || "📢 その他";

		const emailHtml = `
			<h2>新しいお問い合わせ</h2>
			<div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
				<h3 style="color: #333; margin-top: 0;">お問い合わせ情報</h3>
				<p><strong>種別:</strong> ${categoryLabel}</p>
				<p><strong>件名:</strong> ${data.subject}</p>
				<p><strong>送信者メール:</strong> ${data.email || "未入力"}</p>
				<p><strong>送信時刻:</strong> ${new Date(data.timestamp).toLocaleString("ja-JP")}</p>
			</div>
			
			<div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0;">
				<h3 style="color: #333; margin-top: 0;">お問い合わせ内容</h3>
				<div style="white-space: pre-wrap; font-family: monospace; background-color: #f9f9f9; padding: 15px; border-radius: 4px;">
${data.content}
				</div>
			</div>
			
			<div style="background-color: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
				<h4 style="color: #666; margin-top: 0;">技術情報</h4>
				<p><strong>IP Address:</strong> ${data.ipAddress}</p>
				<p><strong>User Agent:</strong> ${data.userAgent}</p>
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
送信者メール: ${data.email || "未入力"}
送信時刻: ${new Date(data.timestamp).toLocaleString("ja-JP")}

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

		await resend.emails.send({
			from: "suzumina.click <no-reply@send.suzumina.click>",
			to: recipients,
			subject: `[suzumina.click] ${categoryLabel} - ${data.subject}`,
			html: emailHtml,
			text: emailText,
		});

		return true;
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Server-side error logging
		console.error("Failed to send contact notification email:", error);
		return false;
	}
}
