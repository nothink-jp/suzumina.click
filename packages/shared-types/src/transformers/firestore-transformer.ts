/**
 * Firestore Transformer - Firestore ↔ 内部データモデル変換
 *
 * Firestoreドキュメントと内部データモデルの相互変換
 * Firestoreは既にcamelCase形式で統一されている
 */

import type { CircleData } from "../models/circle-data";
import type { CreatorData, CreatorType } from "../models/creator-data";
import type {
	CreatorInfo,
	CreatorsData,
	PriceData,
	RatingData,
	WorkData,
} from "../models/work-data";

/**
 * Firestore ドキュメントデータ型
 */
export interface FirestoreWorkDocument {
	id?: string;
	productId: string;
	title: string;
	maskedTitle?: string;
	circle: string; // サークル名（後方互換）
	circleId?: string;
	circleEn?: string;
	price: PriceData;
	releaseDate: string;
	registeredDate?: string;
	lastModified?: string;
	rating?: RatingData;
	category?: string;
	workType?: string;
	tags?: string[];
	description?: string;
	imageUrl?: string;
	thumbnailUrl?: string;
	workUrl?: string;
	saleCount?: number;
	reviewCount?: number;
	isAdult?: boolean;
	hasStock?: boolean;
	creators?: {
		scenario?: CreatorInfo[];
		illustration?: CreatorInfo[];
		voiceActor?: CreatorInfo[];
		music?: CreatorInfo[];
		createdBy?: CreatorInfo[];
		other?: CreatorInfo[];
	};
}

/**
 * Firestore → WorkData 変換
 */
export const fromFirestore = (doc: FirestoreWorkDocument, id?: string): WorkData | null => {
	// 必須フィールドチェック
	if (!doc.productId || !doc.title) {
		return null;
	}

	return {
		id: id || doc.id || doc.productId,
		productId: doc.productId,
		title: doc.title,
		maskedTitle: doc.maskedTitle,
		circle: {
			id: doc.circleId || "UNKNOWN",
			name: doc.circle || "Unknown Circle",
			nameEn: doc.circleEn,
		},
		price: doc.price || { current: 0 },
		releaseDate: doc.releaseDate || new Date().toISOString(),
		registeredDate: doc.registeredDate,
		lastModified: doc.lastModified,
		rating: doc.rating,
		category: doc.category,
		workType: doc.workType,
		tags: doc.tags,
		description: doc.description,
		imageUrl: doc.imageUrl,
		thumbnailUrl: doc.thumbnailUrl,
		workUrl: doc.workUrl,
		saleCount: doc.saleCount,
		reviewCount: doc.reviewCount,
		isAdult: doc.isAdult,
		hasStock: doc.hasStock,
		creators: doc.creators as CreatorsData,
	};
};

/**
 * WorkData → Firestore 変換
 */
export const toFirestore = (work: WorkData): FirestoreWorkDocument => {
	return {
		productId: work.productId,
		title: work.title,
		maskedTitle: work.maskedTitle,
		circle: work.circle.name,
		circleId: work.circle.id,
		circleEn: work.circle.nameEn,
		price: work.price,
		releaseDate: work.releaseDate,
		registeredDate: work.registeredDate,
		lastModified: work.lastModified || new Date().toISOString(),
		rating: work.rating,
		category: work.category,
		workType: work.workType,
		tags: work.tags ? [...work.tags] : undefined,
		description: work.description,
		imageUrl: work.imageUrl,
		thumbnailUrl: work.thumbnailUrl,
		workUrl: work.workUrl,
		saleCount: work.saleCount,
		reviewCount: work.reviewCount,
		isAdult: work.isAdult,
		hasStock: work.hasStock,
		creators: work.creators
			? {
					scenario: work.creators.scenario ? [...work.creators.scenario] : undefined,
					illustration: work.creators.illustration ? [...work.creators.illustration] : undefined,
					voiceActor: work.creators.voiceActor ? [...work.creators.voiceActor] : undefined,
					music: work.creators.music ? [...work.creators.music] : undefined,
					createdBy: work.creators.createdBy ? [...work.creators.createdBy] : undefined,
					other: work.creators.other ? [...work.creators.other] : undefined,
				}
			: undefined,
	};
};

/**
 * Firestore Circle ドキュメント型
 */
export interface FirestoreCircleDocument {
	id?: string;
	name: string;
	nameEn?: string;
	workIds: string[];
	createdAt: string;
	updatedAt: string;
	totalWorks?: number;
	latestWorkDate?: string;
}

/**
 * Firestore → CircleData 変換
 */
export const circleFromFirestore = (
	doc: FirestoreCircleDocument,
	id?: string,
): CircleData | null => {
	if (!doc.name) {
		return null;
	}

	return {
		id: id || doc.id || "",
		name: doc.name,
		nameEn: doc.nameEn,
		workIds: doc.workIds || [],
		createdAt: doc.createdAt || new Date().toISOString(),
		updatedAt: doc.updatedAt || new Date().toISOString(),
		totalWorks: doc.totalWorks,
		latestWorkDate: doc.latestWorkDate,
	};
};

/**
 * CircleData → Firestore 変換
 */
export const circleToFirestore = (circle: CircleData): FirestoreCircleDocument => {
	return {
		name: circle.name,
		nameEn: circle.nameEn,
		workIds: [...circle.workIds],
		createdAt: circle.createdAt,
		updatedAt: circle.updatedAt || new Date().toISOString(),
		totalWorks: circle.totalWorks || circle.workIds.length,
		latestWorkDate: circle.latestWorkDate,
	};
};

/**
 * Firestore Creator ドキュメント型
 */
export interface FirestoreCreatorDocument {
	id?: string;
	name: string;
	nameReading?: string;
	types: CreatorType[];
	workIds: string[];
	circleIds?: string[];
	createdAt: string;
	updatedAt: string;
}

/**
 * Firestore → CreatorData 変換
 */
export const creatorFromFirestore = (
	doc: FirestoreCreatorDocument,
	id?: string,
): CreatorData | null => {
	if (!doc.name) {
		return null;
	}

	return {
		id: id || doc.id || "",
		name: doc.name,
		nameReading: doc.nameReading,
		types: doc.types || [],
		workIds: doc.workIds || [],
		circleIds: doc.circleIds,
		createdAt: doc.createdAt || new Date().toISOString(),
		updatedAt: doc.updatedAt || new Date().toISOString(),
	};
};

/**
 * CreatorData → Firestore 変換
 */
export const creatorToFirestore = (creator: CreatorData): FirestoreCreatorDocument => {
	return {
		name: creator.name,
		nameReading: creator.nameReading,
		types: [...creator.types],
		workIds: [...creator.workIds],
		circleIds: creator.circleIds ? [...creator.circleIds] : undefined,
		createdAt: creator.createdAt,
		updatedAt: creator.updatedAt || new Date().toISOString(),
	};
};

/**
 * バッチ変換ユーティリティ
 */
export const batchFromFirestore = (docs: FirestoreWorkDocument[]): WorkData[] => {
	return docs.map((doc) => fromFirestore(doc)).filter((work): work is WorkData => work !== null);
};

export const batchToFirestore = (works: WorkData[]): FirestoreWorkDocument[] => {
	return works.map(toFirestore);
};
