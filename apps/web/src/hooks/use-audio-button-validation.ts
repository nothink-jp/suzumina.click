import { useMemo } from "react";

export interface AudioButtonValidationProps {
	title: string;
	startTime: number;
	endTime: number;
	tags?: string[];
	description?: string;
}

export interface AudioButtonValidationResult {
	isValid: boolean;
	duration: number;
	errors: {
		title: string | null;
		timeRange: string | null;
		duration: string | null;
		tags: string | null;
		description: string | null;
	};
}

/**
 * 音声ボタンのバリデーションロジックを共通化するフック
 */
export function useAudioButtonValidation({
	title,
	startTime,
	endTime,
	tags = [],
	description = "",
}: AudioButtonValidationProps): AudioButtonValidationResult {
	return useMemo(() => {
		const duration = Math.round((endTime - startTime) * 10) / 10;

		const errors = {
			title: validateTitle(title),
			timeRange: validateTimeRange(startTime, endTime),
			duration: validateDuration(duration),
			tags: validateTags(tags),
			description: validateDescription(description),
		};

		const isValid = Object.values(errors).every((error) => error === null);

		return {
			isValid,
			duration,
			errors,
		};
	}, [title, startTime, endTime, tags, description]);
}

function validateTitle(title: string): string | null {
	const trimmedTitle = title.trim();
	if (trimmedTitle.length === 0) {
		return "タイトルを入力してください";
	}
	if (trimmedTitle.length > 100) {
		return "タイトルは100文字以下で入力してください";
	}
	return null;
}

function validateTimeRange(startTime: number, endTime: number): string | null {
	if (startTime >= endTime) {
		return "終了時間は開始時間より後に設定してください";
	}
	return null;
}

function validateDuration(duration: number): string | null {
	if (duration < 1) {
		return "音声の長さは1秒以上にしてください";
	}
	if (duration > 60) {
		return "音声の長さは60秒以下にしてください";
	}
	return null;
}

function validateTags(tags: string[]): string | null {
	if (tags.length > 10) {
		return "タグは10個まで設定できます";
	}

	const invalidTag = tags.find((tag) => tag.trim().length === 0 || tag.length > 30);
	if (invalidTag !== undefined) {
		return "タグは1〜30文字で入力してください";
	}

	return null;
}

function validateDescription(description: string): string | null {
	if (description.length > 500) {
		return "説明は500文字以下で入力してください";
	}
	return null;
}
