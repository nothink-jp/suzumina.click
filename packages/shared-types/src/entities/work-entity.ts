/**
 * Work Entity
 *
 * Represents a DLsite work with rich domain behavior using Value Objects.
 * This implementation follows the Entity Implementation Guidelines,
 * prioritizing practical design for Next.js + Cloud Functions environment.
 */

import type { WorkPlainObject } from "../plain-objects/work-plain";
import type { FirestoreServerWorkData } from "../types/firestore/work";
import { Circle } from "../value-objects/work/circle";
import { WorkCreators } from "../value-objects/work/work-creators";
import { WorkId } from "../value-objects/work/work-id";
import { WorkPrice } from "../value-objects/work/work-price";
import { WorkRating } from "../value-objects/work/work-rating";
import { WorkTitle } from "../value-objects/work/work-title";
import { BaseEntity, type EntityValidatable } from "./base/entity";
import type { WorkCategory, WorkLanguage } from "./work";

/**
 * Work metadata for system management
 */
export interface WorkMetadata {
	readonly registDate?: Date;
	readonly updateDate?: Date;
	readonly releaseDate?: Date;
	readonly createdAt: Date;
	readonly updatedAt: Date;
	readonly lastFetchedAt: Date;
}

/**
 * Work extended information
 */
export interface WorkExtendedInfo {
	readonly description: string;
	readonly ageRating?: string;
	readonly ageCategory?: number;
	readonly ageCategoryString?: string;
	readonly workType?: string;
	readonly workTypeString?: string;
	readonly workFormat?: string;
	readonly fileFormat?: string;
	readonly fileType?: string;
	readonly fileTypeString?: string;
	readonly fileSize?: number;
	readonly genres: string[];
	readonly customGenres: string[];
	readonly sampleImages: Array<{
		thumb: string;
		width?: number;
		height?: number;
	}>;
	readonly workUrl: string;
	readonly thumbnailUrl: string;
	readonly highResImageUrl?: string;
	readonly originalCategoryText?: string;
}

/**
 * Work series information
 */
export interface WorkSeriesInfo {
	readonly id?: string;
	readonly name?: string;
	readonly workCount?: number;
	readonly isCompleted?: boolean;
}

/**
 * Work sales status
 */
export interface WorkSalesStatus {
	readonly isOnSale: boolean;
	readonly isDiscounted: boolean;
	readonly isFree: boolean;
	readonly isSoldOut: boolean;
	readonly isReserveWork: boolean;
	readonly dlsiteplaySupported: boolean;
}

/**
 * Work Entity
 */
export class Work extends BaseEntity<Work> implements EntityValidatable<Work> {
	constructor(
		public readonly id: WorkId,
		public readonly title: WorkTitle,
		public readonly circle: Circle,
		public readonly category: WorkCategory,
		public readonly price: WorkPrice,
		private readonly _creators: WorkCreators,
		private readonly _rating: WorkRating | undefined,
		private readonly _extendedInfo: WorkExtendedInfo,
		private readonly _metadata: WorkMetadata,
		private readonly _seriesInfo?: WorkSeriesInfo,
		private readonly _salesStatus?: WorkSalesStatus,
		private readonly _translationInfo?: {
			isTranslationAgree: boolean;
			isOriginal: boolean;
			originalWorkno?: string;
			lang?: string;
		},
		private readonly _languageDownloads?: Array<{
			workno: string;
			label: string;
			lang: string;
			dlCount: string;
		}>,
	) {
		super();
	}

	/**
	 * Gets creators information
	 */
	get creators(): WorkCreators {
		return this._creators;
	}

	/**
	 * Gets rating information
	 */
	get rating(): WorkRating | undefined {
		return this._rating;
	}

	/**
	 * Gets extended information
	 */
	get extendedInfo(): WorkExtendedInfo {
		return { ...this._extendedInfo };
	}

