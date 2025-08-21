/**
 * AudioButton Validation Functions
 *
 * Pure functions for validating audio button data.
 * Replaces AudioButton Entity validation with functional approach.
 */

import type { AudioButton } from "../types/audio-button";

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

/**
 * Validates button text
 */
export function validateButtonText(text: string): ValidationResult {
	const errors: string[] = [];

	if (!text || text.trim().length === 0) {
		errors.push("ボタンテキストは必須です");
	} else if (text.length > 50) {
		errors.push("ボタンテキストは50文字以内で入力してください");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Validates timestamps
 */
export function validateTimestamps(startTime: number, endTime: number): ValidationResult {
	const errors: string[] = [];

	if (startTime < 0) {
		errors.push("開始時間は0以上である必要があります");
	}

	if (endTime < 0) {
		errors.push("終了時間は0以上である必要があります");
	}

	if (startTime >= endTime) {
		errors.push("終了時間は開始時間より後である必要があります");
	}

	const duration = endTime - startTime;
	if (duration > 60) {
		errors.push("ボタンの長さは60秒以内にしてください");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Validates video reference
 */
export function validateVideoReference(videoId: string, videoTitle: string): ValidationResult {
	const errors: string[] = [];

	if (!videoId || videoId.trim().length === 0) {
		errors.push("動画IDは必須です");
	} else if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
		errors.push("無効な動画ID形式です");
	}

	if (!videoTitle || videoTitle.trim().length === 0) {
		errors.push("動画タイトルは必須です");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Validates tags
 */
export function validateTags(tags: string[]): ValidationResult {
	const errors: string[] = [];

	if (tags.length > 10) {
		errors.push("タグは10個以内にしてください");
	}

	for (const tag of tags) {
		if (tag.length > 20) {
			errors.push(`タグ「${tag}」は20文字以内にしてください`);
		}
		if (!/^[a-zA-Z0-9ぁ-んァ-ヶー一-龯々〆〤]+$/.test(tag)) {
			errors.push(`タグ「${tag}」に使用できない文字が含まれています`);
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Validates creator info
 */
export function validateCreatorInfo(creatorId: string, creatorName: string): ValidationResult {
	const errors: string[] = [];

	if (!creatorId || creatorId.trim().length === 0) {
		errors.push("作成者IDは必須です");
	}

	if (!creatorName || creatorName.trim().length === 0) {
		errors.push("作成者名は必須です");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Validates statistics
 */
export function validateStatistics(
	playCount: number,
	likeCount: number,
	dislikeCount: number,
): ValidationResult {
	const errors: string[] = [];

	if (playCount < 0) {
		errors.push("再生回数は0以上である必要があります");
	}

	if (likeCount < 0) {
		errors.push("いいね数は0以上である必要があります");
	}

	if (dislikeCount < 0) {
		errors.push("よくないね数は0以上である必要があります");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Validate required field
 */
function validateRequiredField(value: unknown, errorMessage: string, errors: string[]): boolean {
	if (!value) {
		errors.push(errorMessage);
		return false;
	}
	return true;
}

/**
 * Validate required fields and collect errors
 */
function validateRequiredFields(button: Partial<AudioButton>, errors: string[]): void {
	// Basic required fields
	validateRequiredField(button.id, "IDは必須です", errors);

	// Button text
	if (validateRequiredField(button.buttonText, "ボタンテキストは必須です", errors)) {
		errors.push(...validateButtonText(button.buttonText).errors);
	}

	// Timestamps
	if (button.startTime === undefined || button.endTime === undefined) {
		errors.push("開始時間と終了時間は必須です");
	} else {
		errors.push(...validateTimestamps(button.startTime, button.endTime).errors);
	}

	// Video info
	if (!button.videoId || !button.videoTitle) {
		errors.push("動画情報は必須です");
	} else {
		errors.push(...validateVideoReference(button.videoId, button.videoTitle).errors);
	}

	// Creator info
	if (!button.creatorId || !button.creatorName) {
		errors.push("作成者情報は必須です");
	} else {
		errors.push(...validateCreatorInfo(button.creatorId, button.creatorName).errors);
	}
}

/**
 * Validate optional fields and collect errors
 */
function validateOptionalFields(button: Partial<AudioButton>, errors: string[]): void {
	// Tags
	if (button.tags && button.tags.length > 0) {
		errors.push(...validateTags(button.tags).errors);
	}

	// Statistics
	if (button.stats) {
		const stats = button.stats;
		errors.push(
			...validateStatistics(stats.playCount ?? 0, stats.likeCount ?? 0, stats.dislikeCount ?? 0)
				.errors,
		);
	}
}

/**
 * Validates complete AudioButton data
 */
export function validateAudioButton(button: Partial<AudioButton>): ValidationResult {
	const errors: string[] = [];

	validateRequiredFields(button, errors);
	validateOptionalFields(button, errors);

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Validates audio button for creation
 */
export function validateForCreation(
	buttonText: string,
	startTime: number,
	endTime: number,
	videoId: string,
	videoTitle: string,
	tags: string[],
): ValidationResult {
	const errors: string[] = [];

	// Validate all required fields for creation
	const textValidation = validateButtonText(buttonText);
	errors.push(...textValidation.errors);

	const timestampValidation = validateTimestamps(startTime, endTime);
	errors.push(...timestampValidation.errors);

	const videoValidation = validateVideoReference(videoId, videoTitle);
	errors.push(...videoValidation.errors);

	if (tags && tags.length > 0) {
		const tagsValidation = validateTags(tags);
		errors.push(...tagsValidation.errors);
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Validates audio button for update
 */
export function validateForUpdate(button: Partial<AudioButton>): ValidationResult {
	const errors: string[] = [];

	// Only validate provided fields
	if (button.buttonText !== undefined && button.buttonText !== null) {
		const textValidation = validateButtonText(button.buttonText);
		errors.push(...textValidation.errors);
	}

	if (button.startTime !== undefined && button.endTime !== undefined) {
		const timestampValidation = validateTimestamps(button.startTime, button.endTime);
		errors.push(...timestampValidation.errors);
	}

	if (button.tags !== undefined) {
		const tagsValidation = validateTags(button.tags);
		errors.push(...tagsValidation.errors);
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * AudioButton validators namespace for backward compatibility
 */
export const audioButtonValidators = {
	validateButtonText,
	validateTimestamps,
	validateVideoReference,
	validateTags,
	validateCreatorInfo,
	validateStatistics,
	validateAudioButton,
	validateForCreation,
	validateForUpdate,
};
