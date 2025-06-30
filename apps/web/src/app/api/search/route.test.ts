import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// Mock the search functions
vi.mock("@/app/actions", () => ({
	searchAudioButtons: vi.fn(),
	searchVideos: vi.fn(),
	searchWorks: vi.fn(),
}));

import { searchAudioButtons, searchVideos, searchWorks } from "@/app/actions";

// Mock NextRequest
class MockRequest {
	url: string;
	constructor(url: string) {
		this.url = url;
	}
}

describe("/api/search Route Handler", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// デフォルトのモック値を設定
		(searchAudioButtons as any).mockResolvedValue({
			audioButtons: [],
			totalCount: 0,
			hasMore: false,
		});
		(searchVideos as any).mockResolvedValue([]);
		(searchWorks as any).mockResolvedValue([]);
	});

	describe("GET /api/search", () => {
		it("統合検索が正常に実行される（type=all）", async () => {
			const request = new MockRequest("http://localhost:3000/api/search?q=test") as any;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data).toHaveProperty("audioButtons");
			expect(data).toHaveProperty("videos");
			expect(data).toHaveProperty("works");
			expect(data).toHaveProperty("totalCount");
			expect(data).toHaveProperty("hasMore");
		});

		it("検索クエリが空の場合400エラーを返す", async () => {
			const request = new MockRequest("http://localhost:3000/api/search?q=") as any;

			const response = await GET(request);

			expect(response.status).toBe(400);
		});

		it("検索クエリがない場合400エラーを返す", async () => {
			const request = new MockRequest("http://localhost:3000/api/search") as any;

			const response = await GET(request);

			expect(response.status).toBe(400);
		});

		it("type=buttonsの場合、音声ボタンのみ検索される", async () => {
			const request = new MockRequest(
				"http://localhost:3000/api/search?q=test&type=buttons",
			) as any;

			await GET(request);

			expect(searchAudioButtons).toHaveBeenCalled();
			expect(searchVideos).not.toHaveBeenCalled();
			expect(searchWorks).not.toHaveBeenCalled();
		});

		it("type=videosの場合、動画のみ検索される", async () => {
			const request = new MockRequest("http://localhost:3000/api/search?q=test&type=videos") as any;

			await GET(request);

			expect(searchAudioButtons).not.toHaveBeenCalled();
			expect(searchVideos).toHaveBeenCalled();
			expect(searchWorks).not.toHaveBeenCalled();
		});

		it("type=worksの場合、作品のみ検索される", async () => {
			const request = new MockRequest("http://localhost:3000/api/search?q=test&type=works") as any;

			await GET(request);

			expect(searchAudioButtons).not.toHaveBeenCalled();
			expect(searchVideos).not.toHaveBeenCalled();
			expect(searchWorks).toHaveBeenCalled();
		});

		it("limitパラメータが正しく処理される", async () => {
			const request = new MockRequest("http://localhost:3000/api/search?q=test&limit=20") as any;

			const response = await GET(request);

			expect(response.status).toBe(200);
			expect(searchAudioButtons).toHaveBeenCalledWith(expect.objectContaining({ limit: 6 }));
		});

		it("URLエンコードされた日本語クエリが正しく処理される", async () => {
			const encodedQuery = encodeURIComponent("涼花みなせ");
			const request = new MockRequest(`http://localhost:3000/api/search?q=${encodedQuery}`) as any;

			const response = await GET(request);

			expect(response.status).toBe(200);
			expect(searchAudioButtons).toHaveBeenCalledWith(
				expect.objectContaining({ searchText: "涼花みなせ" }),
			);
		});

		it("検索エラーが発生した場合でも結果を返す", async () => {
			(searchAudioButtons as any).mockRejectedValue(new Error("Search error"));

			const request = new MockRequest("http://localhost:3000/api/search?q=test") as any;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.audioButtons).toEqual([]);
		});

		it("無効なtypeパラメータでもエラーにならない", async () => {
			const request = new MockRequest(
				"http://localhost:3000/api/search?q=test&type=invalid",
			) as any;

			const response = await GET(request);

			// 無効なtypeパラメータでも最低限200レスポンスを返す
			expect(response.status).toBe(200);
		});
	});
});