	/**
	 * Gets metadata
	 */
	get metadata(): WorkMetadata {
		return { ...this._metadata };
	}

	/**
	 * Gets series information
	 */
	get seriesInfo(): WorkSeriesInfo | undefined {
		return this._seriesInfo ? { ...this._seriesInfo } : undefined;
	}

	/**
	 * Gets sales status
	 */
	get salesStatus(): WorkSalesStatus {
		return (
			this._salesStatus || {
				isOnSale: true,
				isDiscounted: this.price.isDiscounted(),
				isFree: this.price.isFree(),
				isSoldOut: false,
				isReserveWork: false,
				dlsiteplaySupported: false,
			}
		);
	}

	/**
	 * Creates Work from Firestore data (most important method)
	 */
	static fromFirestoreData(data: FirestoreServerWorkData): Work | null {
		try {
			const workId = new WorkId(data.productId);
			const title = Work.createTitle(data);
			const circle = Work.createCircle(data);
			const price = Work.createPrice(data);
			const creators = Work.createCreators(data);
			const rating = Work.createRating(data);
			const extendedInfo = Work.createExtendedInfo(data);
			const metadata = Work.createMetadata(data);
			const seriesInfo = Work.createSeriesInfo(data);
			const salesStatus = Work.createSalesStatus(data);

			return new Work(
				workId,
				title,
				circle,
				data.category,
				price,
				creators,
				rating,
				extendedInfo,
				metadata,
				seriesInfo,
				salesStatus,
				data.translationInfo
					? {
							isTranslationAgree: data.translationInfo.isTranslationAgree ?? false,
							isOriginal: data.translationInfo.isOriginal ?? false,
							originalWorkno: data.translationInfo.originalWorkno,
							lang: data.translationInfo.lang,
						}
					: undefined,
				data.languageDownloads?.map((dl) => ({
					workno: dl.workno,
					label: dl.label,
					lang: dl.lang,
					dlCount: dl.dlCount,
				})),
			);
		} catch (_error) {
			// In development, this error would be caught by error boundary
			// In production, we return null to gracefully handle invalid data
			// TODO: Consider using a proper logging service for production environments
			return null;
		}
	}

	/**
	 * Creates WorkTitle from Firestore data
	 */
	private static createTitle(data: FirestoreServerWorkData): WorkTitle {
		return new WorkTitle(data.title, data.titleMasked, data.titleKana, data.altName);
	}

	/**
	 * Creates Circle from Firestore data
	 */
	private static createCircle(data: FirestoreServerWorkData): Circle {
		return new Circle(data.circleId || "UNKNOWN", data.circle, data.circleEn);
	}

	/**
	 * Creates WorkPrice from Firestore data
	 */
	private static createPrice(data: FirestoreServerWorkData): WorkPrice {
		return new WorkPrice(
			data.currentPrice,
			data.currency || "JPY",
			data.originalPrice,
			data.discount,
			data.point,
		);
	}

	/**
	 * Creates WorkCreators from Firestore data
	 */
	private static createCreators(data: FirestoreServerWorkData): WorkCreators {
		return WorkCreators.fromLegacyArrays({
			voiceActors: data.voiceActors,
			scenario: data.scenario,
			illustration: data.illustration,
			music: data.music,
			author: data.author,
		});
	}

	/**
	 * Creates WorkRating from Firestore data
	 */
	private static createRating(data: FirestoreServerWorkData): WorkRating | undefined {
		if (data.ratingStars === undefined || data.ratingCount === undefined) {
			return undefined;
		}

		const distribution = data.ratingDetail?.reduce(
			(acc, detail) => {
				acc[detail.review_point] = detail.count;
				return acc;
			},
			{} as Record<number, number>,
		);

		return new WorkRating(
			data.ratingStars,
			data.ratingCount,
			data.averageRating || data.ratingStars,
			data.reviewCount,
			distribution,
		);
	}

