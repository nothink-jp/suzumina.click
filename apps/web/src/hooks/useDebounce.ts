import { useEffect, useState } from "react";

/**
 * カスタムデバウンスフック
 * 入力値の変更を指定した遅延後に反映させることで、
 * 過度なAPI呼び出しを防ぎパフォーマンスを向上させる
 */
export function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		// クリーンアップ: 新しい値が来た場合は前のタイマーをキャンセル
		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
}
