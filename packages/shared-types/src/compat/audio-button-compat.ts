/**
 * AudioButton Entity Compatibility Layer
 *
 * Provides backward compatibility for code using AudioButton Entity.
 * Maps Entity methods to functional operations on PlainObjects.
 * This is a transitional implementation that will be removed after full migration.
 */

import * as operations from "../operations/audio-button";
import type { AudioButtonPlainObject } from "../plain-objects/audio-button-plain";
import * as transformers from "../transformers/audio-button";
import type { FirestoreServerAudioButtonData } from "../types/firestore/audio-button";
import * as validators from "../validators/audio-button";

/**
 * AudioButton ID value object (compatibility)
 */
export class AudioButtonId {
	constructor(private readonly value: string) {
		if (!value || value.trim().length === 0) {
			throw new Error("AudioButton ID cannot be empty");
		}
	}

	toString(): string {
		return this.value;
	}

	equals(other: AudioButtonId): boolean {
		return other instanceof AudioButtonId && this.value === other.value;
	}

	static generate(): AudioButtonId {
		return new AudioButtonId(transformers.generateId());
	}
}

/**
 * Creator information for AudioButton
 */
export interface AudioButtonCreatorInfo {
	readonly id: string;
	readonly name: string;
}

/**
 * Audio button list result
 */
export interface AudioButtonListResult {
	items: AudioButtonPlainObject[];
	total: number;
	page: number;
	pageSize: number;
}

/**
 * AudioButton Entity (Compatibility Layer)
 *
 * This class provides a backward-compatible interface for existing code
 * while internally using PlainObject and functional operations.
 */
export class AudioButton {
	private plainObject: AudioButtonPlainObject;

	constructor(plainObject: AudioButtonPlainObject) {
		this.plainObject = plainObject;
	}

	// Static factory methods
	static fromPlainObject(plain: AudioButtonPlainObject): AudioButton {
		return new AudioButton(plain);
	}

	static fromFirestore(data: FirestoreServerAudioButtonData): AudioButton | null {
		const plain = transformers.fromFirestore(data);
		return plain ? new AudioButton(plain) : null;
	}

	static create(params: {
		id: string;
		buttonText: string;
		startTime: number;
		endTime: number;
		videoId: string;
		videoTitle: string;
		tags?: string[];
		createdBy: AudioButtonCreatorInfo;
		isPublic?: boolean;
	}): AudioButton {
		const plain = transformers.createAudioButton(params);
		return new AudioButton(plain);
	}

	// Getters that map to PlainObject properties
	get id(): AudioButtonId {
		return new AudioButtonId(this.plainObject.id);
	}

	get buttonText(): string {
		return this.plainObject.buttonText;
	}

	get startTime(): number {
		return this.plainObject.startTime;
	}

	get endTime(): number {
		return this.plainObject.endTime;
	}

	get videoId(): string {
		return this.plainObject.videoId;
	}

	get videoTitle(): string {
		return this.plainObject.videoTitle;
	}

	get tags(): string[] {
		return this.plainObject.tags || [];
	}

	get createdBy(): AudioButtonCreatorInfo {
		return { ...this.plainObject.createdBy };
	}

	get isPublic(): boolean {
		return this.plainObject.isPublic;
	}

	get createdAt(): Date {
		return new Date(this.plainObject.createdAt);
	}

	get updatedAt(): Date {
		return new Date(this.plainObject.updatedAt);
	}

	get viewCount(): number {
		return this.plainObject.viewCount || 0;
	}

	get likeCount(): number {
		return this.plainObject.likeCount || 0;
	}

	get dislikeCount(): number {
		return this.plainObject.dislikeCount || 0;
	}

	get favoriteCount(): number {
		return this.plainObject.favoriteCount || 0;
	}

	// Methods that use operations
	getDisplayText(): string {
		return operations.getDisplayText(this.plainObject);
	}

	getYouTubeUrl(): string {
		return operations.getYouTubeUrl(this.plainObject);
	}

	getYouTubeUrlWithTime(): string {
		return operations.getYouTubeUrlWithTime(this.plainObject);
	}

	getFormattedStartTime(): string {
		return operations.getFormattedStartTime(this.plainObject);
	}

	getFormattedEndTime(): string {
		return operations.getFormattedEndTime(this.plainObject);
	}

