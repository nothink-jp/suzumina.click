/**
 * Work Creators Value Object
 *
 * Represents all creators involved in a work
 */
export class WorkCreators {
	constructor(
		private readonly _voiceActors: string[] = [],
		private readonly _scenario: string[] = [],
		private readonly _illustration: string[] = [],
		private readonly _music: string[] = [],
		private readonly _others: string[] = [],
	) {
		// Ensure arrays are valid
		this._voiceActors = this._voiceActors.filter((v) => v?.trim());
		this._scenario = this._scenario.filter((v) => v?.trim());
		this._illustration = this._illustration.filter((v) => v?.trim());
		this._music = this._music.filter((v) => v?.trim());
		this._others = this._others.filter((v) => v?.trim());
	}

	get voiceActors(): string[] {
		return [...this._voiceActors];
	}

	get scenario(): string[] {
		return [...this._scenario];
	}

	get illustration(): string[] {
		return [...this._illustration];
	}

	get music(): string[] {
		return [...this._music];
	}

	get others(): string[] {
		return [...this._others];
	}

	/**
	 * Gets all creators as a flat array
	 */
	getAll(): string[] {
		return [
			...this._voiceActors,
			...this._scenario,
			...this._illustration,
			...this._music,
			...this._others,
		];
	}

	/**
	 * Gets all unique creators
	 */
	getAllUnique(): string[] {
		return [...new Set(this.getAll())];
	}

	/**
	 * Checks if has any voice actors
	 */
	hasVoiceActors(): boolean {
		return this._voiceActors.length > 0;
	}

	/**
	 * Checks if has any creators
	 */
	hasAnyCreators(): boolean {
		return this.getAll().length > 0;
	}

	/**
	 * Gets primary voice actor (first one)
	 */
	getPrimaryVoiceActor(): string | undefined {
		return this._voiceActors[0];
	}

	/**
	 * Gets searchable text for all creators
	 */
	getSearchableText(): string {
		return this.getAllUnique().join(" ");
	}

	/**
	 * Converts to plain object
	 */
	toPlainObject() {
		return {
			voiceActors: this.voiceActors,
			scenario: this.scenario,
			illustration: this.illustration,
			music: this.music,
			others: this.others,
		};
	}

	equals(other: WorkCreators): boolean {
		if (!(other instanceof WorkCreators)) return false;

		return (
			this.arrayEquals(this._voiceActors, other._voiceActors) &&
			this.arrayEquals(this._scenario, other._scenario) &&
			this.arrayEquals(this._illustration, other._illustration) &&
			this.arrayEquals(this._music, other._music) &&
			this.arrayEquals(this._others, other._others)
		);
	}

	private arrayEquals(a: string[], b: string[]): boolean {
		if (a.length !== b.length) return false;
		return a.every((v, i) => v === b[i]);
	}

	/**
	 * Creates from DLsite API creaters object
	 */
	static fromCreatorsAPI(creaters?: {
		voice_by?: Array<{ name: string }>;
		scenario_by?: Array<{ name: string }>;
		illust_by?: Array<{ name: string }>;
		music_by?: Array<{ name: string }>;
		others_by?: Array<{ name: string }>;
		created_by?: Array<{ name: string }>;
	}): WorkCreators {
		if (!creaters) return new WorkCreators();

		return new WorkCreators(
			creaters.voice_by?.map((c) => c.name) || [],
			creaters.scenario_by?.map((c) => c.name) || [],
			creaters.illust_by?.map((c) => c.name) || [],
			creaters.music_by?.map((c) => c.name) || [],
			[
				...(creaters.others_by?.map((c) => c.name) || []),
				...(creaters.created_by?.map((c) => c.name) || []),
			],
		);
	}

	/**
	 * Creates from legacy arrays
	 */
	static fromLegacyArrays(data: {
		voiceActors?: string[];
		scenario?: string[];
		illustration?: string[];
		music?: string[];
		author?: string[];
	}): WorkCreators {
		return new WorkCreators(
			data.voiceActors || [],
			data.scenario || [],
			data.illustration || [],
			data.music || [],
			data.author || [],
		);
	}
}
