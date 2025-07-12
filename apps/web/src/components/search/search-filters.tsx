"use client";

import type { DateRangePreset, UnifiedSearchFilters } from "@suzumina.click/shared-types";
import { getActiveFilterDescriptions, hasActiveFilters } from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Calendar } from "@suzumina.click/ui/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { Input } from "@suzumina.click/ui/components/ui/input";
import { Label } from "@suzumina.click/ui/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@suzumina.click/ui/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@suzumina.click/ui/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@suzumina.click/ui/components/ui/select";
import { Separator } from "@suzumina.click/ui/components/ui/separator";
import { Switch } from "@suzumina.click/ui/components/ui/switch";
import { cn } from "@suzumina.click/ui/lib/utils";
import {
	Calendar as CalendarIcon,
	Filter,
	RotateCcw,
	Shield,
	SlidersHorizontal,
	X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useAgeVerification } from "@/contexts/AgeVerificationContext";

// Date range filter component
function DateRangeFilter({
	localFilters,
	onDateRangeChange,
	customDateFrom,
	customDateTo,
	setCustomDateFrom,
	setCustomDateTo,
}: {
	localFilters: UnifiedSearchFilters;
	onDateRangeChange: (preset: DateRangePreset) => void;
	customDateFrom: Date | undefined;
	customDateTo: Date | undefined;
	setCustomDateFrom: (date: Date | undefined) => void;
	setCustomDateTo: (date: Date | undefined) => void;
}) {
	return (
		<div className="space-y-3">
			<Label className="text-sm font-semibold">作成日</Label>
			<RadioGroup
				value={localFilters.dateRange || ""}
				onValueChange={(value) => onDateRangeChange(value as DateRangePreset)}
			>
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="today" id="today" />
					<Label htmlFor="today" className="font-normal cursor-pointer">
						今日
					</Label>
				</div>
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="this_week" id="this_week" />
					<Label htmlFor="this_week" className="font-normal cursor-pointer">
						今週
					</Label>
				</div>
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="this_month" id="this_month" />
					<Label htmlFor="this_month" className="font-normal cursor-pointer">
						今月
					</Label>
				</div>
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="last_30_days" id="last_30_days" />
					<Label htmlFor="last_30_days" className="font-normal cursor-pointer">
						過去30日
					</Label>
				</div>
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="custom" id="custom" />
					<Label htmlFor="custom" className="font-normal cursor-pointer">
						カスタム
					</Label>
				</div>
			</RadioGroup>

			{/* カスタム日付選択 */}
			{localFilters.dateRange === "custom" && (
				<div className="space-y-2 pt-2">
					<div className="flex gap-2">
						<Popover>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="w-full justify-start text-left font-normal"
								>
									<CalendarIcon className="mr-2 h-4 w-4" />
									{customDateFrom ? (
										customDateFrom.toLocaleDateString("ja-JP", {
											timeZone: "Asia/Tokyo",
										})
									) : (
										<span className="text-muted-foreground">開始日</span>
									)}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0">
								<Calendar
									mode="single"
									selected={customDateFrom}
									onSelect={setCustomDateFrom}
									initialFocus
								/>
							</PopoverContent>
						</Popover>
						<span className="flex items-center text-muted-foreground">〜</span>
						<Popover>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="w-full justify-start text-left font-normal"
								>
									<CalendarIcon className="mr-2 h-4 w-4" />
									{customDateTo ? (
										customDateTo.toLocaleDateString("ja-JP", {
											timeZone: "Asia/Tokyo",
										})
									) : (
										<span className="text-muted-foreground">終了日</span>
									)}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0">
								<Calendar
									mode="single"
									selected={customDateTo}
									onSelect={setCustomDateTo}
									initialFocus
								/>
							</PopoverContent>
						</Popover>
					</div>
				</div>
			)}
		</div>
	);
}

