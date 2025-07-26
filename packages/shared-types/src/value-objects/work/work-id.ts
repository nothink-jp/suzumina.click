/**
 * Work ID Value Object
 *
 * Represents a DLsite work product ID (e.g., "RJ236867")
 */
export class WorkId {
	constructor(private readonly value: string) {
		if (!this.isValid(value)) {
			throw new Error(`Invalid Work ID: ${value}`);
		}
	}

	/**
	 * Validates Work ID format
	 * DLsite IDs start with RJ, RE, RG, BJ, VJ, etc. followed by numbers
	 */
	private isValid(value: string): boolean {
		if (!value || value.trim().length === 0) return false;
		// DLsite ID pattern: 2 letters + numbers
		return /^[A-Z]{2}\d+$/.test(value);
	}

	toString(): string {
		return this.value;
	}

	equals(other: WorkId): boolean {
		return other instanceof WorkId && this.value === other.value;
	}

	/**
	 * Gets the ID type (RJ, RE, RG, etc.)
	 */
	getType(): string {
		return this.value.substring(0, 2);
	}

	/**
	 * Gets the numeric part of the ID
	 */
	getNumericPart(): number {
		return Number.parseInt(this.value.substring(2), 10);
	}

	/**
	 * Creates a WorkId from unknown input
	 */
	static fromString(value: unknown): WorkId | null {
		if (typeof value !== "string") return null;
		try {
			return new WorkId(value);
		} catch {
			return null;
		}
	}
}
