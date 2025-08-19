/**
 * AudioButton Validation Functions
 *
 * Pure functions for validating audio button data.
 * Replaces AudioButton Entity validation with functional approach.
 */

import type { AudioButtonPlainObject } from "../plain-objects/audio-button-plain";

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
	viewCount: number,
	likeCount: number,
	dislikeCount: number,
): ValidationResult {
	const errors: string[] = [];

	if (viewCount < 0) {
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
 * Validates complete AudioButton data
 */
export function validateAudioButton(button: Partial<AudioButtonPlainObject>): ValidationResult {
	const errors: string[] = [];

	// Required fields check
	if (!button.id) {
		errors.push("IDは必須です");
	}

	if (!button.buttonText) {
		errors.push("ボタンテキストは必須です");
	} else if (button.buttonText) {
		const textValidation = validateButtonText(button.buttonText);
		errors.push(...textValidation.errors);
	}

	// Timestamps validation
	if (button.startTime === undefined || button.endTime === undefined) {
		errors.push("開始時間と終了時間は必須です");
	} else {
		const timestampValidation = validateTimestamps(button.startTime, button.endTime);
		errors.push(...timestampValidation.errors);
	}

	// Video reference validation
	if (!button.videoId || !button.videoTitle) {
		errors.push("動画情報は必須です");
	} else if (button.videoId && button.videoTitle) {
		const videoValidation = validateVideoReference(button.videoId, button.videoTitle);
		errors.push(...videoValidation.errors);
	}

	// Tags validation (optional)
	if (button.tags && button.tags.length > 0) {
		const tagsValidation = validateTags(button.tags);
		errors.push(...tagsValidation.errors);
	}

	// Creator info validation
	if (!button.createdBy) {
		errors.push("作成者情報は必須です");
	} else if (typeof button.createdBy === "object" && button.createdBy.id && button.createdBy.name) {
		const creatorValidation = validateCreatorInfo(button.createdBy.id, button.createdBy.name);
		errors.push(...creatorValidation.errors);
	}

	// Statistics validation (optional, with defaults)
	if (
		button.viewCount !== undefined ||
		button.likeCount !== undefined ||
		button.dislikeCount !== undefined
	) {
		const statsValidation = validateStatistics(
			button.viewCount ?? 0,
			button.likeCount ?? 0,
			button.dislikeCount ?? 0,
		);
		errors.push(...statsValidation.errors);
	}

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
export function validateForUpdate(button: Partial<AudioButtonPlainObject>): ValidationResult {
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
