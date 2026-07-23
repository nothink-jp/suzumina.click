/**
 * 現在アクティブなフィルターを個別解除できるチップ表示。
 * 一括解除の「リセット」ボタン（configurable-list-controls）とは別に、
 * 1条件だけを外したいケースの affordance を提供する。
 */

import { X } from "lucide-react";
import { Badge } from "../../ui/badge";
import type { ActiveFilterChip } from "./utils/filter-helpers";

interface ConfigurableListActiveFilterChipsProps {
	chips: ActiveFilterChip[];
	onRemove: (key: string, nextValue: unknown) => void;
}

export function ConfigurableListActiveFilterChips({
	chips,
	onRemove,
}: ConfigurableListActiveFilterChipsProps) {
	if (chips.length === 0) return null;

	return (
		<div className="mt-2 flex flex-wrap items-center gap-1.5">
			{chips.map((chip) => (
				<Badge key={`${chip.key}:${String(chip.value)}`} variant="secondary" className="gap-1 pr-1">
					{chip.label}
					<button
						type="button"
						onClick={() => onRemove(chip.key, chip.nextValue)}
						aria-label={`${chip.label}を解除`}
						className="rounded-full p-0.5 hover:bg-muted-foreground/20"
					>
						<X className="h-3 w-3" />
					</button>
				</Badge>
			))}
		</div>
	);
}
