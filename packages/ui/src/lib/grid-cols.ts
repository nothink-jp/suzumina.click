/**
 * Tailwind グリッド列クラスの静的マップ。
 *
 * Tailwind v4 はソース中の「完全なクラス文字列」しか検出しないため、
 * `grid-cols-${n}` のような動的生成はクラスの生成有無が他ファイル（依存パッケージ含む）に
 * 依存して非決定的になる（依存更新で列数が変わる不具合の原因）。
 * breakpoint × 列数(1–12) を完全クラス文字列で静的に列挙し、Tailwind に確実に生成させる。
 */

export const GRID_COLS: Record<number, string> = {
	1: "grid-cols-1",
	2: "grid-cols-2",
	3: "grid-cols-3",
	4: "grid-cols-4",
	5: "grid-cols-5",
	6: "grid-cols-6",
	7: "grid-cols-7",
	8: "grid-cols-8",
	9: "grid-cols-9",
	10: "grid-cols-10",
	11: "grid-cols-11",
	12: "grid-cols-12",
};
export const SM_GRID_COLS: Record<number, string> = {
	1: "sm:grid-cols-1",
	2: "sm:grid-cols-2",
	3: "sm:grid-cols-3",
	4: "sm:grid-cols-4",
	5: "sm:grid-cols-5",
	6: "sm:grid-cols-6",
	7: "sm:grid-cols-7",
	8: "sm:grid-cols-8",
	9: "sm:grid-cols-9",
	10: "sm:grid-cols-10",
	11: "sm:grid-cols-11",
	12: "sm:grid-cols-12",
};
export const MD_GRID_COLS: Record<number, string> = {
	1: "md:grid-cols-1",
	2: "md:grid-cols-2",
	3: "md:grid-cols-3",
	4: "md:grid-cols-4",
	5: "md:grid-cols-5",
	6: "md:grid-cols-6",
	7: "md:grid-cols-7",
	8: "md:grid-cols-8",
	9: "md:grid-cols-9",
	10: "md:grid-cols-10",
	11: "md:grid-cols-11",
	12: "md:grid-cols-12",
};
export const LG_GRID_COLS: Record<number, string> = {
	1: "lg:grid-cols-1",
	2: "lg:grid-cols-2",
	3: "lg:grid-cols-3",
	4: "lg:grid-cols-4",
	5: "lg:grid-cols-5",
	6: "lg:grid-cols-6",
	7: "lg:grid-cols-7",
	8: "lg:grid-cols-8",
	9: "lg:grid-cols-9",
	10: "lg:grid-cols-10",
	11: "lg:grid-cols-11",
	12: "lg:grid-cols-12",
};
export const XL_GRID_COLS: Record<number, string> = {
	1: "xl:grid-cols-1",
	2: "xl:grid-cols-2",
	3: "xl:grid-cols-3",
	4: "xl:grid-cols-4",
	5: "xl:grid-cols-5",
	6: "xl:grid-cols-6",
	7: "xl:grid-cols-7",
	8: "xl:grid-cols-8",
	9: "xl:grid-cols-9",
	10: "xl:grid-cols-10",
	11: "xl:grid-cols-11",
	12: "xl:grid-cols-12",
};

export type GridBreakpoint = "default" | "sm" | "md" | "lg" | "xl";

const MAPS: Record<GridBreakpoint, Record<number, string>> = {
	default: GRID_COLS,
	sm: SM_GRID_COLS,
	md: MD_GRID_COLS,
	lg: LG_GRID_COLS,
	xl: XL_GRID_COLS,
};

/**
 * breakpoint と列数(1–12) から完全な Tailwind クラスを返す。範囲外/未指定は undefined。
 */
export function gridColsClass(
	breakpoint: GridBreakpoint,
	cols: number | undefined,
): string | undefined {
	if (cols === undefined || cols < 1 || cols > 12) return undefined;
	return MAPS[breakpoint][cols];
}
