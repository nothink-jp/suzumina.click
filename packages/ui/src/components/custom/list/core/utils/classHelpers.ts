/**
 * CSS クラス生成ヘルパー
 */

import type { ConfigurableListProps } from "../types";

/**
 * グリッドカラムクラスを生成
 */
export function generateGridClasses<T>(gridColumns: ConfigurableListProps<T>["gridColumns"]) {
	const classes = ["grid", "gap-6"];

	if (!gridColumns) return classes.join(" ");

	// ブレークポイントとカラム数のマッピング
	const breakpoints = {
		default: "",
		sm: "sm:",
		md: "md:",
		lg: "lg:",
		xl: "xl:",
	} as const;

	// 各ブレークポイントのクラスを生成
	Object.entries(breakpoints).forEach(([breakpoint, prefix]) => {
		const cols = gridColumns[breakpoint as keyof typeof gridColumns];
		if (cols !== undefined && cols >= 1 && cols <= 12) {
			classes.push(`${prefix}grid-cols-${cols}`);
		}
	});

	return classes.join(" ");
}
