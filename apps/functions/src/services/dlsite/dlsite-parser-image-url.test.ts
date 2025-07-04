import { describe, expect, it } from "vitest";
import { generateDLsiteImageDirectory } from "./dlsite-parser";

describe("generateDLsiteImageDirectory", () => {
	describe("新形式(8桁)", () => {
		it("RJ01413726 → RJ01414000", () => {
			const result = generateDLsiteImageDirectory("RJ01413726");
			expect(result).toBe("RJ01414000");
		});

		it("RJ01000000 → RJ01001000", () => {
			const result = generateDLsiteImageDirectory("RJ01000000");
			expect(result).toBe("RJ01001000");
		});

		it("RJ01999999 → RJ02000000", () => {
			const result = generateDLsiteImageDirectory("RJ01999999");
			expect(result).toBe("RJ02000000");
		});
	});

	describe("旧形式(6桁)", () => {
		it("RJ405712 → RJ406000 (問題のケース)", () => {
			const result = generateDLsiteImageDirectory("RJ405712");
			expect(result).toBe("RJ406000");
		});

		it("RJ236867 → RJ237000", () => {
			const result = generateDLsiteImageDirectory("RJ236867");
			expect(result).toBe("RJ237000");
		});

		it("RJ123456 → RJ124000", () => {
			const result = generateDLsiteImageDirectory("RJ123456");
			expect(result).toBe("RJ124000");
		});

		it("RJ999999 → RJ1000000 (境界値)", () => {
			const result = generateDLsiteImageDirectory("RJ999999");
			expect(result).toBe("RJ1000000");
		});

		it("RJ000001 → RJ001000", () => {
			const result = generateDLsiteImageDirectory("RJ000001");
			expect(result).toBe("RJ001000");
		});
	});

	describe("フォールバック", () => {
		it("異常な形式でもフォールバックが動作する", () => {
			const result = generateDLsiteImageDirectory("RJ12345");
			expect(result).toBe("RJ12000");
		});

		it("空文字列でもエラーにならない", () => {
			const result = generateDLsiteImageDirectory("RJ");
			expect(result).toBe("RJ000");
		});
	});

	describe("実際のユースケース", () => {
		it("完全なURLが正しく生成される（新形式）", () => {
			const directoryPath = generateDLsiteImageDirectory("RJ01413726");
			const fullUrl = `https://img.dlsite.jp/modpub/images2/work/doujin/${directoryPath}/RJ01413726_img_main.webp`;
			expect(fullUrl).toBe(
				"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01414000/RJ01413726_img_main.webp",
			);
		});

		it("完全なURLが正しく生成される（旧形式）", () => {
			const directoryPath = generateDLsiteImageDirectory("RJ405712");
			const fullUrl = `https://img.dlsite.jp/modpub/images2/work/doujin/${directoryPath}/RJ405712_img_main.webp`;
			expect(fullUrl).toBe(
				"https://img.dlsite.jp/modpub/images2/work/doujin/RJ406000/RJ405712_img_main.webp",
			);
		});
	});
});
