/**
 * 作品の説明文をHTMLに整形する
 * - 改行を段落に変換
 * - URLをリンクに変換
 * - 基本的なHTMLエスケープ
 */
export function formatWorkDescription(description: string): string {
	if (!description) return "";

	// HTMLエスケープ（基本的なもののみ）
	const escapeHtml = (text: string): string => {
		return text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	};

	// URLパターンを検出してリンクに変換
	const linkifyUrls = (text: string): string => {
		const urlPattern = /(https?:\/\/[^\s]+)/g;
		return text.replace(urlPattern, (url) => {
			const cleanUrl = url.replace(/[.,;:!?]$/, ""); // 末尾の句読点を除去
			return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">${cleanUrl}</a>`;
		});
	};

	// 連続する改行で段落を分割
	const paragraphs = description
		.split(/\n{2,}/)
		.map((para) => para.trim())
		.filter((para) => para.length > 0);

	// 各段落を処理
	const formattedParagraphs = paragraphs.map((paragraph) => {
		// HTMLエスケープ
		let formatted = escapeHtml(paragraph);

		// 単一改行は<br>に変換
		formatted = formatted.replace(/\n/g, "<br>");

		// URLをリンクに変換
		formatted = linkifyUrls(formatted);

		return `<p class="mb-4 last:mb-0 text-gray-700 leading-relaxed">${formatted}</p>`;
	});

	return formattedParagraphs.join("");
}

/**
 * 説明文の概要を生成（プレーンテキスト）
 * @param description 元の説明文
 * @param maxLength 最大文字数
 * @returns 概要テキスト
 */
export function generateDescriptionSummary(description: string, maxLength = 150): string {
	if (!description) return "";

	// 改行をスペースに変換して整形
	const plainText = description.replace(/\n+/g, " ").trim();

	if (plainText.length <= maxLength) {
		return plainText;
	}

	// 指定文字数で切り詰めて省略記号を追加
	return `${plainText.substring(0, maxLength)}...`;
}
