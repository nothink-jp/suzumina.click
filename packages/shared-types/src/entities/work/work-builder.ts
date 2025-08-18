/**
 * Work Builder
 *
 * Builder pattern implementation for Work entity construction.
 * Simplifies complex Work creation with fluent interface.
 */

import type { ValidationError } from "../../core/result";
import { err, ok, type Result, validationError } from "../../core/result";
import { Circle } from "../../value-objects/work/circle";
import { WorkCreators } from "../../value-objects/work/work-creators";
import { WorkId } from "../../value-objects/work/work-id";
import { WorkPrice } from "../../value-objects/work/work-price";
import { WorkRating } from "../../value-objects/work/work-rating";
import { WorkTitle } from "../../value-objects/work/work-title";
import {
	Work,
	type WorkExtendedInfo,
	type WorkMetadata,
	type WorkSalesStatus,
	type WorkSeriesInfo,
} from "../work-entity";
import type { WorkCategory } from "./work-types";

/**
 * Translation information for builder
 */
interface TranslationInfo {
	isTranslationAgree: boolean;
	isOriginal: boolean;
	originalWorkno?: string;
	lang?: string;
}

/**
 * Language download information for builder
 */
interface LanguageDownload {
	workno: string;
	label: string;
	lang: string;
	dlCount: string;
}

/**
 * Work Builder Class
 *
 * Provides a fluent interface for constructing Work entities
 * with validation at each step.
 */
export class WorkBuilder {
	private workId?: WorkId;
	private title?: WorkTitle;
	private circle?: Circle;
	private category?: WorkCategory;
	private price?: WorkPrice;
	private creators?: WorkCreators;
	private rating?: WorkRating;
	private extendedInfo?: WorkExtendedInfo;
	private metadata?: WorkMetadata;
	private seriesInfo?: WorkSeriesInfo;
	private salesStatus?: WorkSalesStatus;
	private translationInfo?: TranslationInfo;
	private languageDownloads?: LanguageDownload[];

	/**
	 * Sets work ID
	 */
	withId(id: string): Result<WorkBuilder, ValidationError> {
		const result = WorkId.create(id);
		if (result.isErr()) {
			return err(validationError("workId", `Invalid work ID: ${result.error.message}`));
		}
		this.workId = result.value;
		return ok(this);
	}

	/**
	 * Sets work ID (already validated)
	 */
	withWorkId(workId: WorkId): WorkBuilder {
		this.workId = workId;
		return this;
	}

	/**
	 * Sets title
	 */
	withTitle(
		title: string,
		maskedTitle?: string,
		titleKana?: string,
		altName?: string,
	): Result<WorkBuilder, ValidationError> {
		const result = WorkTitle.create(title, maskedTitle, titleKana, altName);
		if (result.isErr()) {
			return err(validationError("title", `Invalid title: ${result.error.message}`));
		}
		this.title = result.value;
		return ok(this);
	}

	/**
	 * Sets title (already validated)
	 */
	withWorkTitle(title: WorkTitle): WorkBuilder {
		this.title = title;
		return this;
	}

	/**
	 * Sets circle
	 */
	withCircle(id: string, name: string, nameEn?: string): Result<WorkBuilder, ValidationError> {
		const result = Circle.create(id, name, nameEn);
		if (result.isErr()) {
			return err(validationError("circle", `Invalid circle: ${result.error.message}`));
		}
		this.circle = result.value;
		return ok(this);
	}

	/**
	 * Sets circle (already validated)
	 */
	withCircleObject(circle: Circle): WorkBuilder {
		this.circle = circle;
		return this;
	}

	/**
	 * Sets category
	 */
	withCategory(category: WorkCategory): WorkBuilder {
		this.category = category;
		return this;
	}

	/**
	 * Sets price
	 */
	withPrice(
		current: number,
		currency?: string,
		original?: number,
		discount?: number,
		point?: number,
	): Result<WorkBuilder, ValidationError> {
		const result = WorkPrice.create(current, currency, original, discount, point);
		if (result.isErr()) {
			return err(validationError("price", `Invalid price: ${result.error.message}`));
		}
		this.price = result.value;
		return ok(this);
	}

	/**
	 * Sets price (already validated)
	 */
	withWorkPrice(price: WorkPrice): WorkBuilder {
		this.price = price;
		return this;
	}

	/**
	 * Sets creators
	 */
	withCreators(creators: WorkCreators): WorkBuilder {
		this.creators = creators;
		return this;
	}

	/**
	 * Sets rating
	 */
	withRating(
		stars: number,
		count: number,
		reviewCount?: number,
		distribution?: Record<number, number>,
	): Result<WorkBuilder, ValidationError> {
		// WorkRating.create expects (stars, count, average, reviewCount, distribution)
		// Using stars as average for compatibility
		const result = WorkRating.create(stars, count, stars, reviewCount, distribution);
		if (result.isErr()) {
			return err(validationError("rating", `Invalid rating: ${result.error.message}`));
		}
		this.rating = result.value;
		return ok(this);
	}

	/**
	 * Sets rating (already validated)
	 */
	withWorkRating(rating: WorkRating | undefined): WorkBuilder {
		this.rating = rating;
		return this;
	}

	/**
	 * Sets extended info
	 */
	withExtendedInfo(info: WorkExtendedInfo): WorkBuilder {
		this.extendedInfo = info;
		return this;
	}

	/**
	 * Sets metadata
	 */
	withMetadata(metadata: WorkMetadata): WorkBuilder {
		this.metadata = metadata;
		return this;
	}

	/**
	 * Sets series info
	 */
	withSeriesInfo(info: WorkSeriesInfo): WorkBuilder {
		this.seriesInfo = info;
		return this;
	}

	/**
	 * Sets sales status
	 */
	withSalesStatus(status: WorkSalesStatus): WorkBuilder {
		this.salesStatus = status;
		return this;
	}

	/**
	 * Sets translation info
	 */
	withTranslationInfo(info: TranslationInfo): WorkBuilder {
		this.translationInfo = info;
		return this;
	}

	/**
	 * Sets language downloads
	 */
	withLanguageDownloads(downloads: LanguageDownload[]): WorkBuilder {
		this.languageDownloads = downloads;
		return this;
	}

	/**
	 * Builds the Work entity
	 */
	build(): Result<Work, ValidationError> {
		// Validate required fields
		if (!this.workId) {
			return err(validationError("workId", "Work ID is required"));
		}
		if (!this.title) {
			return err(validationError("title", "Title is required"));
		}
		if (!this.circle) {
			return err(validationError("circle", "Circle is required"));
		}
		if (!this.category) {
			return err(validationError("category", "Category is required"));
		}
		if (!this.price) {
			return err(validationError("price", "Price is required"));
		}
		if (!this.extendedInfo) {
			return err(validationError("extendedInfo", "Extended info is required"));
		}
		if (!this.metadata) {
			return err(validationError("metadata", "Metadata is required"));
		}

		// Use empty creators if not provided
		const creators = this.creators || WorkCreators.createEmpty();

		// Create Work instance
		const work = new Work(
			this.workId,
			this.title,
			this.circle,
			this.category,
			this.price,
			creators,
			this.rating,
			this.extendedInfo,
			this.metadata,
			this.seriesInfo,
			this.salesStatus,
			this.translationInfo,
			this.languageDownloads,
		);

		return ok(work);
	}

	/**
	 * Creates a new builder instance
	 */
	static create(): WorkBuilder {
		return new WorkBuilder();
	}
}
