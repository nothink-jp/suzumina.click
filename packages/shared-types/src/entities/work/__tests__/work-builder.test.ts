import { describe, expect, it } from "vitest";
import { Circle } from "../../../value-objects/work/circle";
import { WorkCreators } from "../../../value-objects/work/work-creators";
import { WorkId } from "../../../value-objects/work/work-id";
import { WorkPrice } from "../../../value-objects/work/work-price";
import { WorkRating } from "../../../value-objects/work/work-rating";
import { WorkTitle } from "../../../value-objects/work/work-title";
import type {
	WorkExtendedInfo,
	WorkMetadata,
	WorkSalesStatus,
	WorkSeriesInfo,
} from "../../work-entity";
import { WorkBuilder } from "../work-builder";

describe("WorkBuilder", () => {
	const createMinimalExtendedInfo = (): WorkExtendedInfo => ({
		description: "Test description",
		genres: [],
		customGenres: [],
		sampleImages: [],
		workUrl: "https://example.com",
		thumbnailUrl: "https://example.com/thumb.jpg",
	});

	const createMinimalMetadata = (): WorkMetadata => ({
		createdAt: new Date(),
		updatedAt: new Date(),
		lastFetchedAt: new Date(),
	});

	describe("create", () => {
		it("should create a new WorkBuilder instance", () => {
			const builder = WorkBuilder.create();
			expect(builder).toBeInstanceOf(WorkBuilder);
		});
	});

	describe("withId", () => {
		it("should set valid work ID", () => {
			const builder = WorkBuilder.create();
			const result = builder.withId("RJ123456");

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toBe(builder);
			}
		});

		it("should reject invalid work ID", () => {
			const builder = WorkBuilder.create();
			const result = builder.withId("INVALID");

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.field).toBe("workId");
				expect(result.error.message).toContain("Invalid");
			}
		});
	});

	describe("withWorkId", () => {
		it("should set already validated WorkId", () => {
			const builder = WorkBuilder.create();
			const workId = WorkId.create("RJ123456");

			expect(workId.isOk()).toBe(true);
			if (workId.isOk()) {
				const result = builder.withWorkId(workId.value);
				expect(result).toBe(builder);
			}
		});
	});

	describe("withTitle", () => {
		it("should set title with all parameters", () => {
			const builder = WorkBuilder.create();
			const result = builder.withTitle("Test Title", "Test T***", "テストタイトル", "Alt Title");

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toBe(builder);
			}
		});

		it("should set title with only required parameter", () => {
			const builder = WorkBuilder.create();
			const result = builder.withTitle("Test Title");

			expect(result.isOk()).toBe(true);
		});

		it("should reject empty title", () => {
			const builder = WorkBuilder.create();
			const result = builder.withTitle("");

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.field).toBe("title");
				expect(result.error.message).toContain("Invalid");
			}
		});
	});

	describe("withWorkTitle", () => {
		it("should set already validated WorkTitle", () => {
			const builder = WorkBuilder.create();
			const title = WorkTitle.create("Test Title");

			expect(title.isOk()).toBe(true);
			if (title.isOk()) {
				const result = builder.withWorkTitle(title.value);
				expect(result).toBe(builder);
			}
		});
	});

	describe("withCircle", () => {
		it("should set circle with all parameters", () => {
			const builder = WorkBuilder.create();
			const result = builder.withCircle("RG12345", "Test Circle", "Test Circle EN");

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toBe(builder);
			}
		});

		it("should set circle without English name", () => {
			const builder = WorkBuilder.create();
			const result = builder.withCircle("RG12345", "Test Circle");

			expect(result.isOk()).toBe(true);
		});

		it("should reject empty circle name", () => {
			const builder = WorkBuilder.create();
			const result = builder.withCircle("RG12345", "");

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.field).toBe("circle");
				expect(result.error.message).toContain("Invalid");
			}
		});
	});

	describe("withCircleObject", () => {
		it("should set already validated Circle", () => {
			const builder = WorkBuilder.create();
			const circle = Circle.create("RG12345", "Test Circle");

			expect(circle.isOk()).toBe(true);
			if (circle.isOk()) {
				const result = builder.withCircleObject(circle.value);
				expect(result).toBe(builder);
			}
		});
	});

	describe("withCategory", () => {
		it("should set category", () => {
			const builder = WorkBuilder.create();
			const result = builder.withCategory("SOU");
			expect(result).toBe(builder);
		});
	});

	describe("withPrice", () => {
		it("should set price with all parameters", () => {
			const builder = WorkBuilder.create();
			const result = builder.withPrice(1000, "JPY", 1200, 20, 100);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toBe(builder);
			}
		});

		it("should set price with only current amount", () => {
			const builder = WorkBuilder.create();
			const result = builder.withPrice(1000);

			expect(result.isOk()).toBe(true);
		});

		it("should reject negative price", () => {
			const builder = WorkBuilder.create();
			const result = builder.withPrice(-1000);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.field).toBe("price");
				expect(result.error.message).toContain("Invalid");
			}
		});
	});

	describe("withWorkPrice", () => {
		it("should set already validated WorkPrice", () => {
			const builder = WorkBuilder.create();
			const price = WorkPrice.create(1000);

			expect(price.isOk()).toBe(true);
			if (price.isOk()) {
				const result = builder.withWorkPrice(price.value);
				expect(result).toBe(builder);
			}
		});
	});

	describe("withCreators", () => {
		it("should set creators", () => {
			const builder = WorkBuilder.create();
			const creators = WorkCreators.createEmpty();
			const result = builder.withCreators(creators);
			expect(result).toBe(builder);
		});
	});

	describe("withRating", () => {
		it("should set rating with all parameters", () => {
			const builder = WorkBuilder.create();
			const distribution = { 5: 10, 4: 5, 3: 3, 2: 1, 1: 1 };
			const result = builder.withRating(4.5, 20, 15, distribution);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toBe(builder);
			}
		});

		it("should set rating without optional parameters", () => {
			const builder = WorkBuilder.create();
			const result = builder.withRating(4.0, 10);

			expect(result.isOk()).toBe(true);
		});

		it("should reject invalid rating", () => {
			const builder = WorkBuilder.create();
			const result = builder.withRating(6.0, 10); // Rating > 5

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.field).toBe("rating");
				expect(result.error.message).toContain("Invalid");
			}
		});
	});

	describe("withWorkRating", () => {
		it("should set already validated WorkRating", () => {
			const builder = WorkBuilder.create();
			const rating = WorkRating.create(4.5, 100, 4.5);

			expect(rating.isOk()).toBe(true);
			if (rating.isOk()) {
				const result = builder.withWorkRating(rating.value);
				expect(result).toBe(builder);
			}
		});

		it("should set undefined rating", () => {
			const builder = WorkBuilder.create();
			const result = builder.withWorkRating(undefined);
			expect(result).toBe(builder);
		});
	});

	describe("withExtendedInfo", () => {
		it("should set extended info", () => {
			const builder = WorkBuilder.create();
			const extendedInfo = createMinimalExtendedInfo();
			const result = builder.withExtendedInfo(extendedInfo);
			expect(result).toBe(builder);
		});
	});

	describe("withMetadata", () => {
		it("should set metadata", () => {
			const builder = WorkBuilder.create();
			const metadata = createMinimalMetadata();
			const result = builder.withMetadata(metadata);
			expect(result).toBe(builder);
		});
	});

	describe("withSeriesInfo", () => {
		it("should set series info", () => {
			const builder = WorkBuilder.create();
			const seriesInfo: WorkSeriesInfo = {
				id: "SERIES001",
				name: "Test Series",
			};
			const result = builder.withSeriesInfo(seriesInfo);
			expect(result).toBe(builder);
		});
	});

	describe("withSalesStatus", () => {
		it("should set sales status", () => {
			const builder = WorkBuilder.create();
			const salesStatus: WorkSalesStatus = {
				isOnSale: true,
				isDiscounted: false,
				isFree: false,
				isSoldOut: false,
				isReserveWork: false,
				dlsiteplaySupported: true,
			};
			const result = builder.withSalesStatus(salesStatus);
			expect(result).toBe(builder);
		});
	});

	describe("withTranslationInfo", () => {
		it("should set translation info", () => {
			const builder = WorkBuilder.create();
			const translationInfo = {
				isTranslationAgree: true,
				isOriginal: false,
				originalWorkno: "RJ100000",
				lang: "en",
			};
			const result = builder.withTranslationInfo(translationInfo);
			expect(result).toBe(builder);
		});
	});

	describe("withLanguageDownloads", () => {
		it("should set language downloads", () => {
			const builder = WorkBuilder.create();
			const downloads = [
				{
					workno: "RJ123456",
					label: "English",
					lang: "en",
					dlCount: "100",
				},
			];
			const result = builder.withLanguageDownloads(downloads);
			expect(result).toBe(builder);
		});
	});

	describe("build", () => {
		it("should build Work with all required fields", () => {
			const builder = WorkBuilder.create();

			// Set all required fields
			builder.withId("RJ123456");
			builder.withTitle("Test Title");
			builder.withCircle("RG12345", "Test Circle");
			builder.withCategory("SOU");
			builder.withPrice(1000);
			builder.withExtendedInfo(createMinimalExtendedInfo());
			builder.withMetadata(createMinimalMetadata());

			const result = builder.build();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const work = result.value;
				expect(work.id.toString()).toBe("RJ123456");
				expect(work.title.toString()).toBe("Test Title");
				expect(work.circle.name).toBe("Test Circle");
				expect(work.category).toBe("SOU");
				expect(work.price.current).toBe(1000);
			}
		});

		it("should fail when missing work ID", () => {
			const builder = WorkBuilder.create();

			builder.withTitle("Test Title");
			builder.withCircle("RG12345", "Test Circle");
			builder.withCategory("SOU");
			builder.withPrice(1000);
			builder.withExtendedInfo(createMinimalExtendedInfo());
			builder.withMetadata(createMinimalMetadata());

			const result = builder.build();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.field).toBe("workId");
				expect(result.error.message).toContain("Work ID is required");
			}
		});

		it("should fail when missing title", () => {
			const builder = WorkBuilder.create();

			builder.withId("RJ123456");
			builder.withCircle("RG12345", "Test Circle");
			builder.withCategory("SOU");
			builder.withPrice(1000);
			builder.withExtendedInfo(createMinimalExtendedInfo());
			builder.withMetadata(createMinimalMetadata());

			const result = builder.build();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.field).toBe("title");
				expect(result.error.message).toContain("Title is required");
			}
		});

		it("should fail when missing circle", () => {
			const builder = WorkBuilder.create();

			builder.withId("RJ123456");
			builder.withTitle("Test Title");
			builder.withCategory("SOU");
			builder.withPrice(1000);
			builder.withExtendedInfo(createMinimalExtendedInfo());
			builder.withMetadata(createMinimalMetadata());

			const result = builder.build();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.field).toBe("circle");
				expect(result.error.message).toContain("Circle is required");
			}
		});

		it("should fail when missing category", () => {
			const builder = WorkBuilder.create();

			builder.withId("RJ123456");
			builder.withTitle("Test Title");
			builder.withCircle("RG12345", "Test Circle");
			builder.withPrice(1000);
			builder.withExtendedInfo(createMinimalExtendedInfo());
			builder.withMetadata(createMinimalMetadata());

			const result = builder.build();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.field).toBe("category");
				expect(result.error.message).toContain("Category is required");
			}
		});

		it("should fail when missing price", () => {
			const builder = WorkBuilder.create();

			builder.withId("RJ123456");
			builder.withTitle("Test Title");
			builder.withCircle("RG12345", "Test Circle");
			builder.withCategory("SOU");
			builder.withExtendedInfo(createMinimalExtendedInfo());
			builder.withMetadata(createMinimalMetadata());

			const result = builder.build();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.field).toBe("price");
				expect(result.error.message).toContain("Price is required");
			}
		});

		it("should fail when missing extended info", () => {
			const builder = WorkBuilder.create();

			builder.withId("RJ123456");
			builder.withTitle("Test Title");
			builder.withCircle("RG12345", "Test Circle");
			builder.withCategory("SOU");
			builder.withPrice(1000);
			builder.withMetadata(createMinimalMetadata());

			const result = builder.build();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.field).toBe("extendedInfo");
				expect(result.error.message).toContain("Extended info is required");
			}
		});

		it("should fail when missing metadata", () => {
			const builder = WorkBuilder.create();

			builder.withId("RJ123456");
			builder.withTitle("Test Title");
			builder.withCircle("RG12345", "Test Circle");
			builder.withCategory("SOU");
			builder.withPrice(1000);
			builder.withExtendedInfo(createMinimalExtendedInfo());

			const result = builder.build();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.field).toBe("metadata");
				expect(result.error.message).toContain("Metadata is required");
			}
		});

		it("should use empty creators when not provided", () => {
			const builder = WorkBuilder.create();

			builder.withId("RJ123456");
			builder.withTitle("Test Title");
			builder.withCircle("RG12345", "Test Circle");
			builder.withCategory("SOU");
			builder.withPrice(1000);
			builder.withExtendedInfo(createMinimalExtendedInfo());
			builder.withMetadata(createMinimalMetadata());

			const result = builder.build();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const work = result.value;
				const creators = work.creators;
				expect(creators.hasAnyCreators()).toBe(false);
			}
		});

		it("should build Work with all optional fields", () => {
			const builder = WorkBuilder.create();

			// Set required fields
			builder.withId("RJ123456");
			builder.withTitle("Test Title", "Test T***", "テストタイトル", "Alt Title");
			builder.withCircle("RG12345", "Test Circle", "Test Circle EN");
			builder.withCategory("SOU");
			builder.withPrice(1000, "JPY", 1200, 20, 100);
			builder.withExtendedInfo(createMinimalExtendedInfo());
			builder.withMetadata(createMinimalMetadata());

			// Set optional fields
			const creators = WorkCreators.create(
				[{ id: "VA001", name: "Voice Actor" }],
				[{ id: "SC001", name: "Scenario Writer" }],
				[{ id: "IL001", name: "Illustrator" }],
				[{ id: "MU001", name: "Musician" }],
				[{ id: "OT001", name: "Others" }],
			);
			expect(creators.isOk()).toBe(true);
			if (creators.isOk()) {
				builder.withCreators(creators.value);
			}

			const rating = WorkRating.create(4.5, 100, 4.52, 50, { 5: 60, 4: 30, 3: 10 });
			expect(rating.isOk()).toBe(true);
			if (rating.isOk()) {
				builder.withWorkRating(rating.value);
			}

			builder.withSeriesInfo({ id: "SERIES001", name: "Test Series" });
			builder.withSalesStatus({
				isOnSale: true,
				isDiscounted: true,
				isFree: false,
				isSoldOut: false,
				isReserveWork: false,
				dlsiteplaySupported: true,
			});
			builder.withTranslationInfo({
				isTranslationAgree: true,
				isOriginal: false,
				originalWorkno: "RJ100000",
				lang: "en",
			});
			builder.withLanguageDownloads([
				{
					workno: "RJ123456",
					label: "English",
					lang: "en",
					dlCount: "100",
				},
			]);

			const result = builder.build();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const work = result.value;

				// Check all properties were set
				expect(work.title.getMasked()).toBe("Test T***");
				expect(work.title.getKana()).toBe("テストタイトル");
				expect(work.title.getAltName()).toBe("Alt Title");
				expect(work.circle.nameEn).toBe("Test Circle EN");
				expect(work.price.original).toBe(1200);
				expect(work.price.discount).toBe(20);
				expect(work.price.point).toBe(100);

				expect(work.creators.hasAnyCreators()).toBe(true);
				expect(work.rating).toBeDefined();
				expect(work.seriesInfo).toBeDefined();
				expect(work.salesStatus).toBeDefined();
			}
		});
	});

	describe("Method chaining", () => {
		it("should support fluent interface pattern", () => {
			const workIdResult = WorkId.create("RJ123456");
			const titleResult = WorkTitle.create("Test Title");
			const circleResult = Circle.create("RG12345", "Test Circle");
			const priceResult = WorkPrice.create(1000);

			expect(workIdResult.isOk()).toBe(true);
			expect(titleResult.isOk()).toBe(true);
			expect(circleResult.isOk()).toBe(true);
			expect(priceResult.isOk()).toBe(true);

			if (workIdResult.isOk() && titleResult.isOk() && circleResult.isOk() && priceResult.isOk()) {
				const result = WorkBuilder.create()
					.withWorkId(workIdResult.value)
					.withWorkTitle(titleResult.value)
					.withCircleObject(circleResult.value)
					.withCategory("SOU")
					.withWorkPrice(priceResult.value)
					.withExtendedInfo(createMinimalExtendedInfo())
					.withMetadata(createMinimalMetadata())
					.build();

				expect(result.isOk()).toBe(true);
				if (result.isOk()) {
					const work = result.value;
					expect(work.id.toString()).toBe("RJ123456");
					expect(work.title.toString()).toBe("Test Title");
					expect(work.circle.name).toBe("Test Circle");
					expect(work.category).toBe("SOU");
					expect(work.price.current).toBe(1000);
				}
			}
		});
	});
});
