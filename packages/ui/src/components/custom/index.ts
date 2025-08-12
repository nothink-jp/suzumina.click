// Audio components
export { AudioButton } from "./audio-button";
export { AudioPlayer } from "./audio-player";

// Types
export type { AutocompleteSuggestionItem } from "./autocomplete-dropdown";
export { AutocompleteDropdown } from "./autocomplete-dropdown";
export { ConfigurableList } from "./configurable-list";
// List components
export type {
	ConfigurableListProps,
	DataAdapter,
	FilterConfig,
	ListController,
	ListDataSource,
	ListError,
	SortConfig,
	StandardListParams,
} from "./configurable-list/types";
// Hooks are not exported from index to avoid Server Component issues
// Import them directly from the component that uses them if needed
export {
	calculatePagination,
	createDataAdapter,
	wrapLegacyFetchData,
} from "./configurable-list/utils/dataAdapter";
export {
	generateOptions,
	generateYearOptions,
	getDefaultFilterValues,
	hasActiveFilters,
	isFilterEnabled,
	normalizeOptions,
	transformFilterValue,
	validateFilterValue,
} from "./configurable-list/utils/filterHelpers";

// Utility components
export { HighlightTags, HighlightText, MultiFieldHighlight } from "./highlight-text";

// Layout components
export { ListPageContent, ListPageHeader, ListPageLayout } from "./list-page-layout";
export { LoadingSkeleton } from "./loading-skeleton";
export { NotImplementedOverlay } from "./not-implemented-overlay";

// Tag components
export type { TagSuggestion } from "./tag-input";
export { TagInput } from "./tag-input";
export { TagList } from "./tag-list";
export { ThreeLayerTagDisplay } from "./three-layer-tag-display";

// Time and validation components
export type { TimeDisplayProps } from "./time-display";
export { TimeDisplay } from "./time-display";
export type { ValidationMessageProps } from "./validation-message";
export { ValidationMessage, ValidationMessages } from "./validation-message";

// YouTube components
export { YouTubeAPIManager } from "./youtube-api-manager";
export { YouTubePlayer } from "./youtube-player";
export type { YTPlayer, YTPlayerOptions, YTPlayerQuality, YTPlayerState } from "./youtube-types";
