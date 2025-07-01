import { cn } from "@suzumina.click/ui/lib/utils";

interface HighlightTextProps {
	text: string;
	searchQuery: string;
	className?: string;
	highlightClassName?: string;
	caseSensitive?: boolean;
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegExp(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Splits text into parts that match and don't match the search query
 */
function getHighlightParts(
	text: string,
	searchQuery: string,
	caseSensitive = false,
): Array<{ text: string; highlight: boolean }> {
	if (!searchQuery.trim()) {
		return [{ text, highlight: false }];
	}

	// Handle Japanese text and multiple keywords
	const keywords = searchQuery
		.trim()
		.split(/\s+/)
		.filter((keyword) => keyword.length > 0)
		.map((keyword) => escapeRegExp(keyword));

	if (keywords.length === 0) {
		return [{ text, highlight: false }];
	}

	// Create regex pattern that matches any of the keywords
	const pattern = keywords.join("|");
	const flags = caseSensitive ? "g" : "gi";

	try {
		const regex = new RegExp(`(${pattern})`, flags);
		const parts: Array<{ text: string; highlight: boolean }> = [];
		let lastIndex = 0;

		text.replace(regex, (match, _p1, offset) => {
			// Add non-matching text before the match
			if (offset > lastIndex) {
				parts.push({
					text: text.slice(lastIndex, offset),
					highlight: false,
				});
			}

			// Add the matching text
			parts.push({
				text: match,
				highlight: true,
			});

			lastIndex = offset + match.length;
			return match;
		});

		// Add remaining non-matching text
		if (lastIndex < text.length) {
			parts.push({
				text: text.slice(lastIndex),
				highlight: false,
			});
		}

		return parts.length > 0 ? parts : [{ text, highlight: false }];
	} catch (_error) {
		return [{ text, highlight: false }];
	}
}

/**
 * Component that highlights search terms within text
 */
export function HighlightText({
	text,
	searchQuery,
	className,
	highlightClassName = "bg-yellow-200 text-yellow-900 font-medium px-0.5 rounded",
	caseSensitive = false,
}: HighlightTextProps) {
	const parts = getHighlightParts(text, searchQuery, caseSensitive);

	return (
		<span className={className}>
			{parts.map((part, index) => {
				// Generate stable key based on part content and position
				const key = `${part.highlight ? "h" : "t"}-${index}-${part.text.slice(0, 10)}`;
				return part.highlight ? (
					<mark
						key={key}
						className={cn(highlightClassName, "mark-reset")}
						data-testid="highlight-match"
					>
						{part.text}
					</mark>
				) : (
					<span key={key}>{part.text}</span>
				);
			})}
		</span>
	);
}
