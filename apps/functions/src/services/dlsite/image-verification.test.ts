/**
 * 画像検証機能のテスト
 */

import { beforeEach, describe, expect, it, type MockedFunction, vi } from "vitest";
import {
	extractOriginalProductIdFromImageUrl,
	verifyAndGetHighResImageUrl,
	verifyTranslationWorkImage,
} from "./image-verification";

// fetchをモック
global.fetch = vi.fn();
const mockFetch = fetch as MockedFunction<typeof fetch>;

describe("画像検証機能", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("extractOriginalProductIdFromImageUrl", () => {
		it("翻訳作品の元作品IDを正しく抽出する", () => {
			const url =
				"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01395000/RJ01394199_img_main.webp";
			const result = extractOriginalProductIdFromImageUrl(url);
			expect(result).toBe("RJ01394199");
		});

		it("通常の作品URLでは同じIDを返す", () => {
			const url =
				"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01415000/RJ01415251_img_main.webp";
			const result = extractOriginalProductIdFromImageUrl(url);
			expect(result).toBe("RJ01415251");
		});

		it("不正なURLではundefinedを返す", () => {
			const url = "https://example.com/invalid_url.jpg";
			const result = extractOriginalProductIdFromImageUrl(url);
			expect(result).toBeUndefined();
		});
	});

	describe("verifyAndGetHighResImageUrl", () => {
		it("抽出されたURLが存在する場合は最優先で返す", async () => {
			const extractedUrl =
				"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01395000/RJ01394199_img_main.webp";

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			} as Response);

			const result = await verifyAndGetHighResImageUrl("RJ01415251", extractedUrl);

			expect(result.verifiedUrl).toBe(extractedUrl);
			expect(result.method).toBe("extracted");
			expect(mockFetch).toHaveBeenCalledWith(
				extractedUrl,
				expect.objectContaining({
					method: "HEAD",
				}),
			);
		});

		it("構築されたURLが存在する場合はそれを返す", async () => {
			const productId = "RJ01415251";

			// 構築されたWebPが存在する
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			} as Response);

			const result = await verifyAndGetHighResImageUrl(productId);

			expect(result.verifiedUrl).toContain("RJ01416000/RJ01415251_img_main.webp");
			expect(result.method).toBe("constructed");
		});

		it("フォールバックURLが使用される", async () => {
			const productId = "RJ01415251";

			// 最初の2つのURL（WebP、JPG）は存在しない
			mockFetch
				.mockResolvedValueOnce({ ok: false, status: 404 } as Response)
				.mockResolvedValueOnce({ ok: false, status: 404 } as Response)
				.mockResolvedValueOnce({ ok: true, status: 200 } as Response);

			const result = await verifyAndGetHighResImageUrl(productId);

			expect(result.verifiedUrl).toContain("RJ01416000/RJ01415251_img_main.jpeg");
			expect(result.method).toBe("fallback");
		});

		it("すべてのURLが存在しない場合は失敗を返す", async () => {
			const productId = "RJ01415251";

			// すべてのURLが存在しない
			mockFetch.mockResolvedValue({
				ok: false,
				status: 404,
			} as Response);

			const result = await verifyAndGetHighResImageUrl(productId);

			expect(result.verifiedUrl).toBeUndefined();
			expect(result.method).toBe("failed");
			expect(result.attemptedUrls.length).toBeGreaterThan(0);
		});
	});

	describe("verifyTranslationWorkImage", () => {
		it("翻訳作品で元作品の画像URLを検証する", async () => {
			const translationId = "RJ01415251";
			const extractedUrl =
				"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01395000/RJ01394199_img_main.webp";

			// 翻訳作品のURLは存在しない
			// 翻訳作品のURLはすべて存在しない（新しい代替URLも含めて）
			mockFetch
				.mockResolvedValueOnce({ ok: false, status: 404 } as Response) // extracted URL
				.mockResolvedValueOnce({ ok: false, status: 404 } as Response) // WebP
				.mockResolvedValueOnce({ ok: false, status: 404 } as Response) // JPG
				.mockResolvedValueOnce({ ok: false, status: 404 } as Response) // JPEG
				.mockResolvedValueOnce({ ok: false, status: 404 } as Response) // PNG
				.mockResolvedValueOnce({ ok: false, status: 404 } as Response) // resize版
				.mockResolvedValueOnce({ ok: false, status: 404 } as Response) // thumbnail版
				.mockResolvedValueOnce({ ok: false, status: 404 } as Response) // img_smp1.jpg
				.mockResolvedValueOnce({ ok: false, status: 404 } as Response) // img_sam.jpg
				// 元作品検証: 最初の抽出されたURLが成功する
				.mockResolvedValueOnce({ ok: true, status: 200 } as Response);

			const result = await verifyTranslationWorkImage(translationId, extractedUrl);

			// 元作品の候補URLでJPGが見つかる
			expect(result.verifiedUrl).toBe(
				"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01395000/RJ01394199_img_main.jpg",
			);
			expect(result.originalProductId).toBe("RJ01394199");
			expect(result.method).toBe("fallback");
		});

		it("通常作品では元作品検証をスキップする", async () => {
			const productId = "RJ01415251";

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			} as Response);

			const result = await verifyTranslationWorkImage(productId);

			expect(result.verifiedUrl).toContain("RJ01416000/RJ01415251_img_main.webp");
			expect(result.originalProductId).toBeUndefined();
			expect(result.method).toBe("constructed");
		});
	});

	describe("URL候補生成", () => {
		it("新形式の作品IDで正しいディレクトリが生成される", async () => {
			const productId = "RJ01415251";

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			} as Response);

			const result = await verifyAndGetHighResImageUrl(productId);

			expect(result.verifiedUrl).toContain("RJ01416000"); // 1000の倍数に切り上げ
		});

		it("旧形式の作品IDで正しいディレクトリが生成される", async () => {
			const productId = "RJ405712";

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			} as Response);

			const result = await verifyAndGetHighResImageUrl(productId);

			expect(result.verifiedUrl).toContain("RJ406000"); // 1000の倍数に切り上げ
		});
	});
});
