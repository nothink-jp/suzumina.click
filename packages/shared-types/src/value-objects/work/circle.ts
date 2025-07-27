/**
 * Circle (Maker) Value Object
 *
 * Represents a DLsite circle/maker with its information
 */
export class Circle {
	constructor(
		private readonly _id: string,
		private readonly _name: string,
		private readonly _nameEn?: string,
	) {
		if (!_name || _name.trim().length === 0) {
			throw new Error("Circle name cannot be empty");
		}
		if (!_id || _id.trim().length === 0) {
			throw new Error("Circle ID cannot be empty");
		}
	}

	/**
	 * Gets the circle ID (e.g., "RG23954")
	 */
	get id(): string {
		return this._id;
	}

	/**
	 * Gets the circle name
	 */
	get name(): string {
		return this._name;
	}

	/**
	 * Gets the circle name in English
	 */
	get nameEn(): string | undefined {
		return this._nameEn;
	}

	/**
	 * Gets display name (prefers English if available based on context)
	 */
	toDisplayString(preferEnglish = false): string {
		if (preferEnglish && this._nameEn) {
			return this._nameEn;
		}
		return this._name;
	}

	/**
	 * Gets searchable text
	 */
	getSearchableText(): string {
		const parts = [this._name];
		if (this._nameEn) parts.push(this._nameEn);
		return parts.join(" ");
	}

	/**
	 * Creates a DLsite circle URL
	 */
	toUrl(): string {
		return `https://www.dlsite.com/maniax/circle/profile/=/maker_id/${this._id}.html`;
	}

	equals(other: Circle): boolean {
		return (
			other instanceof Circle &&
			this._id === other._id &&
			this._name === other._name &&
			this._nameEn === other._nameEn
		);
	}

	/**
	 * Creates a Circle from partial data
	 */
	static fromPartial(data: { id?: string; name: string; nameEn?: string }): Circle {
		// If no ID provided, generate from name
		const id = data.id || `UNKNOWN_${Date.now()}`;
		return new Circle(id, data.name, data.nameEn);
	}
}
