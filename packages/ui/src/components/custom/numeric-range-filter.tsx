"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Separator } from "../ui/separator";

interface NumericRange {
	min?: number;
	max?: number;
}

interface NumericRangeFilterProps {
	label: string;
	value: NumericRange;
	onChange: (range: NumericRange) => void;
	presets?: Array<{
		label: string;
		min?: number;
		max?: number;
	}>;
	unit?: string;
	placeholder?: {
		min?: string;
		max?: string;
	};
}

export function NumericRangeFilter({
	label,
	value,
	onChange,
	presets = [],
	unit = "",
	placeholder = {},
}: NumericRangeFilterProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [tempRange, setTempRange] = useState<NumericRange>(value);

	const handleApply = () => {
		onChange(tempRange);
		setIsOpen(false);
	};

	const handleReset = () => {
		const resetRange = { min: undefined, max: undefined };
		setTempRange(resetRange);
		onChange(resetRange);
		setIsOpen(false);
	};

	const handlePresetClick = (preset: { min?: number; max?: number }) => {
		const newRange = { min: preset.min, max: preset.max };
		setTempRange(newRange);
		onChange(newRange);
		setIsOpen(false);
	};

	// 現在の値を表示用にフォーマット
	const formatValue = () => {
		if (value.min !== undefined && value.max !== undefined) {
			return `${value.min} - ${value.max}${unit}`;
		}
		if (value.min !== undefined) {
			return `${value.min}${unit}以上`;
		}
		if (value.max !== undefined) {
			return `${value.max}${unit}以下`;
		}
		return "すべて";
	};

	const hasValue = value.min !== undefined || value.max !== undefined;

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button variant={hasValue ? "secondary" : "outline"} className="h-9 text-sm justify-start">
					{label}: {formatValue()}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80" align="start">
				<div className="space-y-4">
					<div>
						<h4 className="font-medium text-sm mb-2">{label}の範囲を指定</h4>
					</div>

					{/* プリセット */}
					{presets.length > 0 && (
						<>
							<div className="space-y-2">
								<Label className="text-xs text-muted-foreground">クイック選択</Label>
								<div className="flex flex-wrap gap-2">
									{presets.map((preset, index) => (
										<Button
											key={index}
											variant="outline"
											size="sm"
											className="h-7 text-xs"
											onClick={() => handlePresetClick(preset)}
										>
											{preset.label}
										</Button>
									))}
								</div>
							</div>
							<Separator />
						</>
					)}

					{/* カスタム範囲入力 */}
					<div className="space-y-3">
						<Label className="text-xs text-muted-foreground">カスタム範囲</Label>
						<div className="grid grid-cols-2 gap-2">
							<div>
								<Label htmlFor="min" className="text-xs">
									最小値
								</Label>
								<Input
									id="min"
									type="number"
									min="0"
									placeholder={placeholder.min || "0"}
									value={tempRange.min ?? ""}
									onChange={(e) =>
										setTempRange((prev) => ({
											...prev,
											min: e.target.value ? Number(e.target.value) : undefined,
										}))
									}
									className="h-8"
								/>
							</div>
							<div>
								<Label htmlFor="max" className="text-xs">
									最大値
								</Label>
								<Input
									id="max"
									type="number"
									min="0"
									placeholder={placeholder.max || "上限なし"}
									value={tempRange.max ?? ""}
									onChange={(e) =>
										setTempRange((prev) => ({
											...prev,
											max: e.target.value ? Number(e.target.value) : undefined,
										}))
									}
									className="h-8"
								/>
							</div>
						</div>
					</div>

					{/* アクションボタン */}
					<div className="flex gap-2 pt-2">
						<Button size="sm" onClick={handleApply} className="flex-1">
							適用
						</Button>
						<Button size="sm" variant="outline" onClick={handleReset}>
							リセット
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
