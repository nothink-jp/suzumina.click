import { describe, expect, it } from "vitest";
import type { WorkDocument } from "../work-document-schema";
import { createWorkFromFirestoreData, WorkFactory } from "../work-factory";

describe("Work Factory", () => {
	// Minimal valid WorkDocument
	const createMinimalWorkDocument = (): WorkDocument => ({
		id: "RJ123456",
		productId: "RJ123456",
		title: "Test Work",
		circle: "Test Circle",
		description: "Test description",
		category: "SOU",
		workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ123456.html",
		thumbnailUrl: "https://img.dlsite.jp/modpub/images2/work/doujin/RJ124000/RJ123456_img_main.jpg",
		price: {
			current: 1000,
			currency: "JPY",
		},
		genres: [],
		customGenres: [],
		sampleImages: [],
		lastFetchedAt: "2024-01-01T00:00:00Z",
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
	});

	describe("createWorkFromFirestoreData", () => {
		it("should create Work from minimal valid data", () => {
			const data = createMinimalWorkDocument();
			const result = createWorkFromFirestoreData(data);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const work = result.value;
				expect(work.id.toString()).toBe("RJ123456");
				expect(work.title.toString()).toBe("Test Work");
				expect(work.circle.name).toBe("Test Circle");
				expect(work.category).toBe("SOU");
				expect(work.price.current).toBe(1000);
			}
		});

		it("should handle missing required fields", () => {
			const data = { ...createMinimalWorkDocument(), productId: "" };
			const result = createWorkFromFirestoreData(data);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.type).toBe("DatabaseError");
				expect(result.error.detail).toContain("Missing required fields");
			}
		});

		it("should handle complete data with all optional fields", () => {
			const data: WorkDocument = {
				...createMinimalWorkDocument(),
				circleId: "RG12345",
				circleEn: "Test Circle EN",
				titleMasked: "Test W***",
				titleKana: "テストワーク",
				altName: "Alternative Title",
				rating: {
					stars: 4.5,
					count: 100,
					reviewCount: 50,
					averageDecimal: 4.52,
					ratingDetail: [
						{ review_point: 5, count: 60, ratio: 60 },
						{ review_point: 4, count: 30, ratio: 30 },
						{ review_point: 3, count: 10, ratio: 10 },
					],
				},
				creators: {
					voice_by: [{ name: "Voice Actor", id: "VA001" }],
					scenario_by: [{ name: "Scenario Writer" }],
					illust_by: [{ name: "Illustrator", id: "IL001" }],
					music_by: [],
					others_by: [],
					created_by: [],
				},
				salesStatus: {
					isSale: true,
					isDiscount: true,
					isFree: false,
					dlsiteplayWork: true,
				},
				seriesId: "SERIES001",
				seriesName: "Test Series",
				genres: ["Action", "Adventure"],
				customGenres: [
					{ genre_key: "action", name: "アクション" },
					{ genre_key: "adventure", name: "アドベンチャー" },
				],
				sampleImages: [
					{ thumb: "https://example.com/sample1.jpg", width: 800, height: 600 },
					{ thumb: "https://example.com/sample2.jpg", width: 800, height: 600 },
				],
				translationInfo: {
					isTranslationAgree: true,
					isOriginal: false,
					originalWorkno: "RJ100000",
					lang: "en",
				},
				languageDownloads: [
					{
						workno: "RJ123456",
						label: "English",
						lang: "en",
						dlCount: "100",
						displayLabel: "English",
					},
				],
			};

			const result = createWorkFromFirestoreData(data);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const work = result.value;

				// Check basic properties
				expect(work.id.toString()).toBe("RJ123456");
				expect(work.title.getMasked()).toBe("Test W***");
				expect(work.title.getKana()).toBe("テストワーク");
				expect(work.title.getAltName()).toBe("Alternative Title");
				expect(work.circle.id).toBe("RG12345");
				expect(work.circle.nameEn).toBe("Test Circle EN");

				// Check rating
				expect(work.rating?.stars).toBe(4.5);
				expect(work.rating?.count).toBe(100);
				expect(work.rating?.reviewCount).toBe(50);

				// Check creators
				const creators = work.creators;
				expect(creators.voiceActors).toHaveLength(1);
				expect(creators.voiceActors[0]?.name).toBe("Voice Actor");
				expect(creators.scenario).toHaveLength(1);
				expect(creators.illustration).toHaveLength(1);

				// Check sales status
				const salesStatus = work.salesStatus;
				expect(salesStatus?.isOnSale).toBe(true);
				expect(salesStatus?.isDiscounted).toBe(true);
				expect(salesStatus?.dlsiteplaySupported).toBe(true);

				// Check series
				const series = work.seriesInfo;
				expect(series?.id).toBe("SERIES001");
				expect(series?.name).toBe("Test Series");

				// Check extended info
				const extendedInfo = work.extendedInfo;
				expect(extendedInfo.genres).toEqual(["Action", "Adventure"]);
				expect(extendedInfo.customGenres).toEqual(["アクション", "アドベンチャー"]);
				expect(extendedInfo.sampleImages).toHaveLength(2);
			}
		});

		it("should handle creators with missing IDs", () => {
			const data: WorkDocument = {
				...createMinimalWorkDocument(),
				creators: {
					voice_by: [{ name: "Voice Actor" }], // No ID
					scenario_by: [{ name: "Scenario Writer", id: undefined }], // Undefined ID
					illust_by: [],
					music_by: [],
					others_by: [],
					created_by: [],
				},
			};

			const result = createWorkFromFirestoreData(data);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const work = result.value;
				const creators = work.creators;

				// Should use "UNKNOWN" for missing IDs
				expect(creators.voiceActors[0]?.id).toBe("UNKNOWN");
				expect(creators.voiceActors[0]?.name).toBe("Voice Actor");
				expect(creators.scenario[0]?.id).toBe("UNKNOWN");
				expect(creators.scenario[0]?.name).toBe("Scenario Writer");
			}
		});

		it("should handle rating detail conversion", () => {
			const data: WorkDocument = {
				...createMinimalWorkDocument(),
				rating: {
					stars: 4.0,
					count: 10,
					ratingDetail: [
						{ review_point: 5, count: 5, ratio: 50 },
						{ review_point: 4, count: 3, ratio: 30 },
						{ review_point: 3, count: 2, ratio: 20 },
					],
				},
			};

			const result = createWorkFromFirestoreData(data);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const work = result.value;
				const rating = work.rating;

				expect(rating).toBeDefined();
				if (rating) {
					// Check if distribution was properly converted
					const distribution = rating.distribution;
					expect(distribution).toBeDefined();
					if (distribution) {
						expect(distribution[5]).toBe(5);
						expect(distribution[4]).toBe(3);
						expect(distribution[3]).toBe(2);
					}
				}
			}
		});

		it("should handle dates properly", () => {
			const data: WorkDocument = {
				...createMinimalWorkDocument(),
				registDate: "2023-01-01",
				updateDate: "2023-06-01",
				releaseDate: "2023-01-01",
				lastFetchedAt: "2024-01-01T12:00:00Z",
			};

			const result = createWorkFromFirestoreData(data);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const work = result.value;
				const metadata = work.metadata;

				expect(metadata.registDate).toBeInstanceOf(Date);
				expect(metadata.updateDate).toBeInstanceOf(Date);
				expect(metadata.releaseDate).toBeInstanceOf(Date);
				expect(metadata.lastFetchedAt).toBeInstanceOf(Date);
			}
		});

		it("should handle Firestore Timestamp objects", () => {
			const firestoreTimestamp = {
				toDate: () => new Date("2024-01-01T00:00:00Z"),
			};

			const data: WorkDocument = {
				...createMinimalWorkDocument(),
				createdAt: firestoreTimestamp as any,
				updatedAt: firestoreTimestamp as any,
			};

			const result = createWorkFromFirestoreData(data);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const work = result.value;
				const metadata = work.metadata;

				expect(metadata.createdAt).toBeInstanceOf(Date);
				expect(metadata.updatedAt).toBeInstanceOf(Date);
				expect(metadata.createdAt.toISOString()).toBe("2024-01-01T00:00:00.000Z");
			}
		});

		it("should handle invalid Work ID", () => {
			const data: WorkDocument = {
				...createMinimalWorkDocument(),
				productId: "INVALID_ID", // Not matching RJ/RE/BJ/VJ pattern
			};

			const result = createWorkFromFirestoreData(data);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.type).toBe("DatabaseError");
				expect(result.error.operation).toBe("INVALID_DATA");
			}
		});

		it("should handle invalid price data", () => {
			const data: WorkDocument = {
				...createMinimalWorkDocument(),
				price: {
					current: -100, // Negative price
					currency: "JPY",
				},
			};

			const result = createWorkFromFirestoreData(data);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.type).toBe("DatabaseError");
				expect(result.error.detail).toContain("Invalid price");
			}
		});

		it("should handle error in try-catch", () => {
			// Pass null to trigger an error
			const result = createWorkFromFirestoreData(null as any);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.type).toBe("DatabaseError");
				expect(result.error.operation).toBe("CONVERSION_ERROR");
				expect(result.error.detail).toContain("Failed to create Work from Firestore data");
			}
		});
	});

	describe("WorkFactory legacy export", () => {
		it("should expose fromFirestoreData method", () => {
			expect(WorkFactory).toBeDefined();
			expect(WorkFactory.fromFirestoreData).toBeDefined();
			expect(WorkFactory.fromFirestoreData).toBe(createWorkFromFirestoreData);
		});

		it("should work through WorkFactory export", () => {
			const data = createMinimalWorkDocument();
			const result = WorkFactory.fromFirestoreData(data);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const work = result.value;
				expect(work.id.toString()).toBe("RJ123456");
			}
		});
	});
});
