/**
 * ConfigurableList のフィルター UI ウィジェット群と、type による振り分け。
 *
 * ここは「用途特化（クエリの絞り込み UI）」の責務。リスト本体のオーケストレーション
 * （ConfigurableList）からは分離し、FilterControl 経由でのみ依存させる。
 */

"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Checkbox } from "../../ui/checkbox";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Slider } from "../../ui/slider";
import type { FilterConfig } from "./types";
import { generateOptions } from "./utils/filter-helpers";

function SelectFilter({
	value,
	config,
	onChange,
}: {
	value: unknown;
	config: FilterConfig;
	onChange: (value: unknown) => void;
}) {
	const options = generateOptions(config);
	return (
		<Select items={options} value={value?.toString() || ""} onValueChange={onChange}>
			<SelectTrigger className="w-[180px]" aria-label={config.label || "絞り込み"}>
				<SelectValue placeholder={config.placeholder || `${config.label}を選択`} />
			</SelectTrigger>
			<SelectContent>
				{options.map((opt) => (
					<SelectItem key={opt.value} value={opt.value}>
						{opt.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function BooleanFilter({
	keyName,
	value,
	config,
	onChange,
}: {
	keyName: string;
	value: unknown;
	config: FilterConfig;
	onChange: (value: unknown) => void;
}) {
	return (
		<Button variant={value ? "default" : "outline"} size="sm" onClick={() => onChange(!value)}>
			{config.label || keyName}
		</Button>
	);
}

function MultiselectFilter({
	keyName,
	value,
	config,
	onChange,
}: {
	keyName: string;
	value: unknown;
	config: FilterConfig;
	onChange: (value: unknown) => void;
}) {
	const options = generateOptions(config);
	const selectedValues = Array.isArray(value) ? value : [];

	return (
		<div className="space-y-2">
			<Label>{config.label}</Label>
			<div className="space-y-1 max-h-48 overflow-y-auto border rounded-md p-2">
				{options.map((opt) => (
					<div key={opt.value} className="flex items-center space-x-2">
						<Checkbox
							id={`${keyName}-${opt.value}`}
							checked={selectedValues.includes(opt.value)}
							onCheckedChange={(checked) => {
								const newValues = checked
									? [...selectedValues, opt.value]
									: selectedValues.filter((v) => v !== opt.value);
								onChange(newValues.length > 0 ? newValues : undefined);
							}}
						/>
						<Label
							htmlFor={`${keyName}-${opt.value}`}
							className="text-sm font-normal cursor-pointer"
						>
							{opt.label}
						</Label>
					</div>
				))}
			</div>
		</div>
	);
}

function RangeFilter({
	value,
	config,
	onChange,
}: {
	value: unknown;
	config: FilterConfig;
	onChange: (value: unknown) => void;
}) {
	const min = config.min ?? 0;
	const max = config.max ?? 100;
	const step = config.step ?? 1;
	const rangeValue = value as { min?: number; max?: number } | undefined;
	const currentMin = rangeValue?.min ?? min;
	const currentMax = rangeValue?.max ?? max;

	return (
		<div className="space-y-2">
			<Label>{config.label}</Label>
			<div className="flex items-center space-x-2">
				<Input
					type="number"
					value={currentMin}
					min={min}
					max={max}
					step={step}
					className="w-20"
					onChange={(e) => {
						const newMin = Number(e.target.value);
						onChange({ min: newMin, max: currentMax });
					}}
				/>
				<span className="text-sm text-muted-foreground">〜</span>
				<Input
					type="number"
					value={currentMax}
					min={min}
					max={max}
					step={step}
					className="w-20"
					onChange={(e) => {
						const newMax = Number(e.target.value);
						onChange({ min: currentMin, max: newMax });
					}}
				/>
			</div>
			<Slider
				value={[currentMin, currentMax]}
				min={min}
				max={max}
				step={step}
				onValueChange={([newMin, newMax]) => {
					onChange({ min: newMin, max: newMax });
				}}
				className="mt-2"
			/>
		</div>
	);
}

function DateFilter({
	keyName,
	value,
	config,
	onChange,
}: {
	keyName: string;
	value: unknown;
	config: FilterConfig;
	onChange: (value: unknown) => void;
}) {
	return (
		<div className="space-y-2">
			<Label>{config.label || keyName}</Label>
			<Input
				type="date"
				value={value?.toString() || ""}
				onChange={(e) => onChange(e.target.value || undefined)}
				className="w-[180px]"
			/>
		</div>
	);
}

function DateRangeFilter({
	keyName,
	value,
	config,
	onChange,
}: {
	keyName: string;
	value: unknown;
	config: FilterConfig;
	onChange: (value: unknown) => void;
}) {
	const dateValue = value as { start?: string; end?: string } | undefined;
	return (
		<div className="space-y-2">
			<Label>{config.label || keyName}</Label>
			<div className="flex items-center space-x-2">
				<Input
					type="date"
					value={dateValue?.start || ""}
					min={config.minDate}
					max={config.maxDate}
					onChange={(e) => {
						onChange({
							start: e.target.value || undefined,
							end: dateValue?.end,
						});
					}}
					className="w-[140px]"
				/>
				<span className="text-sm text-muted-foreground">〜</span>
				<Input
					type="date"
					value={dateValue?.end || ""}
					min={config.minDate}
					max={config.maxDate}
					onChange={(e) => {
						onChange({
							start: dateValue?.start,
							end: e.target.value || undefined,
						});
					}}
					className="w-[140px]"
				/>
			</div>
		</div>
	);
}

function TagsFilterTriggerLabel({
	config,
	keyName,
	options,
	selectedValues,
}: {
	config: FilterConfig;
	keyName: string;
	options: Array<{ value: string; label: string }>;
	selectedValues: string[];
}) {
	if (selectedValues.length === 0) return <>{config.label || keyName}</>;
	return (
		<>
			{config.label || keyName}
			<div className="mx-1 h-4 w-[1px] bg-border" />
			<Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
				{selectedValues.length}
			</Badge>
			<div className="hidden space-x-1 lg:flex">
				{selectedValues.length > 2 ? (
					<Badge variant="secondary" className="rounded-sm px-1 font-normal">
						{selectedValues.length}件選択中
					</Badge>
				) : (
					options
						.filter((option) => selectedValues.includes(option.value))
						.map((option) => (
							<Badge key={option.value} variant="secondary" className="rounded-sm px-1 font-normal">
								{option.label}
							</Badge>
						))
				)}
			</div>
		</>
	);
}

function TagsFilterOptionRow({
	option,
	checked,
	onCheckedChange,
}: {
	option: { value: string; label: string };
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}) {
	return (
		<div className="flex items-center space-x-2">
			<Checkbox id={`tag-${option.value}`} checked={checked} onCheckedChange={onCheckedChange} />
			<Label htmlFor={`tag-${option.value}`} className="text-sm font-normal cursor-pointer flex-1">
				{option.label}
			</Label>
		</div>
	);
}

/**
 * 選択中の option を常に先頭へピン留めしつつ、検索語で絞り込んだ未選択 option を続けて並べる。
 * 選択中の項目は検索語に一致しなくても表示し続ける（検索中でも解除できるようにするため）。
 * React hook は呼ばない純粋関数（"use" プレフィックスは付けない）。
 */
function getTagsFilterDisplayOptions(
	options: Array<{ value: string; label: string }>,
	selectedValues: string[],
	search: string,
) {
	const query = search.trim().toLowerCase();
	const selectedOptions = options.filter((opt) => selectedValues.includes(opt.value));
	const unselectedOptions = options.filter((opt) => !selectedValues.includes(opt.value));
	const filteredUnselected = query
		? unselectedOptions.filter((opt) => opt.label.toLowerCase().includes(query))
		: unselectedOptions;
	return [...selectedOptions, ...filteredUnselected];
}

function TagsFilter({
	keyName,
	value,
	config,
	onChange,
}: {
	keyName: string;
	value: unknown;
	config: FilterConfig;
	onChange: (value: unknown) => void;
}) {
	// generateOptions は常に配列を返す（nullish にならない）ため、判定は「空かどうか」だけで足りる
	const options = generateOptions(config);
	const selectedValues = Array.isArray(value) ? value : [];
	const hasOptions = options.length > 0;
	const [search, setSearch] = useState("");
	const displayOptions = getTagsFilterDisplayOptions(options, selectedValues, search);

	const toggleValue = (optionValue: string, checked: boolean) => {
		const newValues = checked
			? [...selectedValues, optionValue]
			: selectedValues.filter((v) => v !== optionValue);
		onChange(newValues.length > 0 ? newValues : undefined);
	};

	return (
		<Popover
			onOpenChange={(open) => {
				// 閉じたら検索語をリセットする（次回開いたときに前回の検索結果が残って見えるのを防ぐ）
				if (!open) setSearch("");
			}}
		>
			<PopoverTrigger
				render={
					<Button variant="outline" size="sm" className="h-9 border-dashed" disabled={!hasOptions}>
						<TagsFilterTriggerLabel
							config={config}
							keyName={keyName}
							options={options}
							selectedValues={selectedValues}
						/>
						<ChevronDown className="ml-2 h-4 w-4" />
					</Button>
				}
			/>
			<PopoverContent className="w-[300px] p-0" align="start">
				<div className="p-4">
					<div className="mb-2 text-sm font-medium">{config.label || keyName}</div>
					{hasOptions ? (
						<>
							{/* 検索はクライアント側の部分一致絞り込みのみ（Enter確定不要）で、
							    fetchFn への再フェッチは発生しない。IME変換中でも安全 */}
							<Input
								type="text"
								placeholder="検索..."
								aria-label={`${config.label || keyName}を検索`}
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="mb-2 h-8"
							/>
							{displayOptions.length > 0 ? (
								<div className="grid gap-2 max-h-[300px] overflow-y-auto">
									{displayOptions.map((option) => (
										<TagsFilterOptionRow
											key={option.value}
											option={option}
											checked={selectedValues.includes(option.value)}
											onCheckedChange={(checked) => toggleValue(option.value, checked)}
										/>
									))}
								</div>
							) : (
								<div className="text-center py-4 text-sm text-muted-foreground">
									該当するタグがありません
								</div>
							)}
							{selectedValues.length > 0 && (
								<Button
									variant="ghost"
									size="sm"
									className="mt-2 w-full"
									onClick={() => onChange(undefined)}
								>
									クリア
								</Button>
							)}
						</>
					) : (
						<div className="text-center py-4 text-sm text-muted-foreground">データがありません</div>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}

/**
 * FilterConfig.type に応じて対応するフィルター UI を描画する振り分け。
 * value / onChange はオーケストレータ側のクエリ状態から束縛して渡す。
 */
export function FilterControl({
	keyName,
	value,
	config,
	onChange,
}: {
	keyName: string;
	value: unknown;
	config: FilterConfig;
	onChange: (value: unknown) => void;
}) {
	switch (config.type) {
		case "select":
			return <SelectFilter value={value} config={config} onChange={onChange} />;
		case "boolean":
			return <BooleanFilter keyName={keyName} value={value} config={config} onChange={onChange} />;
		case "multiselect":
			return (
				<MultiselectFilter keyName={keyName} value={value} config={config} onChange={onChange} />
			);
		case "range":
			return <RangeFilter value={value} config={config} onChange={onChange} />;
		case "date":
			return <DateFilter keyName={keyName} value={value} config={config} onChange={onChange} />;
		case "dateRange":
			return (
				<DateRangeFilter keyName={keyName} value={value} config={config} onChange={onChange} />
			);
		case "tags":
			return <TagsFilter keyName={keyName} value={value} config={config} onChange={onChange} />;
		default:
			return null;
	}
}
