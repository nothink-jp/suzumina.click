/**
 * Domain-Specific ID Types
 *
 * Branded types for various entity IDs to ensure type safety
 * and prevent accidental misuse of string IDs.
 */

import invariant from "tiny-invariant";
import { type Brand, createBrandFactory } from "./branded-types";

/**
 * DLsite Work ID (format: RJ + 6-8 digits)
 */
export type WorkId = Brand<string, "WorkId">;

export const WorkId = createBrandFactory<WorkId>(
	(value) => /^RJ\d{6,8}$/.test(value),
	(value) => `Invalid WorkId format: ${value}. Expected format: RJ[0-9]{6,8}`,
);

/**
 * DLsite Circle ID
 */
export type CircleId = Brand<string, "CircleId">;

export const CircleId = createBrandFactory<CircleId>(
	(value) => value.length > 0,
	(value) => `CircleId cannot be empty: ${value}`,
);

/**
 * Discord User ID
 */
export type UserId = Brand<string, "UserId">;

export const UserId = createBrandFactory<UserId>(
	(value) => /^\d+$/.test(value) && value.length >= 17,
	(value) => `Invalid Discord UserId format: ${value}`,
);

/**
 * YouTube Video ID
 */
export type VideoId = Brand<string, "VideoId">;

export const VideoId = createBrandFactory<VideoId>(
	(value) => /^[a-zA-Z0-9_-]{11}$/.test(value),
	(value) => `Invalid YouTube VideoId format: ${value}. Expected 11 characters`,
);

/**
 * YouTube Channel ID
 */
export type ChannelId = Brand<string, "ChannelId">;

export const ChannelId = createBrandFactory<ChannelId>(
	(value) => value.startsWith("UC") && value.length === 24,
	(value) => `Invalid YouTube ChannelId format: ${value}`,
);

/**
 * Audio Button ID
 */
export type AudioButtonId = Brand<string, "AudioButtonId">;

export const AudioButtonId = {
	/**
	 * Generates a new AudioButton ID
	 */
	generate(): AudioButtonId {
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substring(2, 8);
		return `ab_${timestamp}_${random}` as AudioButtonId;
	},

	/**
	 * Creates an AudioButtonId from existing string
	 */
	of(value: string): AudioButtonId {
		invariant(
			value.startsWith("ab_") && value.length > 10,
			`Invalid AudioButtonId format: ${value}`,
		);
		return value as AudioButtonId;
	},

	/**
	 * Type guard
	 */
	isValid(value: unknown): value is AudioButtonId {
		return typeof value === "string" && value.startsWith("ab_") && value.length > 10;
	},
};

/**
 * Creator ID
 */
export type CreatorId = Brand<string, "CreatorId">;

export const CreatorId = createBrandFactory<CreatorId>(
	(value) => value.length > 0,
	(value) => `CreatorId cannot be empty: ${value}`,
);

/**
 * Contact ID
 */
export type ContactId = Brand<string, "ContactId">;

export const ContactId = createBrandFactory<ContactId>(
	(value) => value.length > 0,
	(value) => `ContactId cannot be empty: ${value}`,
);

/**
 * Favorite ID
 */
export type FavoriteId = Brand<string, "FavoriteId">;

export const FavoriteId = createBrandFactory<FavoriteId>(
	(value) => value.length > 0,
	(value) => `FavoriteId cannot be empty: ${value}`,
);
