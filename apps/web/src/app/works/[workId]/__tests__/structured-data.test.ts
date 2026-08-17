import type { WorkCreatorsPlain, WorkPlainObject } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { buildWorkStructuredData, serializeStructuredData } from "../structured-data";

const PAGE_URL = "https://suzumina.click/works/RJ01616204";

// 構造化データの組み立てに必要なフィールドだけを持つ最小の work。
// 全フィールドを埋めると型の変更ごとにテストが壊れ、何を検証しているかも見えなくなる。
const createCreators = (
	roles: Partial<Pick<WorkCreatorsPlain, "voiceActors" | "scenario" | "illustration" | "music">>,
): WorkCreatorsPlain => ({
	voiceActors: [],
	scenario: [],
	illustration: [],
	music: [],
	others: [],
	voiceActorNames: [],
	scenarioNames: [],
	illustrationNames: [],
	musicNames: [],
	otherNames: [],
	...roles,
});

const createWork = (overrides: Partial<WorkPlainObject> = {}): WorkPlainObject =>
	({
		productId: "RJ01616204",
		title: "テスト作品",
		description: "作品の説明",
		circle: "テストサークル",
		workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ01616204.html",
		thumbnailUrl: "https://img.dlsite.jp/thumb.jpg",
		genres: ["耳舐め", "バイノーラル"],
		ageRating: "R18",
		releaseDateISO: "2026-07-02",
		price: {
			current: 1760,
			currency: "JPY",
			isFree: false,
			isDiscounted: false,
			formattedPrice: "¥1,760",
		},
		creators: createCreators({
			voiceActors: [{ id: "1", name: "涼花みなせ" }],
			scenario: [{ id: "2", name: "シナリオ担当" }],
		}),
		...overrides,
	}) as WorkPlainObject;

describe("buildWorkStructuredData", () => {
	it("Product として基本情報を出す", () => {
		const data = buildWorkStructuredData(createWork(), PAGE_URL);

		expect(data["@type"]).toBe("Product");
		expect(data.name).toBe("テスト作品");
		expect(data.url).toBe(PAGE_URL);
		expect(data.productID).toBe("RJ01616204");
		expect(data.brand).toEqual({ "@type": "Brand", name: "テストサークル" });
		expect(data.contentRating).toBe("R18");
	});

	it("価格は Offer として出し、購入先は DLsite を指す", () => {
		const data = buildWorkStructuredData(createWork(), PAGE_URL);

		expect(data.offers).toMatchObject({
			price: 1760,
			priceCurrency: "JPY",
			availability: "https://schema.org/InStock",
		});
		expect(data.offers?.url).toContain("dlsite.com");
	});

	// 当サイトは販売者ではない（merchant listing ではなく product snippet を狙う）
	it("Offer の seller は DLsite", () => {
		expect(buildWorkStructuredData(createWork(), PAGE_URL).offers?.seller).toEqual({
			"@type": "Organization",
			name: "DLsite",
		});
	});

	it("無料作品は Offer を出さない", () => {
		const work = createWork({
			price: {
				current: 0,
				currency: "JPY",
				isFree: true,
				isDiscounted: false,
				formattedPrice: "無料",
			},
		});

		expect(buildWorkStructuredData(work, PAGE_URL).offers).toBeUndefined();
	});

	// 評価0件で ratingCount:0 を出すと Google 側で無効な構造化データになる
	it("評価は件数があるときだけ出す", () => {
		const withRatings = createWork({
			rating: {
				stars: 4.5,
				count: 170,
				average: 4.5,
				hasRatings: true,
				isHighlyRated: true,
				reliability: "high",
				formattedRating: "4.5",
			},
		});
		expect(buildWorkStructuredData(withRatings, PAGE_URL).aggregateRating).toMatchObject({
			ratingValue: 4.5,
			ratingCount: 170,
		});

		expect(buildWorkStructuredData(createWork(), PAGE_URL).aggregateRating).toBeUndefined();
	});

	// offers を落とすと review / aggregateRating / offers すべてを欠き、
	// product snippet の適格性ごと失う（助言レベルの警告 → 必須項目エラーに悪化）
	it("評価がなくても Offer は落とさない", () => {
		const data = buildWorkStructuredData(createWork({ rating: undefined }), PAGE_URL);

		expect(data.offers?.price).toBe(1760);
	});

	it("制作陣を role 横断で平坦化し重複を除く", () => {
		const work = createWork({
			creators: createCreators({
				voiceActors: [{ id: "1", name: "涼花みなせ" }],
				scenario: [{ id: "1", name: "涼花みなせ" }],
				illustration: [{ id: "3", name: "イラスト担当" }],
			}),
		});

		expect(buildWorkStructuredData(work, PAGE_URL).contributor).toEqual([
			{ "@type": "Person", name: "涼花みなせ" },
			{ "@type": "Person", name: "イラスト担当" },
		]);
	});

	// title / description は DLsite 由来の外部データなので script 要素から脱出できてはいけない
	it("script 要素から脱出できないようエスケープする", () => {
		const work = createWork({
			title: '</script><script>alert("xss")</script>',
			description: "<img src=x onerror=alert(1)>",
		});

		const serialized = serializeStructuredData(buildWorkStructuredData(work, PAGE_URL));

		expect(serialized).not.toContain("</script>");
		expect(serialized).not.toContain("<img");
		// エスケープしても JSON としての値は変わらない
		expect(JSON.parse(serialized).title ?? JSON.parse(serialized).name).toBe(
			'</script><script>alert("xss")</script>',
		);
	});

	// 空値を出すと Google 側で警告になるため、キーごと落とす
	it("値が無い項目はキーごと出さない", () => {
		const work = createWork({ description: "", genres: [], ageRating: undefined });
		const json = JSON.parse(JSON.stringify(buildWorkStructuredData(work, PAGE_URL)));

		expect(json).not.toHaveProperty("description");
		expect(json).not.toHaveProperty("genre");
		expect(json).not.toHaveProperty("contentRating");
	});
});
