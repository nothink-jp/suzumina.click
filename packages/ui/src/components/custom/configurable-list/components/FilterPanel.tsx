/**
 * FilterPanel - フィルターパネルコンポーネント
 * 各種フィルターの表示と管理
 */

import type { FilterConfig } from "../types";

interface FilterPanelProps {
	filters: Record<string, FilterConfig>;
	values: Record<string, unknown>;
	onChange: (filters: Record<string, unknown>) => void;
}

export function FilterPanel({ filters, values, onChange }: FilterPanelProps) {
	// 簡易実装 - 実際の実装は既存のConfigurableListのフィルター部分を移植
	return (
		<div className="space-y-4">
			{Object.entries(filters).map(([key, config]) => (
				<div key={key}>
					<label className="text-sm font-medium">{config.label || key}</label>
					{/* フィルタータイプに応じたコンポーネントを表示 */}
					<div className="mt-1 text-muted-foreground text-xs">Filter type: {config.type}</div>
				</div>
			))}
		</div>
	);
}