	/**
	 * Creates WorkExtendedInfo from Firestore data
	 */
	private static createExtendedInfo(data: FirestoreServerWorkData): WorkExtendedInfo {
		return {
			description: data.description || "",
			ageRating: data.ageRating,
			ageCategory: data.ageCategory,
			ageCategoryString: data.ageCategoryString,
			workType: data.workType,
			workTypeString: data.workTypeString,
			workFormat: data.workFormat,
			fileFormat: data.fileFormat,
			fileType: data.fileType,
			fileTypeString: data.fileTypeString,
			fileSize: data.fileSize,
			genres: data.genres || [],
			customGenres: data.customGenres?.map((g) => g.name) || [],
			sampleImages: data.sampleImages || [],
			workUrl: data.workUrl,
			thumbnailUrl: data.thumbnailUrl,
			highResImageUrl: data.highResImageUrl,
			originalCategoryText: data.originalCategoryText,
		};
	}

	/**
	 * Creates WorkMetadata from Firestore data
	 */
	private static createMetadata(data: FirestoreServerWorkData): WorkMetadata {
		const convertTimestamp = (timestamp: unknown): Date | undefined => {
			if (timestamp && typeof timestamp === "object" && "toDate" in timestamp) {
				// biome-ignore lint/suspicious/noExplicitAny: Firestore Timestamp type handling
				return (timestamp as any).toDate();
			}
			if (typeof timestamp === "string") {
				return new Date(timestamp);
			}
			return undefined;
		};

		return {
			registDate: data.registDate ? new Date(data.registDate) : undefined,
			updateDate: data.updateDate ? new Date(data.updateDate) : undefined,
			releaseDate: data.releaseDate ? new Date(data.releaseDate) : undefined,
			createdAt: convertTimestamp(data.createdAt) || new Date(),
			updatedAt: convertTimestamp(data.updatedAt) || new Date(),
			lastFetchedAt: convertTimestamp(data.lastFetchedAt) || new Date(),
		};
	}

	/**
	 * Creates WorkSeriesInfo from Firestore data
	 */
	private static createSeriesInfo(data: FirestoreServerWorkData): WorkSeriesInfo | undefined {
		if (!data.seriesId && !data.seriesName) {
			return undefined;
		}

		return {
			id: data.seriesId,
			name: data.seriesName,
			workCount: undefined,
			isCompleted: undefined,
		};
	}

	/**
	 * Creates WorkSalesStatus from Firestore data
	 */
	private static createSalesStatus(data: FirestoreServerWorkData): WorkSalesStatus | undefined {
		if (!data.salesStatus) {
			return undefined;
		}

		return {
			isOnSale: data.salesStatus.isSale ?? true,
			isDiscounted: data.salesStatus.isDiscount ?? false,
			isFree: data.salesStatus.isFree ?? false,
			isSoldOut: data.salesStatus.isSoldOut ?? false,
			isReserveWork: data.salesStatus.isReserveWork ?? false,
			dlsiteplaySupported: data.salesStatus.dlsiteplayWork ?? false,
		};
	}

