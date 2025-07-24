import { describe, expect, it } from "vitest";
import { formatDescriptionText, linkifyText } from "../text-utils";

describe("text-utils", () => {
	describe("linkifyText", () => {
		it("HTTP URLを検出する", () => {
			const text = "詳細はこちら: https://example.com をご覧ください";
			const result = linkifyText(text);
			expect(result).toBeDefined();
		});

		it("www付きドメインを検出する", () => {
			const text = "詳細は www.example.com を参照";
			const result = linkifyText(text);
			expect(result).toBeDefined();
		});

		it("URLが含まれないテキストを処理する", () => {
			const text = "これは普通のテキストです。URLは含まれていません。";
			const result = linkifyText(text);
			expect(result).toBeDefined();
		});
	});

	describe("formatDescriptionText", () => {
		it("通常のテキストを処理する", () => {
			const text = "最初の段落です。\n\n二番目の段落です。";
			const result = formatDescriptionText(text);
			expect(result).toBeDefined();
		});

		it("URLを含むテキストを処理する", () => {
			const text = "公式サイト: https://example.com";
			const result = formatDescriptionText(text);
			expect(result).toBeDefined();
		});

		it("空のテキストに対してnullを返す", () => {
			const result = formatDescriptionText("");
			expect(result).toBeNull();
		});

		it("空白のみのテキストに対してnullを返す", () => {
			const result = formatDescriptionText("   \n\n   ");
			expect(result).toBeNull();
		});
	});
});
