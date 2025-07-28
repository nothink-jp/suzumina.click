/**
 * Plain object types for Circle entity
 *
 * These types are used for Server/Client Component boundary in Next.js
 */

/**
 * Circle plain object for serialization
 *
 * This is the type returned by CircleEntity.toPlainObject()
 * and used for passing data from Server to Client Components
 */
export interface CirclePlainObject {
	id: string;
	circleId: string;
	name: string;
	nameEn?: string;
	workCount: number;
	url: string;
	isNew: boolean;
	isActive: boolean;
	hasWorks: boolean;
	createdAt: string;
	lastUpdated: string;
}