// Audio button specific filters component
function AudioButtonFilters({
	localFilters,
	setLocalFilters,
}: {
	localFilters: UnifiedSearchFilters;
	setLocalFilters: React.Dispatch<React.SetStateAction<UnifiedSearchFilters>>;
}) {
	return (
		<>
			{/* 再生数フィルター */}
			<div className="space-y-3">
				<Label className="text-sm font-semibold">再生数</Label>
				<div className="flex items-center gap-2">
					<Input
						type="number"
						placeholder="最小"
						min={0}
						value={localFilters.playCountMin || ""}
						onChange={(e) =>
							setLocalFilters((prev) => ({
								...prev,
								playCountMin: e.target.value ? Number(e.target.value) : undefined,
							}))
						}
						className="w-24"
					/>
					<span className="text-muted-foreground">〜</span>
					<Input
						type="number"
						placeholder="最大"
						min={0}
						value={localFilters.playCountMax || ""}
						onChange={(e) =>
							setLocalFilters((prev) => ({
								...prev,
								playCountMax: e.target.value ? Number(e.target.value) : undefined,
							}))
						}
						className="w-24"
					/>
					<span className="text-sm text-muted-foreground">回</span>
				</div>
			</div>

			{/* いいね数フィルター */}
			<div className="space-y-3">
				<Label className="text-sm font-semibold">いいね数</Label>
				<div className="flex items-center gap-2">
					<Input
						type="number"
						placeholder="最小"
						min={0}
						value={localFilters.likeCountMin || ""}
						onChange={(e) =>
							setLocalFilters((prev) => ({
								...prev,
								likeCountMin: e.target.value ? Number(e.target.value) : undefined,
							}))
						}
						className="w-24"
					/>
					<span className="text-muted-foreground">〜</span>
					<Input
						type="number"
						placeholder="最大"
						min={0}
						value={localFilters.likeCountMax || ""}
						onChange={(e) =>
							setLocalFilters((prev) => ({
								...prev,
								likeCountMax: e.target.value ? Number(e.target.value) : undefined,
							}))
						}
						className="w-24"
					/>
				</div>
			</div>

			{/* お気に入り数フィルター */}
			<div className="space-y-3">
				<Label className="text-sm font-semibold">お気に入り数</Label>
				<div className="flex items-center gap-2">
					<Input
						type="number"
						placeholder="最小"
						min={0}
						value={localFilters.favoriteCountMin || ""}
						onChange={(e) =>
							setLocalFilters((prev) => ({
								...prev,
								favoriteCountMin: e.target.value ? Number(e.target.value) : undefined,
							}))
						}
						className="w-24"
					/>
					<span className="text-muted-foreground">〜</span>
					<Input
						type="number"
						placeholder="最大"
						min={0}
						value={localFilters.favoriteCountMax || ""}
						onChange={(e) =>
							setLocalFilters((prev) => ({
								...prev,
								favoriteCountMax: e.target.value ? Number(e.target.value) : undefined,
							}))
						}
						className="w-24"
					/>
				</div>
			</div>

			{/* 音声長フィルター */}
			<div className="space-y-3">
				<Label className="text-sm font-semibold">音声の長さ</Label>
				<div className="flex items-center gap-2">
					<Input
						type="number"
						placeholder="最小"
						min={0}
						value={localFilters.durationMin || ""}
						onChange={(e) =>
							setLocalFilters((prev) => ({
								...prev,
								durationMin: e.target.value ? Number(e.target.value) : undefined,
							}))
						}
						className="w-24"
					/>
					<span className="text-muted-foreground">〜</span>
					<Input
						type="number"
						placeholder="最大"
						min={0}
						value={localFilters.durationMax || ""}
						onChange={(e) =>
							setLocalFilters((prev) => ({
								...prev,
								durationMax: e.target.value ? Number(e.target.value) : undefined,
							}))
						}
						className="w-24"
					/>
					<span className="text-sm text-muted-foreground">秒</span>
				</div>
			</div>
		</>
	);
}

interface SearchFiltersProps {
	filters: UnifiedSearchFilters;
	onFiltersChange: (filters: UnifiedSearchFilters) => void;
	onApply: () => void;
	contentType: "all" | "buttons" | "videos" | "works";
}

