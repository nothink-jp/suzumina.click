import { useCallback, useRef } from "react";
import { incrementPlayCount } from "@/app/buttons/actions";

/**
 * Hook to handle play count increments with debouncing
 * Prevents multiple increments for the same play session
 */
export function usePlayCount() {
	// Track which audio buttons have been played in this session
	const playedInSession = useRef(new Set<string>());
	// Track timeouts for debouncing
	const playTimeouts = useRef(new Map<string, NodeJS.Timeout>());

	const handlePlay = useCallback(async (audioButtonId: string) => {
		// Clear any existing timeout for this button
		const existingTimeout = playTimeouts.current.get(audioButtonId);
		if (existingTimeout) {
			clearTimeout(existingTimeout);
		}

		// If already played in this session, debounce for 30 seconds
		if (playedInSession.current.has(audioButtonId)) {
			// Set a timeout to allow re-incrementing after 30 seconds
			const timeout = setTimeout(() => {
				playedInSession.current.delete(audioButtonId);
				playTimeouts.current.delete(audioButtonId);
			}, 30000); // 30 seconds debounce

			playTimeouts.current.set(audioButtonId, timeout);
			return;
		}

		// Mark as played in this session
		playedInSession.current.add(audioButtonId);

		try {
			// Increment play count in the background
			await incrementPlayCount(audioButtonId);
		} catch (_error) {
			// Don't show error to user, just silently fail
			// Remove from played set on error so it can be retried
			playedInSession.current.delete(audioButtonId);
		}
	}, []);

	// Cleanup function to clear all timeouts
	const cleanup = useCallback(() => {
		playTimeouts.current.forEach((timeout) => clearTimeout(timeout));
		playTimeouts.current.clear();
		playedInSession.current.clear();
	}, []);

	return { handlePlay, cleanup };
}
