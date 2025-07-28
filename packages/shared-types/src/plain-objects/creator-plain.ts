/**
 * Creator Plain Object
 *
 * Serializable representation of Creator Entity for Server/Client boundary
 */

/**
 * Creator Plain Object interface
 * Used for passing creator data between Server and Client Components
 */
export interface CreatorPlainObject {
	id: string;
	creatorId: string;
	name: string;
	types: string[];
	workCount: number;
	registeredAt: string;
	lastUpdated: string;
}

/**
 * Creator Work Mapping Plain Object interface
 * Used for passing mapping data between Server and Client Components
 */
export interface CreatorWorkMappingPlainObject {
	id: string;
	creatorId: string;
	workId: string;
	creatorName: string;
	types: string[];
	circleId: string;
	createdAt: string;
}
