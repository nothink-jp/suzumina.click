/**
 * ConfigurableListのアイテム表示部分
 */

import { generateGridClasses } from "./utils/classHelpers";

interface ConfigurableListItemsProps<T> {
	items: T[];
	renderItem: (item: T, index: number) => React.ReactNode;
	layout: "list" | "grid" | "flex";
	gridColumns?: {
		default?: number;
		sm?: number;
		md?: number;
		lg?: number;
		xl?: number;
	};
	startIndex: number;
}

export function ConfigurableListItems<T>({
	items,
	renderItem,
	layout,
	gridColumns = {
		default: 1,
		md: 2,
		lg: 3,
	},
	startIndex,
}: ConfigurableListItemsProps<T>) {
	const layoutClasses =
		layout === "grid"
			? generateGridClasses(gridColumns)
			: layout === "flex"
				? "flex flex-wrap gap-3 items-start"
				: "space-y-4";

	return (
		<div className={layoutClasses}>
			{items.map((item, index) => (
				<div key={startIndex + index}>{renderItem(item, startIndex + index)}</div>
			))}
		</div>
	);
}
