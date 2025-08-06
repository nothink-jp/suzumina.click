import { Input } from "@suzumina.click/ui/components/ui/input";
import { cn } from "@suzumina.click/ui/lib/utils";
import { Loader2, Search, X } from "lucide-react";
import { type KeyboardEvent, useCallback, useRef, useState } from "react";
import type { AutocompleteSuggestion } from "@/app/search/actions";
import { useAutocomplete } from "@/hooks/use-autocomplete";
import { AutocompleteDropdown } from "./autocomplete-dropdown";

interface SearchInputWithAutocompleteProps {
	value: string;
	onChange: (value: string) => void;
	onSubmit?: () => void;
	onClear?: () => void;
	placeholder?: string;
	className?: string;
	isAutoSearching?: boolean;
	disabled?: boolean;
}

export function SearchInputWithAutocomplete({
	value,
	onChange,
	onSubmit,
	onClear,
	placeholder = "ボタンや作品を検索...（2文字以上で自動検索）",
	className,
	isAutoSearching = false,
	disabled = false,
}: SearchInputWithAutocompleteProps) {
	const [isDropdownVisible, setIsDropdownVisible] = useState(false);
	const [highlightedIndex, setHighlightedIndex] = useState(-1);
	const inputRef = useRef<HTMLInputElement>(null);

	// Use autocomplete hook
	const {
		suggestions,
		isLoading: isAutocompleteLoading,
		clearSuggestions,
	} = useAutocomplete(value, {
		enabled: !disabled && value.length >= 2,
		debounceMs: 200,
		maxSuggestions: 8,
	});

	// Show dropdown when we have suggestions and input is focused
	const showDropdown = isDropdownVisible && (suggestions.length > 0 || isAutocompleteLoading);

	// Handle suggestion selection
	const handleSuggestionSelect = useCallback(
		(suggestion: AutocompleteSuggestion) => {
			onChange(suggestion.text);
			setIsDropdownVisible(false);
			setHighlightedIndex(-1);
			clearSuggestions();

			// Trigger search immediately when selecting a suggestion
			setTimeout(() => {
				if (onSubmit) {
					onSubmit();
				}
			}, 0);
		},
		[onChange, onSubmit, clearSuggestions],
	);

	// Handle input focus
	const handleFocus = useCallback(() => {
		setIsDropdownVisible(true);
	}, []);

	// Handle input blur (with delay to allow clicking suggestions)
	const handleBlur = useCallback(() => {
		setTimeout(() => {
			setIsDropdownVisible(false);
			setHighlightedIndex(-1);
		}, 150);
	}, []);

	// Handle keyboard navigation
	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLInputElement>) => {
			if (!showDropdown) return;

			switch (e.key) {
				case "ArrowDown":
					e.preventDefault();
					setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
					break;

				case "ArrowUp":
					e.preventDefault();
					setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
					break;

				case "Enter":
					if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
						e.preventDefault();
						handleSuggestionSelect(suggestions[highlightedIndex]);
					}
					break;

				case "Escape":
					setIsDropdownVisible(false);
					setHighlightedIndex(-1);
					inputRef.current?.blur();
					break;
			}
		},
		[showDropdown, suggestions, highlightedIndex, handleSuggestionSelect],
	);

	// Handle clear button
	const handleClear = useCallback(() => {
		onChange("");
		setIsDropdownVisible(false);
		setHighlightedIndex(-1);
		clearSuggestions();

		if (onClear) {
			onClear();
		}

		// Refocus input after clear
		setTimeout(() => {
			inputRef.current?.focus();
		}, 0);
	}, [onChange, onClear, clearSuggestions]);

	// Handle close dropdown
	const handleCloseDropdown = useCallback(() => {
		setIsDropdownVisible(false);
		setHighlightedIndex(-1);
	}, []);

	return (
		<div className={cn("relative flex-1", className)}>
			<div className="relative">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />

				{/* biome-ignore lint/a11y/useSemanticElements: combobox role is correct for autocomplete */}
				<Input
					ref={inputRef}
					type="text"
					placeholder={placeholder}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onFocus={handleFocus}
					onBlur={handleBlur}
					onKeyDown={handleKeyDown}
					className="pl-10 pr-12 h-12 text-base"
					data-testid="search-input"
					disabled={disabled}
					autoComplete="off"
					role="combobox"
					aria-expanded={showDropdown}
					aria-haspopup="listbox"
					aria-owns="autocomplete-dropdown"
				/>

				{/* Clear button */}
				{value && (
					<button
						type="button"
						onClick={handleClear}
						className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors z-10"
						aria-label="検索をクリア"
						tabIndex={-1}
					>
						<X className="h-4 w-4 text-muted-foreground" />
					</button>
				)}

				{/* Auto search loading indicator */}
				{(isAutoSearching || (isAutocompleteLoading && value.length >= 2)) && (
					<div className="absolute right-10 top-1/2 transform -translate-y-1/2">
						<Loader2 className="h-4 w-4 animate-spin text-suzuka-500" />
					</div>
				)}
			</div>

			{/* Autocomplete dropdown */}
			<AutocompleteDropdown
				suggestions={suggestions}
				isLoading={isAutocompleteLoading}
				isVisible={showDropdown}
				onSelect={handleSuggestionSelect}
				onClose={handleCloseDropdown}
				highlightedIndex={highlightedIndex}
				onHighlightChange={setHighlightedIndex}
			/>
		</div>
	);
}
