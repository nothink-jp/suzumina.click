/**
 * DLsite詳細パーサーのテスト（高解像度画像URL抽出）
 */

import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";
import {
	extractDetailedDescription,
	extractHighResImageUrl,
	parseCreatorNames,
	parseWorkDetailFromHTML,
} from "./dlsite-detail-parser";

describe("extractHighResImageUrl", () => {
	it("作品IDから構築されたWebP形式URLを優先する", () => {
		const html = `
			<html>
				<head>
					<link rel="canonical" href="https://www.dlsite.com/maniax/work/=/product_id/RJ01411411.html">
				</head>
				<body>
					<div id="work_img">
						<img src="//img.dlsite.jp/resize/images2/work/doujin/RJ01412000/RJ01411411_img_main_240x240.jpg" alt="作品画像">
					</div>
				</body>
			</html>
		`;
		const $ = cheerio.load(html);
		const result = extractHighResImageUrl($);

		// normalizeImageUrl が _240x240 を除去して JPG を返す
		expect(result).toBe(
			"https://img.dlsite.jp/resize/images2/work/doujin/RJ01412000/RJ01411411_img_main.jpg",
		);
	});

	it("作品IDなしの場合はmodpub形式の高解像度画像URLを抽出する", () => {
		// cSpell:disable-next-line
		const html = `
			<div class="work_img">
				<img src="https://img.dlsite.jp/modpub/images2/parts/RJ01412000/RJ01411411/a7465f5868cf9f9dde45fb00093c897a.jpg" alt="作品画像">
			</div>
		`;
		const $ = cheerio.load(html);
		const result = extractHighResImageUrl($);

		// cSpell:disable-next-line
		expect(result).toBe(
			"https://img.dlsite.jp/modpub/images2/parts/RJ01412000/RJ01411411/a7465f5868cf9f9dde45fb00093c897a.jpg",
		);
	});

	it("作品IDなしの場合は従来通りの画像URL抽出を行う", () => {
		const html = `
			<div id="work_img">
				<img src="//img.dlsite.jp/resize/images2/work/doujin/RJ01412000/RJ01411411_img_main_240x240.jpg" alt="作品画像">
			</div>
		`;
		const $ = cheerio.load(html);
		const result = extractHighResImageUrl($);

		expect(result).toBe(
			"https://img.dlsite.jp/resize/images2/work/doujin/RJ01412000/RJ01411411_img_main.jpg",
		);
	});

	it("画像が見つからない場合はundefinedを返す", () => {
		const html = `
			<div class="content">
				<p>作品説明のみ</p>
			</div>
		`;
		const $ = cheerio.load(html);
		const result = extractHighResImageUrl($);

		expect(result).toBeUndefined();
	});

	it("作品IDを含む場合は構築されたURLを優先する", () => {
		const html = `
			<html>
				<head>
					<meta property="og:url" content="https://www.dlsite.com/maniax/work/=/product_id/RJ01411411.html">
				</head>
				<body>
					<div id="work_img">
						<img src="//img.dlsite.jp/resize/images2/work/doujin/RJ01412000/RJ01411411_img_main_240x240.jpg" alt="メイン画像">
						<img src="//img.dlsite.jp/resize/images2/work/doujin/RJ01412000/RJ01411411_img_sample_120x120.jpg" alt="サンプル画像">
					</div>
				</body>
			</html>
		`;
		const $ = cheerio.load(html);
		const result = extractHighResImageUrl($);

		// normalizeImageUrl が _240x240 を除去して JPG を返す
		expect(result).toBe(
			"https://img.dlsite.jp/resize/images2/work/doujin/RJ01412000/RJ01411411_img_main.jpg",
		);
	});

	it("作品IDから標準的なWebP形式の高解像度URLを構築する", () => {
		// HTMLに画像がない場合はundefinedを返す（この関数は抽出のみ）
		const html = `
			<html>
				<body>
					<div class="work_outline_table">
						<p>作品番号: RJ01411411</p>
					</div>
				</body>
			</html>
		`;
		const $ = cheerio.load(html);
		const result = extractHighResImageUrl($);

		// 画像がHTMLに存在しない場合はundefinedを返す
		expect(result).toBeUndefined();
	});

	it("古い形式の作品IDでも正しくURLを構築する", () => {
		const html = `
			<html>
				<body>
					<div class="work_outline_table">
						<p>作品番号: RJ236867</p>
					</div>
				</body>
			</html>
		`;
		const $ = cheerio.load(html);
		const result = extractHighResImageUrl($);

		// 画像がHTMLに存在しない場合はundefinedを返す
		expect(result).toBeUndefined();
	});
});

