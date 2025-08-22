/**
 * 検索入力用のフック
 */

import { useCallback, useEffect, useState } from "react";

interface UseSearchInputOptions {
	initialValue: string;
	onSearch: (value: string) => void;
}

export function useSearchInput({ initialValue, onSearch }: UseSearchInputOptions) {
	// IME変換中かどうかを管理
	const [isComposing, setIsComposing] = useState(false);
	const [localSearchValue, setLocalSearchValue] = useState(initialValue);

	// 外部の値が変更されたときにローカル値を同期
	useEffect(() => {
		setLocalSearchValue(initialValue);
	}, [initialValue]);

	const handleSearchChange = useCallback((value: string) => {
		setLocalSearchValue(value);
		// Enterキー入力時のみ更新するため、ここでは更新しない
	}, []);

	const handleCompositionStart = useCallback(() => {
		setIsComposing(true);
	}, []);

	const handleCompositionEnd = useCallback(() => {
		setIsComposing(false);
		// Enterキー入力時のみ更新するため、ここでは更新しない
	}, []);

	const handleSearchKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter" && !isComposing) {
				onSearch(localSearchValue || "");
			}
		},
		[onSearch, localSearchValue, isComposing],
	);

	return {
		localSearchValue,
		handleSearchChange,
		handleSearchKeyDown,
		handleCompositionStart,
		handleCompositionEnd,
	};
}
