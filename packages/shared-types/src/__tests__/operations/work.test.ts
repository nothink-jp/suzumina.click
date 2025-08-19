/**
 * Work Operations Tests
 */

import { describe, expect, it } from "vitest";
import {
	calculatePopularityScore,
	getAllTags,
	getSearchableText,
	hasDiscount,
	isAdultContent,
	isGameWork,
	isMangaWork,
	isNewRelease,
	isPopular,
	isVoiceWork,
	workOperations,
} from "../../operations/work";
import type { WorkPlainObject } from "../../plain-objects/work-plain";

// Mock work data
const createMockWork = (overrides?: Partial<WorkPlainObject>): WorkPlainObject => ({
	id: "test-id",
	productId: "RJ123456",
	baseProductId: undefined,
	title: "Test Work",
	titleMasked: undefined,
	titleKana: "テストワーク",
	altName: undefined,
	circle: "Test Circle",
	circleId: "RG12345",
	circleEn: undefined,
	description: "Test description",
	category: "SOU",
	originalCategoryText: undefined,
	workUrl: "https://example.com/work",
	thumbnailUrl: "https://example.com/thumb.jpg",
	highResImageUrl: undefined,
	price: {
		current: 1000,
		original: 1500,
		currency: "JPY",
		discount: 33,
		point: undefined,
		isFree: false,
		isDiscounted: true,
		formattedPrice: "¥1,000",
	},
	rating: {
		stars: 4.5,
		count: 100,
		average: 4.5,
		reviewCount: 50,
		distribution: undefined,
		hasRatings: true,
		isHighlyRated: true,
		reliability: "high",
		formattedRating: "★4.5",
	},
	creators: {
		voiceActors: [{ id: "va1", name: "Voice Actor 1" }],
		scenario: [],
		illustration: [],
		music: [],
		others: [],
		voiceActorNames: ["Voice Actor 1"],
		scenarioNames: [],
		illustrationNames: [],
		musicNames: [],
		otherNames: [],
	},
	series: undefined,
	salesStatus: {
		isOnSale: true,
		isDiscounted: true,
		isFree: false,
		isSoldOut: false,
		isReserveWork: false,
		dlsiteplaySupported: false,
	},
	ageRating: "全年齢",
	ageCategory: 1,
	ageCategoryString: "全年齢",
	workType: "SOU",
	workTypeString: "音声・ASMR",
	workFormat: undefined,
	fileFormat: undefined,
	fileType: undefined,
	fileTypeString: undefined,
	fileSize: undefined,
	genres: ["ASMR", "癒し"],
	customGenres: ["バイノーラル"],
	sampleImages: [],
	registDate: undefined,
	updateDate: undefined,
	releaseDate: new Date().toISOString(),
	releaseDateISO: new Date().toISOString(),
	releaseDateDisplay: new Date().toLocaleDateString(),
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	lastFetchedAt: new Date().toISOString(),
	translationInfo: undefined,
	languageDownloads: undefined,
	_computed: {
		displayTitle: "Test Work",
		displayCircle: "Test Circle",
		displayCategory: "音声・ASMR",
		displayAgeRating: "全年齢",
		displayReleaseDate: new Date().toLocaleDateString(),
		relativeUrl: "/works/RJ123456",
		isAdultContent: false,
		isVoiceWork: true,
		isGameWork: false,
		isMangaWork: false,
		hasDiscount: true,
		isNewRelease: true,
		isPopular: true,
		primaryLanguage: "JPN",
		availableLanguages: ["JPN"],
		searchableText: "test work テストワーク test circle test description asmr 癒し",
		tags: ["ASMR", "癒し", "バイノーラル"],
	},
	...overrides,
});

