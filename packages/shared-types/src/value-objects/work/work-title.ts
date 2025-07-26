/**
 * Work Title Value Object
 *
 * Represents a work title with validation and manipulation methods
 */
export class WorkTitle {
	constructor(
		private readonly value: string,
		private readonly _masked?: string,
		private readonly _kana?: string,
		private readonly _altName?: string,
	) {
		if (!value || value.trim().length === 0) {
			throw new Error("Work title cannot be empty");
		}
	}

	toString(): string {
		return this.value;
	}

	/**
	 * Gets the masked title for sensitive content
	 */
	getMasked(): string {
		return this._masked || this.value;
	}

	/**
	 * Gets the kana reading
	 */
	getKana(): string | undefined {
		return this._kana;
	}

	/**
	 * Gets the alternative name
	 */
	getAltName(): string | undefined {
		return this._altName;
	}

	/**
	 * Gets display title (prefers alt name if available)
	 */
	toDisplayString(): string {
		return this._altName || this.value;
	}

	/**
	 * Checks if title contains specific keywords
	 */
	contains(keyword: string): boolean {
		const lowerKeyword = keyword.toLowerCase();
		return (
			this.value.toLowerCase().includes(lowerKeyword) ||
			(this._altName?.toLowerCase().includes(lowerKeyword) ?? false) ||
			(this._kana?.toLowerCase().includes(lowerKeyword) ?? false)
		);
	}

	/**
	 * Gets searchable text combining all title variations
	 */
	getSearchableText(): string {
		const parts = [this.value];
		if (this._altName) parts.push(this._altName);
		if (this._kana) parts.push(this._kana);
		return parts.join(" ");
	}

	equals(other: WorkTitle): boolean {
		return (
			other instanceof WorkTitle &&
			this.value === other.value &&
			this._masked === other._masked &&
			this._kana === other._kana &&
			this._altName === other._altName
		);
	}

	/**
	 * Creates a new WorkTitle with updated alt name
	 */
	withAltName(altName: string): WorkTitle {
		return new WorkTitle(this.value, this._masked, this._kana, altName);
	}
}
