import { formatWorkDescription, generateDescriptionSummary } from "../format-description";

describe("formatWorkDescription", () => {
	it("空の文字列を処理できる", () => {
		expect(formatWorkDescription("")).toBe("");
	});

	it("HTMLをエスケープする", () => {
		const input = "<script>alert('XSS')</script>";
		const result = formatWorkDescription(input);
		expect(result).toContain("&lt;script&gt;");
		expect(result).not.toContain("<script>");
	});

	it("改行を段落に変換する", () => {
		const input = "段落1\n\n段落2\n\n段落3";
		const result = formatWorkDescription(input);
		expect(result).toContain('<p class="mb-4 last:mb-0 text-gray-700 leading-relaxed">段落1</p>');
		expect(result).toContain('<p class="mb-4 last:mb-0 text-gray-700 leading-relaxed">段落2</p>');
		expect(result).toContain('<p class="mb-4 last:mb-0 text-gray-700 leading-relaxed">段落3</p>');
	});

	it("単一改行を<br>に変換する", () => {
		const input = "行1\n行2\n行3";
		const result = formatWorkDescription(input);
		expect(result).toContain("行1<br>行2<br>行3");
	});

	it("URLをリンクに変換する", () => {
		const input = "詳細はこちら: https://example.com をご覧ください。";
		const result = formatWorkDescription(input);
		expect(result).toContain('<a href="https://example.com"');
		expect(result).toContain('target="_blank"');
		expect(result).toContain('rel="noopener noreferrer"');
		expect(result).toContain('class="text-primary hover:underline"');
	});

	it("URLの末尾の句読点を除去する", () => {
		const input = "サイト: https://example.com.";
		const result = formatWorkDescription(input);
		expect(result).toContain('<a href="https://example.com"');
		expect(result).not.toContain('<a href="https://example.com."');
	});

	it("日本語の句読点も除去する", () => {
		const input = "詳細はこちら（https://example.com）をご覧ください。";
		const result = formatWorkDescription(input);
		expect(result).toContain('<a href="https://example.com"');
		expect(result).not.toContain('<a href="https://example.com）"');
	});

	it("見出し記号を強調表示する", () => {
		const input = "■重要なお知らせ\n◆新機能について";
		const result = formatWorkDescription(input);
		expect(result).toContain('<strong class="font-semibold">■重要なお知らせ</strong>');
		expect(result).toContain('<strong class="font-semibold">◆新機能について</strong>');
	});

	it("【】で囲まれた部分を強調表示する", () => {
		const input = "【注意事項】こちらをお読みください";
		const result = formatWorkDescription(input);
		expect(result).toContain('<span class="font-semibold text-gray-900">【注意事項】</span>');
	});

	it("リスト項目を処理する", () => {
		const input = "・項目1\n・項目2\n・項目3";
		const result = formatWorkDescription(input);
		expect(result).toContain('<ul class="list-disc list-inside');
		expect(result).toContain('<li class="ml-4">項目1</li>');
		expect(result).toContain('<li class="ml-4">項目2</li>');
		expect(result).toContain('<li class="ml-4">項目3</li>');
	});

	it("複数の段落とURLを正しく処理する", () => {
		const input = `作品の説明です。

詳細情報は以下のURLをご覧ください:
https://example.com/info

お問い合わせは support@example.com まで。`;
		const result = formatWorkDescription(input);
		expect(result).toContain('<p class="mb-4 last:mb-0 text-gray-700 leading-relaxed">');
		expect(result).toContain('<a href="https://example.com/info"');
		expect(result).toMatch(/<p[^>]*>.*<\/p>.*<p[^>]*>.*<\/p>/s);
	});
});

describe("generateDescriptionSummary", () => {
	it("空の文字列を処理できる", () => {
		expect(generateDescriptionSummary("")).toBe("");
	});

	it("短いテキストはそのまま返す", () => {
		const input = "短い説明文です。";
		expect(generateDescriptionSummary(input, 20)).toBe(input);
	});

	it("長いテキストを指定文字数で切り詰める", () => {
		const input = "これは非常に長い説明文で、指定された文字数を超えています。";
		const result = generateDescriptionSummary(input, 10);
		expect(result).toBe("これは非常に長い説明...");
		expect(result.length).toBe(13); // 10文字 + "..."
	});

	it("改行をスペースに変換する", () => {
		const input = "行1\n行2\n\n行3";
		const result = generateDescriptionSummary(input);
		expect(result).toBe("行1 行2 行3");
	});

	it("デフォルトの文字数制限が150文字である", () => {
		const input = "あ".repeat(200);
		const result = generateDescriptionSummary(input);
		expect(result).toBe(`${"あ".repeat(150)}...`);
	});
});
