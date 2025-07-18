"use client";

import { formatTimestamp } from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Clock, Play } from "lucide-react";
import { TimeInputField } from "./time-input-field";

interface TimeControlPanelProps {
	// 時間状態
	startTime: number;
	endTime: number;
	currentTime: number;
	startTimeInput: string;
	endTimeInput: string;
	isEditingStartTime: boolean;
	isEditingEndTime: boolean;
	isAdjusting: boolean;

	// コールバック
	onStartTimeInputChange: (value: string) => void;
	onEndTimeInputChange: (value: string) => void;
	onStartTimeBlur: () => void;
	onEndTimeBlur: () => void;
	onStartTimeKeyDown: (e: React.KeyboardEvent) => void;
	onEndTimeKeyDown: (e: React.KeyboardEvent) => void;
	onSetCurrentAsStart: () => void;
	onSetCurrentAsEnd: () => void;
	onAdjustStartTime: (delta: number) => void;
	onAdjustEndTime: (delta: number) => void;
	onPreviewRange: () => void;

	// UI状態
	isCreating: boolean;
}

export function TimeControlPanel({
	startTime,
	endTime,
	currentTime,
	startTimeInput,
	endTimeInput,
	isEditingStartTime,
	isEditingEndTime,
	isAdjusting,
	onStartTimeInputChange,
	onEndTimeInputChange,
	onStartTimeBlur,
	onEndTimeBlur,
	onStartTimeKeyDown,
	onEndTimeKeyDown,
	onSetCurrentAsStart,
	onSetCurrentAsEnd,
	onAdjustStartTime,
	onAdjustEndTime,
	onPreviewRange,
	isCreating,
}: TimeControlPanelProps) {
	const duration = Math.round((endTime - startTime) * 10) / 10;
	return (
		<div className="space-y-4 lg:space-y-6">
			{/* 現在時間表示 */}
			<div className="p-3 lg:p-4 bg-primary/10 border border-primary/20 rounded-lg">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
						<Clock className="h-4 w-4" />
						<span className="hidden sm:inline">動画再生時間</span>
						<span className="sm:hidden">再生時間</span>
					</div>
					<div className="text-base sm:text-lg font-mono font-semibold text-primary">
						{formatTimestamp(currentTime)}
					</div>
				</div>
			</div>

			{/* 範囲選択 */}
			<div className="space-y-4">
				<div className="text-sm sm:text-base font-medium">
					<span>切り抜き範囲</span>
				</div>

				{/* 時間設定ボタン: モバイル対応 */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<TimeInputField
						label="開始時間に設定"
						timeValue={startTime}
						timeInput={startTimeInput}
						isEditing={isEditingStartTime}
						isCreating={isCreating}
						isAdjusting={isAdjusting}
						onInputChange={onStartTimeInputChange}
						onBlur={onStartTimeBlur}
						onKeyDown={onStartTimeKeyDown}
						onSetTime={onSetCurrentAsStart}
						onAdjust={onAdjustStartTime}
					/>

					<TimeInputField
						label="終了時間に設定"
						timeValue={endTime}
						timeInput={endTimeInput}
						isEditing={isEditingEndTime}
						isCreating={isCreating}
						isAdjusting={isAdjusting}
						onInputChange={onEndTimeInputChange}
						onBlur={onEndTimeBlur}
						onKeyDown={onEndTimeKeyDown}
						onSetTime={onSetCurrentAsEnd}
						onAdjust={onAdjustEndTime}
					/>
				</div>

				{/* 長さ表示: モバイル対応 */}
				<div
					className={`p-3 sm:p-4 rounded-lg text-center ${
						startTime >= endTime
							? "bg-destructive/10 border border-destructive/20"
							: duration > 60
								? "bg-destructive/10 border border-destructive/20"
								: "bg-primary/10 border border-primary/20"
					}`}
				>
					<p className="text-sm sm:text-base">
						<span className="text-muted-foreground">切り抜き時間: </span>
						<strong
							className={
								startTime >= endTime
									? "text-destructive"
									: duration > 60
										? "text-destructive"
										: "text-primary"
							}
						>
							{startTime >= endTime ? "無効" : `${duration.toFixed(1)}秒`}
						</strong>
					</p>
					{startTime >= endTime && (
						<p className="text-xs sm:text-sm text-destructive mt-1">
							開始時間は終了時間より前にしてください
						</p>
					)}
					{startTime < endTime && duration > 60 && (
						<p className="text-xs sm:text-sm text-destructive mt-1">60秒以下にしてください</p>
					)}
					{startTime < endTime && duration < 1 && (
						<p className="text-xs sm:text-sm text-destructive mt-1">1秒以上にしてください</p>
					)}
				</div>

				{/* プレビューボタン: モバイル対応 */}
				<Button
					variant="secondary"
					onClick={onPreviewRange}
					disabled={isCreating || startTime >= endTime}
					className="w-full min-h-[44px] h-11 sm:h-12 font-medium text-sm sm:text-base"
					size="lg"
				>
					<Play className="h-4 w-4 mr-2" />
					選択範囲をプレビュー
				</Button>
			</div>
		</div>
	);
}