describe("Work Operations", () => {
	describe("isAdultContent", () => {
		it("should return true for adult content", () => {
			const work = createMockWork({
				ageRating: "R18",
				ageCategory: 3,
			});
			expect(isAdultContent(work)).toBe(true);
		});

		it("should return false for all-ages content", () => {
			const work = createMockWork();
			expect(isAdultContent(work)).toBe(false);
		});
	});

	describe("isVoiceWork", () => {
		it("should return true for voice works", () => {
			const work = createMockWork({ category: "SOU" });
			expect(isVoiceWork(work)).toBe(true);
		});

		it("should return false for non-voice works", () => {
			const work = createMockWork({ category: "GAM", workType: "GAM" });
			expect(isVoiceWork(work)).toBe(false);
		});
	});

	describe("isGameWork", () => {
		it("should return true for game works", () => {
			const work = createMockWork({ category: "GAM", workType: "GAM" });
			expect(isGameWork(work)).toBe(true);
		});

		it("should return false for non-game works", () => {
			const work = createMockWork();
			expect(isGameWork(work)).toBe(false);
		});
	});

	describe("isMangaWork", () => {
		it("should return true for manga works", () => {
			const work = createMockWork({ category: "MNG", workType: "MNG" });
			expect(isMangaWork(work)).toBe(true);
		});

		it("should return false for non-manga works", () => {
			const work = createMockWork();
			expect(isMangaWork(work)).toBe(false);
		});
	});

	describe("isNewRelease", () => {
		it("should return true for recent releases", () => {
			const work = createMockWork({
				releaseDate: new Date().toISOString(),
			});
			expect(isNewRelease(work)).toBe(true);
		});

		it("should return false for old releases", () => {
			const oldDate = new Date();
			oldDate.setDate(oldDate.getDate() - 60);
			const work = createMockWork({
				releaseDate: oldDate.toISOString(),
			});
			expect(isNewRelease(work)).toBe(false);
		});
	});

	describe("isPopular", () => {
		it("should return true for popular works", () => {
			const work = createMockWork({
				rating: {
					stars: 4.5,
					count: 150,
					average: 4.5,
					reviewCount: 100,
					distribution: undefined,
					hasRatings: true,
					isHighlyRated: true,
					reliability: "high",
					formattedRating: "★4.5",
				},
			});
			expect(isPopular(work)).toBe(true);
		});

		it("should return false for unpopular works", () => {
			const work = createMockWork({
				rating: {
					stars: 3.0,
					count: 10,
					average: 3.0,
					reviewCount: 5,
					distribution: undefined,
					hasRatings: true,
					isHighlyRated: false,
					reliability: "low",
					formattedRating: "★3.0",
				},
			});
			expect(isPopular(work)).toBe(false);
		});
	});

	describe("hasDiscount", () => {
		it("should return true for discounted works", () => {
			const work = createMockWork();
			expect(hasDiscount(work)).toBe(true);
		});

		it("should return false for non-discounted works", () => {
			const work = createMockWork({
				price: {
					current: 1000,
					original: 1000,
					currency: "JPY",
					discount: undefined,
					point: undefined,
					isFree: false,
					isDiscounted: false,
					formattedPrice: "¥1,000",
				},
				salesStatus: {
					isOnSale: true,
					isDiscounted: false,
					isFree: false,
					isSoldOut: false,
					isReserveWork: false,
					dlsiteplaySupported: false,
				},
			});
			expect(hasDiscount(work)).toBe(false);
		});
	});

	describe("getSearchableText", () => {
		it("should combine all searchable fields", () => {
			const work = createMockWork();
			const searchText = getSearchableText(work);
			expect(searchText).toContain("test work");
			expect(searchText).toContain("test circle");
			expect(searchText).toContain("test description");
			expect(searchText).toContain("asmr");
		});
	});

	describe("getAllTags", () => {
		it("should include genres and category tags", () => {
			const work = createMockWork();
			const tags = getAllTags(work);
			expect(tags).toContain("ASMR");
			expect(tags).toContain("癒し");
			expect(tags).toContain("バイノーラル");
			expect(tags).toContain("音声作品");
			expect(tags).toContain("新作");
			expect(tags).toContain("割引中");
		});
	});

	describe("calculatePopularityScore", () => {
		it("should calculate high score for popular new releases", () => {
			const work = createMockWork();
			const score = calculatePopularityScore(work);
			expect(score).toBeGreaterThan(70);
			expect(score).toBeLessThanOrEqual(100);
		});

		it("should calculate low score for old unpopular works", () => {
			const oldDate = new Date();
			oldDate.setDate(oldDate.getDate() - 365);
			const work = createMockWork({
				releaseDate: oldDate.toISOString(),
				rating: undefined,
				salesStatus: {
					isOnSale: true,
					isDiscounted: false,
					isFree: false,
					isSoldOut: false,
					isReserveWork: false,
					dlsiteplaySupported: false,
				},
			});
			const score = calculatePopularityScore(work);
			expect(score).toBeLessThan(30);
		});
	});

	describe("workOperations namespace", () => {
		it("should export all functions", () => {
			expect(workOperations.isAdultContent).toBe(isAdultContent);
			expect(workOperations.isVoiceWork).toBe(isVoiceWork);
			expect(workOperations.isGameWork).toBe(isGameWork);
			expect(workOperations.isMangaWork).toBe(isMangaWork);
			expect(workOperations.isNewRelease).toBe(isNewRelease);
			expect(workOperations.isPopular).toBe(isPopular);
			expect(workOperations.hasDiscount).toBe(hasDiscount);
			expect(workOperations.getSearchableText).toBe(getSearchableText);
			expect(workOperations.getAllTags).toBe(getAllTags);
			expect(workOperations.calculatePopularityScore).toBe(calculatePopularityScore);
		});
	});
});