	getDuration(): number {
		return operations.getDuration(this.plainObject);
	}

	getFormattedDuration(): string {
		return operations.getFormattedDuration(this.plainObject);
	}

	hasBeenPlayed(): boolean {
		return operations.hasBeenPlayed(this.plainObject);
	}

	getTotalEngagement(): number {
		return operations.getTotalEngagement(this.plainObject);
	}

	getEngagementRate(): number {
		return operations.getEngagementRate(this.plainObject);
	}

	getLikeRatio(): number {
		return operations.getLikeRatio(this.plainObject);
	}

	isPopular(threshold = 100): boolean {
		return operations.isPopular(this.plainObject, threshold);
	}

	hasTag(tag: string): boolean {
		return operations.hasTag(this.plainObject, tag);
	}

	isCreatedBy(userId: string): boolean {
		return operations.isCreatedBy(this.plainObject, userId);
	}

	getAgeInDays(): number {
		return operations.getAgeInDays(this.plainObject);
	}

	isRecent(days = 7): boolean {
		return operations.isRecent(this.plainObject, days);
	}

	// Validation methods
	isValid(): boolean {
		const result = validators.validateAudioButton(this.plainObject);
		return result.isValid;
	}

	getValidationErrors(): string[] {
		const result = validators.validateAudioButton(this.plainObject);
		return result.errors;
	}

	// Update methods (return new instances)
	updateVisibility(isPublic: boolean): AudioButton {
		const updated = transformers.updateAudioButton(this.plainObject, { isPublic });
		return new AudioButton(updated);
	}

	updateText(buttonText: string): AudioButton {
		const updated = transformers.updateAudioButton(this.plainObject, { buttonText });
		return new AudioButton(updated);
	}

	updateTags(tags: string[]): AudioButton {
		const updated = transformers.updateAudioButton(this.plainObject, { tags });
		return new AudioButton(updated);
	}

	updateTimestamps(startTime: number, endTime: number): AudioButton {
		const updated = transformers.updateAudioButton(this.plainObject, { startTime, endTime });
		return new AudioButton(updated);
	}

	recordPlay(): AudioButton {
		const updated = transformers.incrementViewCount(this.plainObject);
		return new AudioButton(updated);
	}

	recordLike(): AudioButton {
		const updated = transformers.incrementLikeCount(this.plainObject);
		return new AudioButton(updated);
	}

	removeLike(): AudioButton {
		const updated = transformers.decrementLikeCount(this.plainObject);
		return new AudioButton(updated);
	}

	recordDislike(): AudioButton {
		const updated = transformers.incrementDislikeCount(this.plainObject);
		return new AudioButton(updated);
	}

	removeDislike(): AudioButton {
		const updated = transformers.decrementDislikeCount(this.plainObject);
		return new AudioButton(updated);
	}

	incrementFavorite(): AudioButton {
		const updated = transformers.incrementFavoriteCount(this.plainObject);
		return new AudioButton(updated);
	}

	decrementFavorite(): AudioButton {
		const updated = transformers.decrementFavoriteCount(this.plainObject);
		return new AudioButton(updated);
	}

	// Conversion methods
	toPlainObject(): AudioButtonPlainObject {
		return { ...this.plainObject };
	}

	toFirestore(): FirestoreServerAudioButtonData {
		return transformers.toFirestore(this.plainObject);
	}

	toJSON(): AudioButtonPlainObject {
		return this.toPlainObject();
	}

	// Clone and equals for compatibility
	clone(): AudioButton {
		return new AudioButton({ ...this.plainObject });
	}

	equals(other: AudioButton): boolean {
		return other instanceof AudioButton && this.plainObject.id === other.plainObject.id;
	}
}

// Re-export for backward compatibility
export type { AudioButtonPlainObject } from "../plain-objects/audio-button-plain";

// Helper function to convert Entity to PlainObject
export function convertToAudioButtonPlainObject(
	entity: AudioButton | AudioButtonPlainObject,
): AudioButtonPlainObject {
	if (entity instanceof AudioButton) {
		return entity.toPlainObject();
	}
	return entity;
}

// Helper function to convert PlainObject to Entity
export function convertToAudioButtonEntity(
	plain: AudioButtonPlainObject | AudioButton,
): AudioButton {
	if (plain instanceof AudioButton) {
		return plain;
	}
	return AudioButton.fromPlainObject(plain);
}
