import { beforeEach, describe, expect, it, vi } from "vitest";

// Create mock functions that will be used consistently
const mockSearchAudioButtons = vi.fn();
const mockSearchVideos = vi.fn();
const mockSearchWorks = vi.fn();
const mockGetDateRangeFromPreset = vi.fn();

// Mock the actions before importing anything
vi.mock("@/app/actions", () => ({
	searchAudioButtons: mockSearchAudioButtons,
	searchVideos: mockSearchVideos,
	searchWorks: mockSearchWorks,
}));

// Mock the shared-types functions
vi.mock("@suzumina.click/shared-types", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@suzumina.click/shared-types")>();
	return {
		...actual,
		getDateRangeFromPreset: mockGetDateRangeFromPreset,
	};
});

// Import the route after mocks are set up
const { GET } = await import("./route");

// Mock NextRequest
class MockRequest {
	url: string;
	constructor(url: string) {
		this.url = url;
	}
}

describe("/api/search - フィルタリング機能", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Set up default mock responses
		mockGetDateRangeFromPreset.mockReturnValue({
			from: new Date("2024-01-01"),
			to: new Date("2024-01-02"),
		});

		mockSearchAudioButtons.mockResolvedValue({
			audioButtons: [],
			totalCount: 0,
			hasMore: false,
		});

		mockSearchVideos.mockResolvedValue([]);
		mockSearchWorks.mockResolvedValue([]);
	});

	it("should parse and pass filter parameters to searchAudioButtons", async () => {
		const url = new URL("http://localhost:3000/api/search");
		url.searchParams.set("q", "test");
		url.searchParams.set("type", "buttons");
		url.searchParams.set("sortBy", "popular");
		url.searchParams.set("playCountMin", "10");
		url.searchParams.set("playCountMax", "100");
		url.searchParams.set("likeCountMin", "5");
		url.searchParams.set("durationMin", "30");
		url.searchParams.set("durationMax", "120");
		url.searchParams.set("tags", "挨拶,応援");
		url.searchParams.set("tagMode", "all");

		const request = new MockRequest(url.toString()) as any;
		const response = await GET(request);

		expect(response.status).toBe(200);
		expect(mockSearchAudioButtons).toHaveBeenCalledWith({
			searchText: "test",
			limit: 10,
			onlyPublic: true,
			sortBy: "popular",
			tags: ["挨拶", "応援"],
			playCountMin: 10,
			playCountMax: 100,
			likeCountMin: 5,
			durationMin: 30,
			durationMax: 120,
			createdAfter: undefined,
			createdBefore: undefined,
			likeCountMax: undefined,
			favoriteCountMin: undefined,
			favoriteCountMax: undefined,
		});
	});

	it("should handle date range preset filters", async () => {
		const url = new URL("http://localhost:3000/api/search");
		url.searchParams.set("q", "test");
		url.searchParams.set("dateRange", "today");

		const request = new MockRequest(url.toString()) as any;
		const response = await GET(request);

		expect(response.status).toBe(200);
		expect(mockSearchAudioButtons).toHaveBeenCalledWith(
			expect.objectContaining({
				searchText: "test",
				createdAfter: expect.any(String),
				createdBefore: expect.any(String),
			}),
		);
	});

	it("should handle custom date range filters", async () => {
		const dateFrom = "2024-01-01T00:00:00.000Z";
		const dateTo = "2024-01-31T23:59:59.999Z";

		const url = new URL("http://localhost:3000/api/search");
		url.searchParams.set("q", "test");
		url.searchParams.set("dateFrom", dateFrom);
		url.searchParams.set("dateTo", dateTo);

		const request = new MockRequest(url.toString()) as any;
		const response = await GET(request);

		expect(response.status).toBe(200);
		expect(mockSearchAudioButtons).toHaveBeenCalledWith(
			expect.objectContaining({
				searchText: "test",
				createdAfter: dateFrom,
				createdBefore: dateTo,
			}),
		);
	});

	it("should handle relevance sort by mapping to newest", async () => {
		mockSearchAudioButtons.mockResolvedValue({
			audioButtons: [
				{
					id: "1",
					title: "Test Audio",
					playCount: 10,
					likeCount: 5,
					favoriteCount: 2,
				},
			],
			totalCount: 1,
			hasMore: false,
		});

		const url = new URL("http://localhost:3000/api/search");
		url.searchParams.set("q", "test");
		url.searchParams.set("sortBy", "relevance");

		const request = new MockRequest(url.toString()) as any;
		const response = await GET(request);

		expect(response.status).toBe(200);
		expect(mockSearchAudioButtons).toHaveBeenCalledWith(
			expect.objectContaining({
				sortBy: "relevance",
			}),
		);
	});

	it("should handle empty filter parameters gracefully", async () => {
		const url = new URL("http://localhost:3000/api/search");
		url.searchParams.set("q", "test");
		url.searchParams.set("playCountMin", "");
		url.searchParams.set("tags", "");

		const request = new MockRequest(url.toString()) as any;
		const response = await GET(request);

		expect(response.status).toBe(200);
		expect(mockSearchAudioButtons).toHaveBeenCalledWith(
			expect.objectContaining({
				searchText: "test",
				playCountMin: undefined,
				tags: [""], // Empty string split by comma becomes [""]
			}),
		);
	});

	it("should limit numeric filters to valid ranges", async () => {
		const url = new URL("http://localhost:3000/api/search");
		url.searchParams.set("q", "test");
		url.searchParams.set("type", "buttons"); // Specify buttons to get the full limit
		url.searchParams.set("limit", "100"); // Over max of 50

		const request = new MockRequest(url.toString()) as any;
		const response = await GET(request);

		expect(response.status).toBe(200);
		expect(mockSearchAudioButtons).toHaveBeenCalledWith(
			expect.objectContaining({
				limit: 50, // Should be capped at 50
			}),
		);
	});

	it("should not pass audio button filters for non-button searches", async () => {
		const url = new URL("http://localhost:3000/api/search");
		url.searchParams.set("q", "test");
		url.searchParams.set("type", "videos");
		url.searchParams.set("playCountMin", "10");

		const request = new MockRequest(url.toString()) as any;
		await GET(request);

		// searchAudioButtons should not be called for videos-only search
		expect(mockSearchAudioButtons).not.toHaveBeenCalled();
	});

	it("should handle multiple tag filters correctly", async () => {
		const url = new URL("http://localhost:3000/api/search");
		url.searchParams.set("q", "test");
		url.searchParams.set("tags", "挨拶,応援,感謝");
		url.searchParams.set("tagMode", "all");

		const request = new MockRequest(url.toString()) as any;
		await GET(request);

		expect(mockSearchAudioButtons).toHaveBeenCalledWith(
			expect.objectContaining({
				tags: ["挨拶", "応援", "感謝"],
			}),
		);
	});

	it("should return error for missing query parameter", async () => {
		const url = new URL("http://localhost:3000/api/search");
		// No 'q' parameter

		const request = new MockRequest(url.toString()) as any;
		const response = await GET(request);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBe("検索キーワードが指定されていません");
	});

	it("should return unified search results with filter counts", async () => {
		mockSearchAudioButtons.mockResolvedValue({
			audioButtons: [
				{ id: "1", title: "Audio 1" },
				{ id: "2", title: "Audio 2" },
			],
			totalCount: 2,
			hasMore: false,
		});

		// Provide 6+ items to trigger hasMore: true (since actualLimit = Math.min(10, 6) = 6)
		mockSearchVideos.mockResolvedValue([
			{ id: "v1", title: "Video 1" },
			{ id: "v2", title: "Video 2" },
			{ id: "v3", title: "Video 3" },
			{ id: "v4", title: "Video 4" },
			{ id: "v5", title: "Video 5" },
			{ id: "v6", title: "Video 6" },
		]);

		mockSearchWorks.mockResolvedValue([
			{ id: "w1", title: "Work 1" },
			{ id: "w2", title: "Work 2" },
			{ id: "w3", title: "Work 3" },
			{ id: "w4", title: "Work 4" },
			{ id: "w5", title: "Work 5" },
			{ id: "w6", title: "Work 6" },
		]);

		const url = new URL("http://localhost:3000/api/search");
		url.searchParams.set("q", "test");
		url.searchParams.set("playCountMin", "10");

		const request = new MockRequest(url.toString()) as any;
		const response = await GET(request);

		expect(response.status).toBe(200);
		const data = await response.json();

		expect(data).toEqual({
			audioButtons: [
				{ id: "1", title: "Audio 1" },
				{ id: "2", title: "Audio 2" },
			],
			videos: [
				{ id: "v1", title: "Video 1" },
				{ id: "v2", title: "Video 2" },
				{ id: "v3", title: "Video 3" },
				{ id: "v4", title: "Video 4" },
				{ id: "v5", title: "Video 5" },
				{ id: "v6", title: "Video 6" },
			],
			works: [
				{ id: "w1", title: "Work 1" },
				{ id: "w2", title: "Work 2" },
				{ id: "w3", title: "Work 3" },
				{ id: "w4", title: "Work 4" },
				{ id: "w5", title: "Work 5" },
				{ id: "w6", title: "Work 6" },
			],
			totalCount: {
				buttons: 2,
				videos: 6,
				works: 6,
			},
			hasMore: {
				buttons: false,
				videos: true, // 6 >= 6 = true
				works: true, // 6 >= 6 = true
			},
		});
	});
});
