import { AutocompleteDropdown as GenericAutocompleteDropdown } from "@suzumina.click/ui/components/custom/autocomplete-dropdown";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { cn } from "@suzumina.click/ui/lib/utils";
import { FileText, Tag, Video } from "lucide-react";
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
}: {
	suggestion: AutocompleteSuggestion;
	isHighlighted: boolean;
	onClick?: () => void;
	onMouseEnter?: () => void;
}) {
	const IconComponent = SUGGESTION_ICONS[suggestion.type];

	return (
		<div
			className={cn(
				"flex items-center gap-3 px-3 py-2 transition-colors",
				isHighlighted && "bg-suzuka-50",
			)}
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
					<div className="text-sm font-medium text-foreground truncate">{suggestion.text}</div>
					{suggestion.category && (
						<div className="text-xs text-muted-foreground">{suggestion.category}</div>
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
					<span className="text-xs text-muted-foreground/70">{suggestion.count}</span>
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
	const renderSuggestionItem = (
		item: { id: string; value: AutocompleteSuggestion },
		isHighlighted: boolean,
	) => {
		return (
			<SuggestionItem
				suggestion={item.value}
				isHighlighted={isHighlighted}
				onClick={() => {}} // クリックハンドリングは親コンポーネントで行う
				onMouseEnter={() => {}} // マウスエンターハンドリングは親コンポーネントで行う
			/>
		);
	};

	// AutocompleteSuggestionを汎用的な形式に変換
	const items = suggestions.map((suggestion) => ({
		id: suggestion.id,
		value: suggestion,
	}));

	return (
		<GenericAutocompleteDropdown
			items={items}
			isLoading={isLoading}
			isVisible={isVisible}
			onSelect={(item) => onSelect(item.value)}
			onClose={onClose}
			highlightedIndex={highlightedIndex}
			onHighlightChange={onHighlightChange}
			renderItem={renderSuggestionItem}
			className={className}
			emptyMessage="候補が見つかりませんでした"
			loadingMessage="検索中..."
		/>
	);
}