	/**
	 * Converts to Firestore format for persistence
	 */
	toFirestore(): FirestoreServerWorkData {
		return {
			id: this.id.toString(),
			productId: this.id.toString(),
			title: this.title.toString(),
			titleMasked: this.title.getMasked(),
			titleKana: this.title.getKana(),
			altName: this.title.getAltName(),
			circle: this.circle.name,
			circleId: this.circle.id,
			circleEn: this.circle.nameEn,
			description: this._extendedInfo.description,
			workType: this._extendedInfo.workType,
			workTypeString: this._extendedInfo.workTypeString,
			category: this.category,
			originalCategoryText: this._extendedInfo.workTypeString,
			workUrl: this._extendedInfo.workUrl,
			thumbnailUrl: this._extendedInfo.thumbnailUrl,
			highResImageUrl: this._extendedInfo.highResImageUrl,

			// Price information
			currentPrice: this.price.current,
			originalPrice: this.price.original,
			currency: this.price.currency,
			discount: this.price.discount,
			point: this.price.point,
			isFreeOrMissingPrice: this.price.isFree(),

			// Rating information
			ratingStars: this._rating?.stars,
			ratingCount: this._rating?.count,
			reviewCount: this._rating?.reviewCount,
			averageRating: this._rating?.average,
			ratingDetail: this._rating?.distribution
				? Object.entries(this._rating.distribution).map(([point, count]) => ({
						review_point: Number.parseInt(point, 10),
						count,
						ratio: (count / (this._rating?.count || 1)) * 100,
					}))
				: undefined,

			// Creators
			voiceActors: this._creators.voiceActors,
			scenario: this._creators.scenario,
			illustration: this._creators.illustration,
			music: this._creators.music,
			author: this._creators.others,

			// Extended info
			genres: this._extendedInfo.genres,
			customGenres: this._extendedInfo.customGenres.map((name) => ({
				genre_key: name,
				name,
			})),
			ageRating: this._extendedInfo.ageRating,
			ageCategory: this._extendedInfo.ageCategory,
			ageCategoryString: this._extendedInfo.ageCategoryString,
			workFormat: this._extendedInfo.workFormat,
			fileFormat: this._extendedInfo.fileFormat,
			fileType: this._extendedInfo.fileType,
			fileTypeString: this._extendedInfo.fileTypeString,
			fileSize: this._extendedInfo.fileSize,
			sampleImages: this._extendedInfo.sampleImages,

			// Dates
			registDate: this._metadata.registDate?.toISOString(),
			updateDate: this._metadata.updateDate?.toISOString(),
			releaseDate: this._metadata.releaseDate?.toISOString(),
			releaseDateISO: this._metadata.releaseDate?.toISOString().split("T")[0],
			releaseDateDisplay: this._metadata.releaseDate
				? this.formatJapaneseDate(this._metadata.releaseDate)
				: undefined,

			// Series
			seriesId: this._seriesInfo?.id,
			seriesName: this._seriesInfo?.name,

			// Sales status
			salesStatus: this._salesStatus
				? {
						isSale: this._salesStatus.isOnSale,
						isDiscount: this._salesStatus.isDiscounted,
						isFree: this._salesStatus.isFree,
						isSoldOut: this._salesStatus.isSoldOut,
						isReserveWork: this._salesStatus.isReserveWork,
						dlsiteplayWork: this._salesStatus.dlsiteplaySupported,
					}
				: undefined,

			// Translation
			translationInfo: this._translationInfo,
			languageDownloads: this._languageDownloads?.map((dl) => ({
				...dl,
				displayLabel: dl.label, // Use label as displayLabel for compatibility
			})),

			// Timestamps
			createdAt: this._metadata.createdAt,
			updatedAt: this._metadata.updatedAt,
			lastFetchedAt: this._metadata.lastFetchedAt,
		};
	}

