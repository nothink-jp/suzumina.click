import { useCallback, useRef } from "react";
import { incrementPlayCount } from "@/app/buttons/actions";

/**
 * Hook to handle play count increments with debouncing
 * Prevents multiple increments for the same play session
 * Uses fire-and-forget pattern to avoid page reloads
 */
export function usePlayCount() {
	// Track which audio buttons have been played in this session
	const playedInSession = useRef(new Set<string>());
	// Track timeouts for debouncing
	const playTimeouts = useRef(new Map<string, NodeJS.Timeout>());
	// Track pending increments for batch processing
	const pendingIncrements = useRef(new Set<string>());
	const batchTimeout = useRef<NodeJS.Timeout | null>(null);

	// Process batch increments with a delay to avoid server spam
	const processBatch = useCallback(() => {
		if (pendingIncrements.current.size === 0) return;

		// Process all pending increments
		const toProcess = Array.from(pendingIncrements.current);
		pendingIncrements.current.clear();

		// Process each increment individually with a small delay
		toProcess.forEach((audioButtonId, index) => {
			setTimeout(() => {
				incrementPlayCount(audioButtonId).catch((_error) => {
					// Silently fail - remove from played set on error
					playedInSession.current.delete(audioButtonId);
				});
			}, index * 100); // 100ms delay between each increment
		});
	}, []);

	const handlePlay = useCallback(
		(audioButtonId: string) => {
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

			// Add to pending batch instead of immediate processing
			pendingIncrements.current.add(audioButtonId);

			// Clear existing batch timeout
			if (batchTimeout.current) {
				clearTimeout(batchTimeout.current);
			}

			// Set new batch timeout (1 second delay)
			batchTimeout.current = setTimeout(() => {
				processBatch();
				batchTimeout.current = null;
			}, 1000);
		},
		[processBatch],
	);

	// Cleanup function to clear all timeouts
	const cleanup = useCallback(() => {
		playTimeouts.current.forEach((timeout) => clearTimeout(timeout));
		playTimeouts.current.clear();
		playedInSession.current.clear();
		pendingIncrements.current.clear();
		if (batchTimeout.current) {
			clearTimeout(batchTimeout.current);
			batchTimeout.current = null;
		}
	}, []);

	return { handlePlay, cleanup };
}
