import { ExternalLink } from "lucide-react";
import Link from "next/link";
import React, { Fragment, type ReactNode } from "react";

/**
 * テキスト内のURLを自動的にリンクに変換する関数
 * @param text 変換対象のテキスト
 * @returns URLがリンク化されたReactNode
 */
export function linkifyText(text: string): ReactNode {
	// URL検出用の正規表現（http/https、www、一般的なドメインをサポート）
	const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

	const parts = text.split(urlRegex);

	return parts.map((part, index) => {
		// URL部分の場合はリンクとして表示
		if (urlRegex.test(part)) {
			// URLの正規化（httpがない場合は追加）
			let href = part;
			if (!part.startsWith("http")) {
				href = part.startsWith("www.") ? `https://${part}` : `https://${part}`;
			}

			// 表示用URLを短縮（長すぎる場合）
			const displayUrl = part.length > 50 ? `${part.substring(0, 47)}...` : part;

			return React.createElement(
				Link,
				{
					key: index,
					href: href,
					target: "_blank",
					rel: "noopener noreferrer",
					className:
						"inline-flex items-center gap-1 text-suzuka-600 hover:text-suzuka-700 underline underline-offset-4 decoration-suzuka-400 hover:decoration-suzuka-600 transition-colors",
				},
				React.createElement("span", { className: "break-all" }, displayUrl),
				React.createElement(ExternalLink, { className: "h-3 w-3 flex-shrink-0" }),
			);
		}

		// 通常のテキストの場合はそのまま返す
		return React.createElement(Fragment, { key: index }, part);
	});
}

/**
 * 改行を含むテキストを段落に分割し、各段落内のURLをリンク化する関数
 * @param text 変換対象のテキスト
 * @returns 段落化・リンク化されたReactNode
 */
export function formatDescriptionText(text: string): ReactNode {
	// 空のテキストの場合は早期リターン
	if (!text.trim()) {
		return null;
	}

	// 段落に分割（連続する改行を段落区切りとして扱う）
	const paragraphs = text.split(/\n\s*\n/);

	return paragraphs.map((paragraph, paragraphIndex) => {
		// 段落内の単一改行は<br>として扱う
		const lines = paragraph.split("\n");

		return React.createElement(
			"p",
			{ key: paragraphIndex, className: "mb-4 last:mb-0" },
			lines.map((line, lineIndex) =>
				React.createElement(
					Fragment,
					{ key: lineIndex },
					lineIndex > 0 && React.createElement("br"),
					linkifyText(line),
				),
			),
		);
	});
}