	/**
	 * Converts to Plain Object for Server Component boundary (required)
	 */
	toPlainObject(): WorkPlainObject {
		// Import the functions from the original work.ts file
		const displayCategory = this.getDisplayCategory();
		const displayAgeRating = this.getDisplayAgeRating();
		const primaryLanguage = this.getPrimaryLanguage();
		const availableLanguages = this.getAvailableLanguages();

		return {
			// Basic identification
			id: this.id.toString(),
			productId: this.id.toString(),
			baseProductId: undefined, // TODO: Implement base product tracking

			// Basic work information
			title: this.title.toString(),
			titleMasked: this.title.getMasked(),
			titleKana: this.title.getKana(),
			altName: this.title.getAltName(),
			circle: this.circle.name,
			circleId: this.circle.id,
			circleEn: this.circle.nameEn,
			description: this._extendedInfo.description,
			category: this.category,
			originalCategoryText: this._extendedInfo.workTypeString,
			workUrl: this._extendedInfo.workUrl,
			thumbnailUrl: this._extendedInfo.thumbnailUrl,
			highResImageUrl: this._extendedInfo.highResImageUrl,

			// Structured data
			price: this.price.toPlainObject(),
			rating: this._rating?.toPlainObject(),
			creators: this._creators.toPlainObject(),
			series: this._seriesInfo,
			salesStatus: this.salesStatus,

			// Extended metadata
			ageRating: this._extendedInfo.ageRating,
			ageCategory: this._extendedInfo.ageCategory,
			ageCategoryString: this._extendedInfo.ageCategoryString,
			workType: this._extendedInfo.workType,
			workTypeString: this._extendedInfo.workTypeString,
			workFormat: this._extendedInfo.workFormat,
			fileFormat: this._extendedInfo.fileFormat,
			fileType: this._extendedInfo.fileType,
			fileTypeString: this._extendedInfo.fileTypeString,
			fileSize: this._extendedInfo.fileSize,
			genres: this._extendedInfo.genres,
			customGenres: this._extendedInfo.customGenres,
			sampleImages: this._extendedInfo.sampleImages.map((img) => ({
				thumbnailUrl: img.thumb,
				width: img.width,
				height: img.height,
			})),

			// Date information
			registDate: this._metadata.registDate?.toISOString(),
			updateDate: this._metadata.updateDate?.toISOString(),
			releaseDate: this._metadata.releaseDate?.toISOString(),
			releaseDateISO: this._metadata.releaseDate?.toISOString().split("T")[0],
			releaseDateDisplay: this._metadata.releaseDate
				? this.formatJapaneseDate(this._metadata.releaseDate)
				: undefined,
			createdAt: this._metadata.createdAt.toISOString(),
			updatedAt: this._metadata.updatedAt.toISOString(),
			lastFetchedAt: this._metadata.lastFetchedAt.toISOString(),

			// Translation and language
			translationInfo: this._translationInfo,
			languageDownloads: this._languageDownloads,

			// Computed properties (important for client component performance)
			_computed: {
				// Display-related
				displayTitle: this.title.toDisplayString(),
				displayCircle: this.circle.toDisplayString(),
				displayCategory,
				displayAgeRating,
				displayReleaseDate: this._metadata.releaseDate
					? this.formatJapaneseDate(this._metadata.releaseDate)
					: "",
				relativeUrl: `/maniax/work/=/product_id/${this.id.toString()}.html`,

				// Business logic
				isAdultContent: this.isAdultContent(),
				isVoiceWork: this.isVoiceWork(),
				isGameWork: this.isGameWork(),
				isMangaWork: this.isMangaWork(),
				hasDiscount: this.price.isDiscounted(),
				isNewRelease: this.isNewRelease(),
				isPopular: this.isPopular(),

				// Language-related
				primaryLanguage,
				availableLanguages,

				// Search and filtering
				searchableText: this.getSearchableText(),
				tags: this.getAllTags(),
			},
		};
	}

	/**
	 * Validates the entity
	 */
	isValid(): boolean {
		return this.getValidationErrors().length === 0;
	}

	/**
	 * Gets validation errors
	 */
	getValidationErrors(): string[] {
		const errors: string[] = [];

		// Required fields validation
		if (!this.id) errors.push("Work ID is required");
		if (!this.title) errors.push("Work title is required");
		if (!this.circle) errors.push("Circle information is required");
		if (!this.category) errors.push("Work category is required");
		if (!this.price) errors.push("Price information is required");

		// URL validation
		if (!this._extendedInfo.workUrl || !this.isValidUrl(this._extendedInfo.workUrl)) {
			errors.push("Valid work URL is required");
		}
		if (!this._extendedInfo.thumbnailUrl || !this.isValidUrl(this._extendedInfo.thumbnailUrl)) {
			errors.push("Valid thumbnail URL is required");
		}

		// Date validation
		if (this._metadata.createdAt > this._metadata.updatedAt) {
			errors.push("Created date cannot be after updated date");
		}

		return errors;
	}

