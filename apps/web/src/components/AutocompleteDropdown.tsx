import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Card } from "@suzumina.click/ui/components/ui/card";
import { cn } from "@suzumina.click/ui/lib/utils";
import { FileText, Loader2, Search, Tag, Video } from "lucide-react";
import { useEffect, useRef } from "react";
import type { AutocompleteSuggestion } from "@/app/search/actions";

interface AutocompleteDropdownProps {
	suggestions: AutocompleteSuggestion[];
	isLoading: boolean;
	isVisible: boolean;
	onSelect: (suggestion: AutocompleteSuggestion) => void;
	onClose: () => void;
	highlightedIndex: number;
	onHighlightChange: (index: number) => void;
	className?: string;
}

const SUGGESTION_ICONS = {
	tag: Tag,
	title: FileText,
	video: Video,
	work: FileText,
} as const;

const SUGGESTION_LABELS = {
	tag: "タグ",
	title: "音声ボタン",
	video: "動画",
	work: "作品",
} as const;

function SuggestionItem({
	suggestion,
	isHighlighted,
	onClick,
	onMouseEnter,
}: {
	suggestion: AutocompleteSuggestion;
	isHighlighted: boolean;
	onClick: () => void;
	onMouseEnter: () => void;
}) {
	const IconComponent = SUGGESTION_ICONS[suggestion.type];

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard navigation is handled by the parent component
		// biome-ignore lint/a11y/useSemanticElements: This is a valid ARIA pattern for autocomplete
		<div
			className={cn(
				"flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors",
				"hover:bg-suzuka-50 focus:bg-suzuka-50",
				isHighlighted && "bg-suzuka-50",
			)}
			onClick={onClick}
			onMouseEnter={onMouseEnter}
			role="option"
			aria-selected={isHighlighted}
			tabIndex={-1}
		>
			<div className="flex items-center gap-2 min-w-0 flex-1">
				<div className="flex items-center gap-1.5 text-suzuka-600">
					{suggestion.icon ? (
						<span className="text-sm">{suggestion.icon}</span>
					) : (
						<IconComponent className="w-4 h-4" />
					)}
				</div>

				<div className="min-w-0 flex-1">
					<div className="text-sm font-medium text-gray-900 truncate">{suggestion.text}</div>
					{suggestion.category && (
						<div className="text-xs text-gray-500">{suggestion.category}</div>
					)}
				</div>
			</div>

			<div className="flex items-center gap-1.5 flex-shrink-0">
				<Badge
					variant="secondary"
					className="text-xs bg-suzuka-100 text-suzuka-700 hover:bg-suzuka-100"
				>
					{SUGGESTION_LABELS[suggestion.type]}
				</Badge>

				{suggestion.count !== undefined && suggestion.count > 0 && suggestion.count !== 999 && (
					<span className="text-xs text-gray-400">{suggestion.count}</span>
				)}
			</div>
		</div>
	);
}

export function AutocompleteDropdown({
	suggestions,
	isLoading,
	isVisible,
	onSelect,
	onClose,
	highlightedIndex,
	onHighlightChange,
	className,
}: AutocompleteDropdownProps) {
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Handle clicks outside the dropdown
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				onClose();
			}
		}

		if (isVisible) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isVisible, onClose]);

	// Scroll highlighted item into view
	useEffect(() => {
		if (highlightedIndex >= 0 && dropdownRef.current) {
			const highlightedElement = dropdownRef.current.querySelector(
				`[data-index="${highlightedIndex}"]`,
			);
			if (highlightedElement) {
				highlightedElement.scrollIntoView({
					block: "nearest",
					behavior: "smooth",
				});
			}
		}
	}, [highlightedIndex]);

	if (!isVisible) {
		return null;
	}

	return (
		// biome-ignore lint/a11y/useSemanticElements: This is a valid ARIA pattern for autocomplete dropdown
		<Card
			ref={dropdownRef}
			className={cn(
				"absolute top-full left-0 right-0 mt-1 z-50",
				"max-h-80 overflow-y-auto shadow-lg border border-gray-200",
				"bg-white rounded-lg",
				className,
			)}
			role="listbox"
		>
			{isLoading && (
				<div className="flex items-center justify-center py-4 text-gray-500">
					<Loader2 className="w-4 h-4 animate-spin mr-2" />
					<span className="text-sm">検索中...</span>
				</div>
			)}

			{!isLoading && suggestions.length === 0 && (
				<div className="flex items-center justify-center py-4 text-gray-500">
					<Search className="w-4 h-4 mr-2" />
					<span className="text-sm">候補が見つかりませんでした</span>
				</div>
			)}

			{!isLoading && suggestions.length > 0 && (
				<div className="py-1">
					{suggestions.map((suggestion, index) => (
						<div key={suggestion.id} data-index={index}>
							<SuggestionItem
								suggestion={suggestion}
								isHighlighted={index === highlightedIndex}
								onClick={() => onSelect(suggestion)}
								onMouseEnter={() => onHighlightChange(index)}
							/>
						</div>
					))}
				</div>
			)}
		</Card>
	);
}
