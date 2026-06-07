/**
 * CSS クラス生成ヘルパー
 */

import { type GridBreakpoint, gridColsClass } from "../../../../lib/grid-cols";
import type { ConfigurableListProps } from "../types";

const GRID_BREAKPOINTS: readonly GridBreakpoint[] = ["default", "sm", "md", "lg", "xl"];

/**
 * グリッドカラムクラスを生成。
 *
 * Tailwind は完全なクラス文字列しか検出しないため、`grid-cols-${n}` の動的補間は使わず
 * 静的マップ（lib/grid-cols）から取得する（依存更新で列数が変わる不具合の防止）。
 */
export function generateGridClasses<T>(gridColumns: ConfigurableListProps<T>["gridColumns"]) {
	const classes = ["grid", "gap-6"];

	if (!gridColumns) return classes.join(" ");

	for (const breakpoint of GRID_BREAKPOINTS) {
		const cls = gridColsClass(breakpoint, gridColumns[breakpoint]);
		if (cls) classes.push(cls);
	}

	return classes.join(" ");
}
