"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { Input } from "@suzumina.click/ui/components/ui/input";
import { MousePointer } from "lucide-react";
import { MicroAdjustmentButtons } from "./micro-adjustment-buttons";

interface TimeInputFieldProps {
	label: string;
	timeValue: number;
	timeInput: string;
	isEditing: boolean;
	isCreating: boolean;
	isAdjusting: boolean;
	onInputChange: (value: string) => void;
	onBlur: () => void;
	onKeyDown: (e: React.KeyboardEvent) => void;
	onSetTime: () => void;
	onAdjust: (delta: number) => void;
}

export function TimeInputField({
	label,
	timeValue,
	timeInput,
	isEditing,
	isCreating,
	isAdjusting,
	onInputChange,
	onBlur,
	onKeyDown,
	onSetTime,
	onAdjust,
}: TimeInputFieldProps) {
	const formatTime = (time: number) => {
		const minutes = Math.floor(time / 60);
		const seconds = Math.floor(time % 60);
		const decimal = Math.floor((time % 1) * 10);
		return `${minutes}:${String(seconds).padStart(2, "0")}.${decimal}`;
	};

	return (
		<div className="relative border rounded-lg overflow-hidden">
			{/* 上半分: クリックボタン */}
			<Button
				variant="ghost"
				onClick={onSetTime}
				disabled={isCreating}
				className="w-full h-8 sm:h-10 rounded-none border-b hover:bg-primary/10 hover:text-primary transition-colors"
			>
				<MousePointer className="h-3 w-3 mr-1" />
				<div className="font-medium text-sm sm:text-base">{label}</div>
			</Button>
			{/* 中央: テキスト入力 */}
			<div className="p-2 sm:p-3 bg-muted/20 border-b">
				<Input
					type="text"
					value={isEditing ? timeInput : formatTime(timeValue)}
					onChange={(e) => onInputChange(e.target.value)}
					onBlur={onBlur}
					onKeyDown={onKeyDown}
					disabled={isCreating}
					className="text-center text-base sm:text-lg font-mono font-semibold text-primary h-8 border-0 bg-transparent focus:bg-background"
					placeholder="0:00.0"
				/>
			</div>
			{/* 下半分: 微調整ボタン */}
			<MicroAdjustmentButtons onAdjust={onAdjust} isDisabled={isCreating || isAdjusting} />
		</div>
	);
}