export function SearchFilters({
	filters,
	onFiltersChange,
	onApply,
	contentType,
}: SearchFiltersProps) {
	const { isAdult } = useAgeVerification();
	const [isOpen, setIsOpen] = useState(false);
	const [localFilters, setLocalFilters] = useState<UnifiedSearchFilters>(filters);
	const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
	const [customDateTo, setCustomDateTo] = useState<Date | undefined>();

	const hasFilters = hasActiveFilters(localFilters);
	const activeDescriptions = getActiveFilterDescriptions(localFilters);

	// フィルターをリセット
	const handleReset = useCallback(() => {
		const resetFilters: UnifiedSearchFilters = {
			query: localFilters.query,
			type: localFilters.type,
			limit: localFilters.limit,
			sortBy: "relevance",
			tagMode: "any",
			excludeR18: !isAdult, // 18歳未満は強制的にR18除外、18歳以上はデフォルトで除外
		};
		setLocalFilters(resetFilters);
		setCustomDateFrom(undefined);
		setCustomDateTo(undefined);
		onFiltersChange(resetFilters);
		onApply();
	}, [
		localFilters.query,
		localFilters.type,
		localFilters.limit,
		onFiltersChange,
		onApply,
		isAdult,
	]);

	// フィルターを適用
	const handleApply = useCallback(() => {
		// カスタム日付範囲の処理
		if (localFilters.dateRange === "custom" && (customDateFrom || customDateTo)) {
			const updatedFilters = {
				...localFilters,
				dateFrom: customDateFrom?.toISOString(),
				dateTo: customDateTo?.toISOString(),
			};
			onFiltersChange(updatedFilters);
		} else {
			onFiltersChange(localFilters);
		}
		onApply();
		setIsOpen(false);
	}, [localFilters, customDateFrom, customDateTo, onFiltersChange, onApply]);

	// 日付範囲プリセットの変更
	const handleDateRangeChange = useCallback((preset: DateRangePreset) => {
		setLocalFilters((prev) => ({ ...prev, dateRange: preset }));
		if (preset !== "custom") {
			setCustomDateFrom(undefined);
			setCustomDateTo(undefined);
		}
	}, []);

	// 音声ボタン専用フィルターの表示判定
	const showAudioButtonFilters = contentType === "all" || contentType === "buttons";

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Popover open={isOpen} onOpenChange={setIsOpen}>
						<PopoverTrigger asChild>
							<Button
								variant={hasFilters ? "default" : "outline"}
								size="sm"
								className={cn(
									"gap-2",
									hasFilters && "bg-suzuka-500 hover:bg-suzuka-600 text-white",
								)}
							>
								<SlidersHorizontal className="h-4 w-4" />
								フィルター
								{hasFilters && (
									<Badge variant="secondary" className="ml-1 bg-white/20 text-white">
										{activeDescriptions.length}
									</Badge>
								)}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-[400px] p-0" align="start">
							<Card className="border-0 shadow-none">
								<CardHeader className="pb-4">
									<div className="flex items-center justify-between">
										<CardTitle className="text-lg flex items-center gap-2">
											<Filter className="h-5 w-5" />
											詳細フィルター
										</CardTitle>
										{hasFilters && (
											<Button variant="ghost" size="sm" onClick={handleReset} className="gap-1">
												<RotateCcw className="h-3 w-3" />
												リセット
											</Button>
										)}
									</div>
								</CardHeader>
								<CardContent className="space-y-6">
									{/* 日付範囲フィルター */}
									<DateRangeFilter
										localFilters={localFilters}
										onDateRangeChange={handleDateRangeChange}
										customDateFrom={customDateFrom}
										customDateTo={customDateTo}
										setCustomDateFrom={setCustomDateFrom}
										setCustomDateTo={setCustomDateTo}
									/>

									<Separator />

									{/* 音声ボタン専用フィルター */}
									{showAudioButtonFilters && (
										<>
											<AudioButtonFilters
												localFilters={localFilters}
												setLocalFilters={setLocalFilters}
											/>
											<Separator />
										</>
									)}

									{/* R18フィルター（作品用・18歳以上のみ切り替え可能） */}
									{contentType === "works" && (
										<>
											<div className="space-y-3">
												<div className="flex items-center justify-between">
													<Label className="text-sm font-semibold flex items-center gap-2">
														<Shield className="h-4 w-4" />
														年齢制限フィルター
													</Label>
													{!isAdult && (
														<span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
															全年齢のみ
														</span>
													)}
												</div>

												{isAdult ? (
													<div className="flex items-center justify-between">
														<div className="space-y-1">
															<div className="text-sm">R18作品を表示</div>
															<div className="text-xs text-muted-foreground">
																18歳以上の内容を含む作品を表示します
															</div>
														</div>
														<Switch
															checked={!localFilters.excludeR18}
															onCheckedChange={(checked) =>
																setLocalFilters((prev) => ({
																	...prev,
																	excludeR18: !checked,
																}))
															}
														/>
													</div>
												) : (
													<div className="text-sm text-muted-foreground p-3 bg-blue-50 rounded-lg border border-blue-200">
														<div className="flex items-center gap-2 text-blue-700">
															<Shield className="h-4 w-4" />
															<span className="font-medium">全年齢対象作品のみ表示中</span>
														</div>
														<div className="mt-1 text-xs text-blue-600">
															年齢制限のない作品のみが表示されます
														</div>
													</div>
												)}
											</div>
											<Separator />
										</>
									)}

									{/* ソート順 */}
									<div className="space-y-3">
										<Label className="text-sm font-semibold">並び順</Label>
										<Select
											value={localFilters.sortBy}
											onValueChange={(value) =>
												setLocalFilters((prev) => ({
													...prev,
													sortBy: value as UnifiedSearchFilters["sortBy"],
												}))
											}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="relevance">関連度順</SelectItem>
												<SelectItem value="newest">新しい順</SelectItem>
												<SelectItem value="oldest">古い順</SelectItem>
												{showAudioButtonFilters && (
													<>
														<SelectItem value="popular">人気順（いいね数）</SelectItem>
														<SelectItem value="mostPlayed">再生数順</SelectItem>
													</>
												)}
											</SelectContent>
										</Select>
									</div>

									{/* 適用ボタン */}
									<div className="flex gap-2 pt-2">
										<Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
											キャンセル
										</Button>
										<Button className="flex-1" onClick={handleApply}>
											フィルターを適用
										</Button>
									</div>
								</CardContent>
							</Card>
						</PopoverContent>
					</Popover>

					{/* アクティブフィルターの表示 */}
					{hasFilters && activeDescriptions.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{activeDescriptions.map((desc) => (
								<Badge
									key={desc}
									variant="secondary"
									className="text-xs py-1 px-2 bg-suzuka-100 text-suzuka-700 border-suzuka-200"
								>
									{desc}
									<button
										type="button"
										onClick={handleReset}
										className="ml-1 hover:text-suzuka-900"
										aria-label="フィルターをクリア"
									>
										<X className="h-3 w-3" />
									</button>
								</Badge>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
