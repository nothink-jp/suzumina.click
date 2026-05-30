export function resolveDisplayName(
	displayName: string | undefined,
	globalName: string | undefined,
	username: string,
): string {
	return displayName || globalName || username;
}
