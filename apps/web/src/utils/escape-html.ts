/**
 * HTML の特殊文字をエスケープする。ユーザー入力を HTML テンプレートへ埋め込む前に通す
 */
export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}
