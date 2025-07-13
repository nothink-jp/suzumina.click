import { useEffect, useState } from "react";

/**
 * Hook to detect if component is running on client side
 * Helps prevent hydration mismatches
 */
export function useIsClient() {
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	return isClient;
}
