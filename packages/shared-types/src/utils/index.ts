/**
 * Shared utility functions for the application
 */

// Re-export utilities
export * from "./date-parser";
export * from "./number-parser";

/**
 * Format timestamp to mm:ss or hh:mm:ss format with tenths of a second
 * @param seconds Timestamp in seconds
 * @returns Formatted time string
 */
export function formatTimestamp(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);
	const tenths = Math.floor((seconds % 1) * 10);

	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${tenths}`;
	}
	return `${minutes}:${secs.toString().padStart(2, "0")}.${tenths}`;
}

/**
 * Parse ISO 8601 duration to seconds
 * @param duration ISO 8601 duration string (e.g., "PT1H23M45S")
 * @returns Duration in seconds
 */
export function parseDurationToSeconds(duration?: string): number {
	if (!duration) return 0;

	const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
	if (!match) return 0;

	const hours = Number.parseInt(match[1] || "0", 10);
	const minutes = Number.parseInt(match[2] || "0", 10);
	const seconds = Number.parseInt(match[3] || "0", 10);

	return hours * 3600 + minutes * 60 + seconds;
}
