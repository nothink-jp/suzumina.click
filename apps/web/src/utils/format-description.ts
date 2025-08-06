/**
 * 作品の説明文をHTMLに整形する
 * - 改行を段落に変換
 * - URLをリンクに変換
 * - 基本的なHTMLエスケープ
 * - 特殊な記号の処理
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
		const urlPattern = /(https?:\/\/[^\s）」】]+)/g;
		return text.replace(urlPattern, (url) => {
			const cleanUrl = url.replace(/[.,;:!?）」】]$/, ""); // 末尾の句読点を除去（日本語句読点も含む）
			return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">${cleanUrl}</a>`;
		});
	};

	// 特殊な記法の処理
	const processSpecialFormatting = (text: string): string => {
		let formatted = text;

		// ■や◆などの見出し記号で始まる行を強調表示
		formatted = formatted.replace(
			/^([■◆◇●▼▲]+)(.+)$/gm,
			'<strong class="font-semibold">$1$2</strong>',
		);

		// 【】で囲まれた部分を強調表示
		formatted = formatted.replace(
			/【([^】]+)】/g,
			'<span class="font-semibold text-gray-900">【$1】</span>',
		);

		// ★や☆で始まる行を特別な装飾
		formatted = formatted.replace(/^([★☆]+)(.+)$/gm, '<span class="text-primary">$1</span>$2');

		return formatted;
	};

	// 改行の正規化（Windowsスタイルの改行も処理）
	const normalizedDescription = description.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

	// 連続する改行で段落を分割（3つ以上の改行も2つとして扱う）
	const paragraphs = normalizedDescription
		.split(/\n{2,}/)
		.map((para) => para.trim())
		.filter((para) => para.length > 0);

	// 各段落を処理
	const formattedParagraphs = paragraphs.map((paragraph) => {
		// HTMLエスケープ
		let formatted = escapeHtml(paragraph);

		// 特殊な記法の処理
		formatted = processSpecialFormatting(formatted);

		// 単一改行は<br>に変換
		formatted = formatted.replace(/\n/g, "<br>");

		// URLをリンクに変換
		formatted = linkifyUrls(formatted);

		// リスト項目の検出と処理
		if (formatted.match(/^[・･●○◎▪▫]/m)) {
			const listItems = formatted
				.split(/<br>/g)
				.map((line) => {
					if (line.match(/^[・･●○◎▪▫]/)) {
						return `<li class="ml-4">${line.substring(1).trim()}</li>`;
					}
					return line;
				})
				.join("");
			return `<ul class="list-disc list-inside mb-4 last:mb-0 text-gray-700 leading-relaxed">${listItems}</ul>`;
		}

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
