export function isValidCircleId(circleId: string): boolean {
	return /^RG\d+$/.test(circleId);
}

export function isValidCreatorId(creatorId: string): boolean {
	return creatorId.length > 0;
}
