"use client";

import { useMemo } from "react";

interface HighlightTextProps {
	text: string;
	searchQuery: string;
	className?: string;
	highlightClassName?: string;
}

/**
 * テキスト内の検索クエリにマッチする部分をハイライト表示するコンポーネント
 */
export function HighlightText({
	text,
	searchQuery,
	className = "",
	highlightClassName = "bg-yellow-200 text-yellow-900 px-1 rounded",
}: HighlightTextProps) {
	const highlightedText = useMemo(() => {
		if (!searchQuery || !text) {
			return <span className={className}>{text}</span>;
		}

		// 検索クエリを正規化（大文字小文字を無視、トリム）
		const normalizedQuery = searchQuery.trim();
		if (!normalizedQuery) {
			return <span className={className}>{text}</span>;
		}

		// 複数の検索語に対応（スペース区切り）
		const queryTerms = normalizedQuery
			.split(/\s+/)
			.filter((term) => term.length > 0)
			.map((term) => escapeRegExp(term));

		if (queryTerms.length === 0) {
			return <span className={className}>{text}</span>;
		}

		// 正規表現を作成（OR演算子で結合、大文字小文字を無視）
		const regex = new RegExp(`(${queryTerms.join("|")})`, "gi");

		// テキストを分割してハイライト
		const parts = text.split(regex);

		return (
			<span className={className}>
				{parts.map((part, index) => {
					// 空文字列はスキップ
					if (!part) return null;

					// ハイライト対象かチェック
					const isHighlight = queryTerms.some((term) =>
						part.toLowerCase().includes(term.toLowerCase()),
					);

					if (isHighlight) {
						return (
							<mark key={index} className={highlightClassName}>
								{part}
							</mark>
						);
					}

					return <span key={index}>{part}</span>;
				})}
			</span>
		);
	}, [text, searchQuery, className, highlightClassName]);

	return highlightedText;
}

/**
 * 正規表現で使用する特殊文字をエスケープ
 */
function escapeRegExp(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 複数フィールドにわたってハイライトするためのヘルパーコンポーネント
 */
interface MultiFieldHighlightProps {
	fields: Array<{
		value: string;
		className?: string;
	}>;
	searchQuery: string;
	highlightClassName?: string;
	separator?: string;
}

export function MultiFieldHighlight({
	fields,
	searchQuery,
	highlightClassName,
	separator = " ",
}: MultiFieldHighlightProps) {
	return (
		<>
			{fields.map((field, index) => (
				<span key={index}>
					<HighlightText
						text={field.value}
						searchQuery={searchQuery}
						className={field.className}
						highlightClassName={highlightClassName}
					/>
					{index < fields.length - 1 && separator}
				</span>
			))}
		</>
	);
}

/**
 * タグリスト内でハイライトするためのコンポーネント
 */
interface HighlightTagsProps {
	tags: string[];
	searchQuery: string;
	className?: string;
	tagClassName?: string;
	highlightClassName?: string;
}

export function HighlightTags({
	tags,
	searchQuery,
	className = "flex flex-wrap gap-1",
	tagClassName = "inline-block px-2 py-1 text-xs bg-muted text-muted-foreground rounded-full",
	highlightClassName = "bg-yellow-200 text-yellow-900",
}: HighlightTagsProps) {
	return (
		<div className={className}>
			{tags.map((tag, index) => (
				<span key={index} className={tagClassName}>
					<HighlightText
						text={tag}
						searchQuery={searchQuery}
						highlightClassName={highlightClassName}
					/>
				</span>
			))}
		</div>
	);
}
