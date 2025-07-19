"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";

interface MicroAdjustmentButtonsProps {
	onAdjust: (delta: number) => void;
	isDisabled: boolean;
}

const ADJUSTMENT_VALUES = [-10, -1, -0.1, 0.1, 1, 10];

export function MicroAdjustmentButtons({ onAdjust, isDisabled }: MicroAdjustmentButtonsProps) {
	return (
		<div className="p-1 bg-muted/10">
			<div className="flex">
				{ADJUSTMENT_VALUES.map((value, index) => (
					<Button
						key={value}
						variant="ghost"
						size="sm"
						onClick={() => onAdjust(value)}
						disabled={isDisabled}
						className={`flex-1 h-6 px-0.5 text-xs hover:bg-primary/10 hover:text-primary rounded-none ${
							index < ADJUSTMENT_VALUES.length - 1 ? "border-r border-border" : ""
						} transition-colors`}
					>
						{value > 0 ? `+${value}` : value}
					</Button>
				))}
			</div>
		</div>
	);
}
