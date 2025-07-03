/**
 * DLsite詳細パーサーのテスト（高解像度画像URL抽出）
 */

import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";
import { extractHighResImageUrl, parseWorkDetailFromHTML } from "./dlsite-detail-parser";

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

		expect(result).toBe(
			"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01412000/RJ01411411_img_main.webp",
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

		expect(result).toBe(
			"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01412000/RJ01411411_img_main.webp",
		);
	});

	it("作品IDから標準的なWebP形式の高解像度URLを構築する", () => {
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

		expect(result).toBe(
			"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01412000/RJ01411411_img_main.webp",
		);
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

		expect(result).toBe(
			"https://img.dlsite.jp/modpub/images2/work/doujin/RJ00237000/RJ236867_img_main.webp",
		);
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
						<div class="work_parts">作品説明テキスト</div>
					</div>
				</body>
			</html>
		`;

		const result = parseWorkDetailFromHTML(html);

		expect(result.highResImageUrl).toBe(
			"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01412000/RJ01411411_img_main.webp",
		);
		expect(result.detailedDescription).toBe("作品説明テキスト");
		expect(result.fileInfo).toBeDefined();
		expect(result.basicInfo).toBeDefined();
		expect(result.detailedCreators).toBeDefined();
		expect(result.bonusContent).toEqual([]);
	});

	it("画像がない場合はhighResImageUrlがundefined", () => {
		const html = `
			<html>
				<body>
					<div class="work_parts_area">
						<div class="work_parts">作品説明のみ</div>
					</div>
				</body>
			</html>
		`;

		const result = parseWorkDetailFromHTML(html);

		expect(result.highResImageUrl).toBeUndefined();
		expect(result.detailedDescription).toBe("作品説明のみ");
	});
});