	/**
	 * Clones the entity
	 */
	clone(): Work {
		return new Work(
			this.id,
			this.title,
			this.circle,
			this.category,
			this.price,
			this._creators,
			this._rating,
			{ ...this._extendedInfo },
			{ ...this._metadata },
			this._seriesInfo ? { ...this._seriesInfo } : undefined,
			this._salesStatus ? { ...this._salesStatus } : undefined,
			this._translationInfo ? { ...this._translationInfo } : undefined,
			this._languageDownloads ? [...this._languageDownloads] : undefined,
		);
	}

	/**
	 * Checks equality
	 */
	equals(other: Work): boolean {
		if (!other || !(other instanceof Work)) {
			return false;
		}

		return (
			this.id.equals(other.id) &&
			this.title.equals(other.title) &&
			this.circle.equals(other.circle) &&
			this.category === other.category &&
			this.price.equals(other.price) &&
			this._creators.equals(other._creators) &&
			((this._rating && other._rating && this._rating.equals(other._rating)) ||
				(!this._rating && !other._rating))
		);
	}

	// === Business Logic Methods ===

	/**
	 * Checks if this is adult content
	 */
	isAdultContent(): boolean {
		return (
			this._extendedInfo.ageCategory === 3 ||
			this._extendedInfo.ageCategoryString === "adult" ||
			this._extendedInfo.ageRating === "18禁"
		);
	}

	/**
	 * Checks if this is a voice work
	 */
	isVoiceWork(): boolean {
		return this.category === "SOU" || this._creators.hasVoiceActors();
	}

	/**
	 * Checks if this is a game work
	 */
	isGameWork(): boolean {
		return ["GAM", "RPG", "ACN", "SLN", "ADV", "PZL", "QIZ", "TBL", "DGT"].includes(this.category);
	}

	/**
	 * Checks if this is a manga work
	 */
	isMangaWork(): boolean {
		return this.category === "MNG";
	}

	/**
	 * Checks if this is a new release (within 30 days)
	 */
	isNewRelease(): boolean {
		if (!this._metadata.releaseDate) return false;
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		return this._metadata.releaseDate > thirtyDaysAgo;
	}

	/**
	 * Checks if this is popular (based on rating and count)
	 */
	isPopular(): boolean {
		if (!this._rating) return false;
		return this._rating.isHighlyRated() && this._rating.count >= 50;
	}

	/**
	 * Gets searchable text for full-text search
	 */
	getSearchableText(): string {
		const parts = [
			this.title.getSearchableText(),
			this.circle.getSearchableText(),
			this._creators.getSearchableText(),
			...this._extendedInfo.genres,
			...this._extendedInfo.customGenres,
			this._seriesInfo?.name || "",
		];
		return parts.filter(Boolean).join(" ").toLowerCase();
	}

	/**
	 * Gets all tags (genres + custom genres + categories)
	 */
	getAllTags(): string[] {
		const tags = new Set<string>();

		// Add genres
		this._extendedInfo.genres.forEach((g) => tags.add(g));
		this._extendedInfo.customGenres.forEach((g) => tags.add(g));

		// Add category
		tags.add(this.getDisplayCategory());

		// Add special tags
		if (this.isAdultContent()) tags.add("18禁");
		if (this.isVoiceWork()) tags.add("音声作品");
		if (this.isGameWork()) tags.add("ゲーム");
		if (this.isMangaWork()) tags.add("マンガ");
		if (this.isNewRelease()) tags.add("新作");
		if (this.price.isDiscounted()) tags.add("割引中");
		if (this.price.isFree()) tags.add("無料");

		return Array.from(tags);
	}

