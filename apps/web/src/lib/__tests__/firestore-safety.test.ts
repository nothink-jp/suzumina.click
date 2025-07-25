import { describe, expect, it } from "vitest";
import {
	validateFirestoreData,
	validateFirestoreWrite,
	validateStringField,
	validateUrl,
} from "../firestore-safety";

describe("firestore-safety", () => {
	describe("validateUrl", () => {
		it("should accept valid YouTube URLs", () => {
			const urls = [
				"https://www.youtube.com/watch?v=abc",
				"https://youtube.com/channel/123",
				"https://img.youtube.com/vi/12345678901/hqdefault.jpg",
				"https://i.ytimg.com/vi/abc/maxresdefault.jpg",
			];

			urls.forEach((url) => {
				const result = validateUrl(url, "thumbnailUrl");
				expect(result.valid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});
		});

		it("should reject invalid image URLs", () => {
			const urls = ["thumb.jpg", "thumb1.jpg", "test.png", "image.gif"];

			urls.forEach((url) => {
				const result = validateUrl(url, "thumbnailUrl");
				expect(result.valid).toBe(false);
				expect(result.errors[0]).toContain("Invalid URL format");
			});
		});

		it("should reject local file paths", () => {
			const urls = [
				"C:\\Users\\test\\image.jpg",
				"/Users/test/Desktop/image.png",
				"./images/test.jpg",
				"~/Documents/test.png",
				"file:///Users/test/image.jpg",
			];

			urls.forEach((url) => {
				const result = validateUrl(url, "imageUrl");
				expect(result.valid).toBe(false);
				expect(result.errors.some((e) => e.includes("Local file path"))).toBe(true);
			});
		});

		it("should reject development URLs", () => {
			const urls = [
				"http://localhost:3000/image.jpg",
				"https://127.0.0.1/test.png",
				"http://192.168.1.1/image.jpg",
				"https://test.local/image.png",
			];

			urls.forEach((url) => {
				const result = validateUrl(url, "imageUrl");
				expect(result.valid).toBe(false);
				expect(result.errors.some((e) => e.includes("Development URL"))).toBe(true);
			});
		});
	});

	describe("validateStringField", () => {
		it("should validate YouTube video IDs", () => {
			const validIds = ["abc123DEF-_", "12345678901"];
			const invalidIds = ["abc", "12345678901234567890", "abc@123", "vid1"];

			validIds.forEach((id) => {
				const result = validateStringField(id, "videoId", {
					minLength: 11,
					maxLength: 11,
					pattern: /^[a-zA-Z0-9_-]{11}$/,
				});
				expect(result.valid).toBe(true);
			});

			invalidIds.forEach((id) => {
				const result = validateStringField(id, "videoId", {
					minLength: 11,
					maxLength: 11,
					pattern: /^[a-zA-Z0-9_-]{11}$/,
				});
				expect(result.valid).toBe(false);
			});
		});

		it("should detect file paths in strings", () => {
			const stringsWithPaths = [
				"Check this file: /Users/test/doc.pdf",
				"Located at C:\\Windows\\System32",
				"~/Documents/test.txt",
			];

			stringsWithPaths.forEach((str) => {
				const result = validateStringField(str, "description");
				expect(result.valid).toBe(false);
				expect(result.errors.some((e) => e.includes("Contains file path"))).toBe(true);
			});
		});
	});

	describe("validateFirestoreData", () => {
		it("should validate video documents", () => {
			const validVideo = {
				videoId: "abc123DEF-_",
				title: "Test Video",
				thumbnailUrl: "https://img.youtube.com/vi/abc123DEF-_/hqdefault.jpg",
			};

			const result = validateFirestoreData("videos", validVideo);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject invalid video documents", () => {
			const invalidVideo = {
				videoId: "vid1",
				title: "Test Video /Users/test/file.txt",
				thumbnailUrl: "thumb1.jpg",
			};

			const result = validateFirestoreData("videos", invalidVideo);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors.some((e) => e.includes("videoId"))).toBe(true);
			expect(result.errors.some((e) => e.includes("thumbnailUrl"))).toBe(true);
			expect(result.errors.some((e) => e.includes("title"))).toBe(true);
		});

		it("should validate dlsite work documents", () => {
			const validWork = {
				id: "RJ123456",
				title: "Test Work",
				thumbnailUrl:
					"https://img.dlsite.jp/modpub/images2/work/doujin/RJ123000/RJ123456_img_main.jpg",
				workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ123456.html",
			};

			const result = validateFirestoreData("dlsiteWorks", validWork);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe("validateFirestoreWrite", () => {
		it("should allow valid writes", () => {
			const result = validateFirestoreWrite("videos", "abc123DEF-_", {
				videoId: "abc123DEF-_",
				title: "Valid Video",
				thumbnailUrl: "https://img.youtube.com/vi/abc123DEF-_/hqdefault.jpg",
			});

			expect(result.allowed).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should block writes with invalid data", () => {
			const result = validateFirestoreWrite("videos", "vid1", {
				videoId: "vid1",
				title: "Test",
				thumbnailUrl: "thumb1.jpg",
			});

			expect(result.allowed).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should block writes with local file paths", () => {
			const result = validateFirestoreWrite("videos", "test123", {
				title: "Video at /Users/test/video.mp4",
				thumbnailUrl: "https://youtube.com/test.jpg",
			});

			expect(result.allowed).toBe(false);
			expect(result.errors.some((e) => e.includes("file path"))).toBe(true);
		});
	});
});
