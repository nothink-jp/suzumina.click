import { useCallback, useEffect, useState } from "react";
import type { AutocompleteSuggestion } from "@/app/api/autocomplete/route";
import { useDebounce } from "./useDebounce";

interface UseAutocompleteOptions {
	minLength?: number;
	debounceMs?: number;
	maxSuggestions?: number;
	enabled?: boolean;
}

interface UseAutocompleteResult {
	suggestions: AutocompleteSuggestion[];
	isLoading: boolean;
	error: string | null;
	clearSuggestions: () => void;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: AutocompleteSuggestion[]; timestamp: number }>();

export function useAutocomplete(
	query: string,
	options: UseAutocompleteOptions = {},
): UseAutocompleteResult {
	const { minLength = 2, debounceMs = 200, maxSuggestions = 8, enabled = true } = options;

	const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const debouncedQuery = useDebounce(query, debounceMs);

	const clearSuggestions = useCallback(() => {
		setSuggestions([]);
		setError(null);
	}, []);

	const getCachedSuggestions = useCallback(
		(searchQuery: string) => {
			const cacheKey = `${searchQuery}-${maxSuggestions}`;
			const cached = cache.get(cacheKey);
			const now = Date.now();

			if (cached && now - cached.timestamp < CACHE_TTL) {
				return cached.data;
			}
			return null;
		},
		[maxSuggestions],
	);

	const updateCache = useCallback(
		(searchQuery: string, suggestions: AutocompleteSuggestion[]) => {
			const cacheKey = `${searchQuery}-${maxSuggestions}`;
			const now = Date.now();

			cache.set(cacheKey, {
				data: suggestions,
				timestamp: now,
			});

			// Clean old cache entries
			if (cache.size > 50) {
				const oldEntries = Array.from(cache.entries()).filter(
					([, value]) => now - value.timestamp > CACHE_TTL,
				);
				oldEntries.forEach(([key]) => cache.delete(key));
			}
		},
		[maxSuggestions],
	);

	const fetchFromAPI = useCallback(
		async (searchQuery: string) => {
			const params = new URLSearchParams({
				q: searchQuery,
				limit: maxSuggestions.toString(),
			});

			const response = await fetch(`/api/autocomplete?${params}`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			if (data.error) {
				throw new Error(data.error);
			}

			return data.suggestions || [];
		},
		[maxSuggestions],
	);

	const fetchSuggestions = useCallback(
		async (searchQuery: string) => {
			if (!enabled || searchQuery.length < minLength) {
				setSuggestions([]);
				setIsLoading(false);
				return;
			}

			// Check cache first
			const cachedData = getCachedSuggestions(searchQuery);
			if (cachedData) {
				setSuggestions(cachedData);
				setIsLoading(false);
				return;
			}

			setIsLoading(true);
			setError(null);

			try {
				const newSuggestions = await fetchFromAPI(searchQuery);
				updateCache(searchQuery, newSuggestions);
				setSuggestions(newSuggestions);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to fetch suggestions");
				setSuggestions([]);
			} finally {
				setIsLoading(false);
			}
		},
		[enabled, minLength, getCachedSuggestions, updateCache, fetchFromAPI],
	);

	useEffect(() => {
		if (debouncedQuery !== query) {
			// Query is still changing, show loading state
			if (query.length >= minLength && enabled) {
				setIsLoading(true);
			}
			return;
		}

		// Query has stabilized, fetch suggestions
		fetchSuggestions(debouncedQuery);
	}, [debouncedQuery, query, fetchSuggestions, minLength, enabled]);

	// Clear suggestions when query becomes too short
	useEffect(() => {
		if (query.length < minLength) {
			clearSuggestions();
		}
	}, [query.length, minLength, clearSuggestions]);

	return {
		suggestions,
		isLoading,
		error,
		clearSuggestions,
	};
}