	/**
	 * Gets display category name
	 */
	private getDisplayCategory(): string {
		// Import from original work.ts
		const categoryDisplayNames: Record<WorkCategory, string> = {
			ADV: "アドベンチャー",
			SOU: "ボイス・ASMR",
			RPG: "ロールプレイング",
			MOV: "動画",
			MNG: "マンガ",
			GAM: "ゲーム",
			CG: "CG・イラスト",
			TOL: "ツール・アクセサリ",
			ET3: "その他・3D",
			SLN: "シミュレーション",
			ACN: "アクション",
			PZL: "パズル",
			QIZ: "クイズ",
			TBL: "テーブル",
			DGT: "デジタルノベル",
			etc: "その他",
		};
		return (
			this._extendedInfo.originalCategoryText ||
			categoryDisplayNames[this.category] ||
			this.category
		);
	}

	/**
	 * Gets display age rating
	 */
	private getDisplayAgeRating(): string {
		if (this._extendedInfo.ageRating) return this._extendedInfo.ageRating;
		if (this._extendedInfo.ageCategory === 1) return "全年齢";
		if (this._extendedInfo.ageCategory === 2) return "R-15";
		if (this._extendedInfo.ageCategory === 3) return "18禁";
		if (this._extendedInfo.ageCategoryString === "general") return "全年齢";
		if (this._extendedInfo.ageCategoryString === "r15") return "R-15";
		if (this._extendedInfo.ageCategoryString === "adult") return "18禁";
		return "不明";
	}

	/**
	 * Gets primary language
	 */
	private getPrimaryLanguage(): WorkLanguage {
		// Check title for language indicators
		const titleStr = this.title.toString();
		if (titleStr.includes("繁体中文版") || titleStr.includes("繁體中文版")) return "zh-tw";
		if (titleStr.includes("簡体中文版") || titleStr.includes("简体中文版")) return "zh-cn";
		if (titleStr.includes("English") || titleStr.includes("英語版")) return "en";
		if (titleStr.includes("한국어") || titleStr.includes("韓国語版")) return "ko";
		if (titleStr.includes("Español") || titleStr.includes("スペイン語版")) return "es";

		// Check language downloads
		if (this._languageDownloads && this._languageDownloads.length > 0) {
			const firstLang = this._languageDownloads[0]?.lang.toLowerCase();
			switch (firstLang) {
				case "ja":
				case "japanese":
					return "ja";
				case "en":
				case "english":
					return "en";
				case "zh-cn":
				case "chinese_simplified":
					return "zh-cn";
				case "zh-tw":
				case "chinese_traditional":
					return "zh-tw";
				case "ko":
				case "korean":
					return "ko";
				case "es":
				case "spanish":
					return "es";
			}
		}

		// Check translation info
		if (this._translationInfo?.isOriginal) return "ja";

		// Default to Japanese
		return "ja";
	}

	/**
	 * Gets available languages
	 */
	private getAvailableLanguages(): WorkLanguage[] {
		const languages = new Set<WorkLanguage>();

		// Add primary language
		languages.add(this.getPrimaryLanguage());

		// Add from language downloads
		if (this._languageDownloads) {
			for (const download of this._languageDownloads) {
				const lang = download.lang.toLowerCase();
				switch (lang) {
					case "ja":
					case "japanese":
						languages.add("ja");
						break;
					case "en":
					case "english":
						languages.add("en");
						break;
					case "zh-cn":
					case "chinese_simplified":
						languages.add("zh-cn");
						break;
					case "zh-tw":
					case "chinese_traditional":
						languages.add("zh-tw");
						break;
					case "ko":
					case "korean":
						languages.add("ko");
						break;
					case "es":
					case "spanish":
						languages.add("es");
						break;
					default:
						languages.add("other");
				}
			}
		}

		return Array.from(languages);
	}

	/**
	 * Formats date to Japanese format
	 */
	private formatJapaneseDate(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}年${month}月${day}日`;
	}

	/**
	 * Validates URL format
	 */
	private isValidUrl(url: string): boolean {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}
}