describe("extractDetailedDescription", () => {
	it("work_parts_areaから作品説明を抽出する", () => {
		const html = `
			<html>
				<body>
					<div class="work_parts_area">
						<div class="work_parts">これは詳細な作品説明です。物語の内容が記載されています。</div>
					</div>
				</body>
			</html>
		`;

		const $ = cheerio.load(html);
		const result = extractDetailedDescription($);
		expect(result).toBe("これは詳細な作品説明です。物語の内容が記載されています。");
	});
});

describe("parseWorkDetailFromHTML（高解像度画像統合）", () => {
	it("高解像度画像URLが含まれた拡張データを返す", () => {
		const html = `
			<html>
				<head>
					<link rel="canonical" href="https://www.dlsite.com/maniax/work/=/product_id/RJ01411411.html">
				</head>
				<body>
					<div id="work_img">
						<img src="//img.dlsite.jp/resize/images2/work/doujin/RJ01412000/RJ01411411_img_main_240x240.jpg" alt="作品画像">
					</div>
					<div class="work_parts_area">
						<div class="work_parts">これは詳細な作品説明テキストです。内容についての説明が含まれています。</div>
					</div>
				</body>
			</html>
		`;

		const result = parseWorkDetailFromHTML(html);

		// normalizeImageUrl が _240x240 を除去して JPG を返す
		expect(result.highResImageUrl).toBe(
			"https://img.dlsite.jp/resize/images2/work/doujin/RJ01412000/RJ01411411_img_main.jpg",
		);
		expect(result.detailedDescription).toBe(
			"これは詳細な作品説明テキストです。内容についての説明が含まれています。",
		);
		expect(result.fileInfo).toBeDefined();
		expect(result.basicInfo).toBeDefined();
		// 5種類の統一クリエイター情報フィールドをチェック
		expect(result.voiceActors).toBeDefined();
		expect(result.scenario).toBeDefined();
		expect(result.illustration).toBeDefined();
		expect(result.music).toBeDefined();
		expect(result.author).toBeDefined();
		expect(result.bonusContent).toEqual([]);
	});

	it("画像がない場合はhighResImageUrlがundefined", () => {
		const html = `
			<html>
				<body>
					<div class="work_parts_area">
						<div class="work_parts">こちらは作品説明のみのテストケースです。詳細な内容が含まれています。</div>
					</div>
				</body>
			</html>
		`;

		const result = parseWorkDetailFromHTML(html);

		expect(result.highResImageUrl).toBeUndefined();
		expect(result.detailedDescription).toBe(
			"こちらは作品説明のみのテストケースです。詳細な内容が含まれています。",
		);
	});
});

describe("parseCreatorNames", () => {
	it("スラッシュ区切りのクリエイター名を正しく分割する", () => {
		const testCases = [
			{
				input: "柚木つばめ / 橘きの / おおきなこびと",
				expected: ["柚木つばめ", "橘きの", "おおきなこびと"],
			},
			{
				input: "陽向葵ゆか / 涼花みなせ / 来夢ふらん",
				expected: ["陽向葵ゆか", "涼花みなせ", "来夢ふらん"],
			},
			{
				input: "西矢沙広 / assault / 岸田ソラ",
				expected: ["西矢沙広", "assault", "岸田ソラ"],
			},
		];

		testCases.forEach(({ input, expected }) => {
			const result = parseCreatorNames(input);
			expect(result).toEqual(expected);
		});
	});

	it("カンマ区切りのクリエイター名を正しく分割する", () => {
		const result = parseCreatorNames("クリエイターA、クリエイターB、クリエイターC");
		expect(result).toEqual(["クリエイターA", "クリエイターB", "クリエイターC"]);
	});

	it("単一のクリエイター名はそのまま返す", () => {
		const result = parseCreatorNames("一真");
		expect(result).toEqual(["一真"]);
	});

	it("空文字列や無効な文字列は空配列を返す", () => {
		expect(parseCreatorNames("")).toEqual([]);
		expect(parseCreatorNames("   ")).toEqual([]);
		expect(parseCreatorNames("a")).toEqual([]); // 短すぎる名前
	});

	it("混合区切り文字（スラッシュとカンマ）を正しく処理する", () => {
		const result = parseCreatorNames("柚木つばめ / 橘きの、おおきなこびと");
		expect(result).toEqual(["柚木つばめ", "橘きの", "おおきなこびと"]);
	});

	it("前後の空白を正しく削除する", () => {
		const result = parseCreatorNames("  柚木つばめ  /  橘きの  /  おおきなこびと  ");
		expect(result).toEqual(["柚木つばめ", "橘きの", "おおきなこびと"]);
	});
});
