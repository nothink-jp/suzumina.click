"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Separator } from "../ui/separator";

interface DateRange {
	from?: Date;
	to?: Date;
}

interface DateRangeFilterProps {
	label: string;
	value: DateRange;
	onChange: (range: DateRange) => void;
	presets?: Array<{
		label: string;
		from?: Date;
		to?: Date;
	}>;
}

export function DateRangeFilter({ label, value, onChange, presets = [] }: DateRangeFilterProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [tempRange, setTempRange] = useState<DateRange>(value);

	const handleApply = () => {
		onChange(tempRange);
		setIsOpen(false);
	};

	const handleReset = () => {
		const resetRange = { from: undefined, to: undefined };
		setTempRange(resetRange);
		onChange(resetRange);
		setIsOpen(false);
	};

	const handlePresetClick = (preset: { from?: Date; to?: Date }) => {
		const newRange = { from: preset.from, to: preset.to };
		setTempRange(newRange);
		onChange(newRange);
		setIsOpen(false);
	};

	// デフォルトプリセット
	const defaultPresets = [
		{
			label: "今日",
			from: new Date(),
			to: new Date(),
		},
		{
			label: "今週",
			from: (() => {
				const now = new Date();
				const dayOfWeek = now.getDay();
				const diff = now.getDate() - dayOfWeek;
				return new Date(now.setDate(diff));
			})(),
			to: new Date(),
		},
		{
			label: "今月",
			from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
			to: new Date(),
		},
		{
			label: "過去3ヶ月",
			from: new Date(new Date().setMonth(new Date().getMonth() - 3)),
			to: new Date(),
		},
		...presets,
	];

	// 現在の値を表示用にフォーマット
	const formatValue = () => {
		if (value.from && value.to) {
			if (value.from.getTime() === value.to.getTime()) {
				return format(value.from, "yyyy/MM/dd", { locale: ja });
			}
			return `${format(value.from, "yyyy/MM/dd", { locale: ja })} - ${format(value.to, "yyyy/MM/dd", { locale: ja })}`;
		}
		if (value.from) {
			return `${format(value.from, "yyyy/MM/dd", { locale: ja })}以降`;
		}
		if (value.to) {
			return `${format(value.to, "yyyy/MM/dd", { locale: ja })}以前`;
		}
		return "すべて";
	};

	const hasValue = value.from !== undefined || value.to !== undefined;

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button variant={hasValue ? "secondary" : "outline"} className="h-9 text-sm justify-start">
					<CalendarIcon className="mr-2 h-4 w-4" />
					{label}: {formatValue()}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<div className="p-4 space-y-4">
					<div>
						<h4 className="font-medium text-sm mb-2">{label}の範囲を指定</h4>
					</div>

					{/* プリセット */}
					<div className="space-y-2">
						<Label className="text-xs text-muted-foreground">クイック選択</Label>
						<div className="grid grid-cols-2 gap-2">
							{defaultPresets.map((preset, index) => (
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

					{/* カレンダー */}
					<div className="space-y-3">
						<Label className="text-xs text-muted-foreground">カスタム範囲</Label>
						<Calendar
							mode="range"
							defaultMonth={tempRange.from}
							selected={{
								from: tempRange.from,
								to: tempRange.to,
							}}
							onSelect={(range) => {
								setTempRange({
									from: range?.from,
									to: range?.to,
								});
							}}
							numberOfMonths={2}
							className="rounded-md border"
							locale={ja}
						/>
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
