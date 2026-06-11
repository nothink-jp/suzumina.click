import { describe, expect, it } from "vitest";
import { detectWorkLanguage, getSupportedLanguages } from "../../entities/work/language-detection";
import type { WorkDocument } from "../../entities/work/work-document-schema";
import { fromFirestore } from "../work-firestore";

const createWorkDocument = (overrides: Partial<WorkDocument> = {}): WorkDocument => ({
	id: "RJ123456",
	productId: "RJ123456",
	title: "Test Work",
	circle: "Test Circle",
	description: "Test description",
	category: "SOU",
	workUrl: "https://example.com",
	thumbnailUrl: "https://example.com/thumb.jpg",
	price: { current: 1000, currency: "JPY" },
	genres: [],
	customGenres: [],
	sampleImages: [],
	lastFetchedAt: "2024-01-01T00:00:00Z",
	createdAt: "2024-01-01T00:00:00Z",
	updatedAt: "2024-01-01T00:00:00Z",
	...overrides,
});

// SPR-184: transformer の _computed が言語判定の正本（detectWorkLanguage /
// getSupportedLanguages）に委譲していること、すなわち「詳細表示」と「フィルタ」で
// 同じ言語が得られることを固定する。
describe("work-firestore fromFirestore の言語判定（detectWorkLanguage への委譲）", () => {
	const cases: Array<{ name: string; doc: WorkDocument }> = [
		{ name: "デフォルト(ja)", doc: createWorkDocument() },
		{ name: "英語タイトル", doc: createWorkDocument({ title: "English Version" }) },
		{ name: "繁体中文版タイトル", doc: createWorkDocument({ title: "作品名 繁体中文版" }) },
		{ name: "genres 由来(English)", doc: createWorkDocument({ genres: ["English"] }) },
		{
			name: "languageDownloads 由来(ko)",
			doc: createWorkDocument({
				languageDownloads: [
					{
						workno: "RJ123456",
						label: "한국어",
						lang: "ko",
						dlCount: "10",
						displayLabel: "한국어",
					},
				],
			}),
		},
	];

	for (const { name, doc } of cases) {
		it(`${name}: _computed.primaryLanguage が detectWorkLanguage と一致`, () => {
			const plain = fromFirestore(doc);
			expect(plain._computed.primaryLanguage).toBe(detectWorkLanguage(doc) ?? "ja");
		});

		it(`${name}: _computed.availableLanguages が getSupportedLanguages と一致`, () => {
			const plain = fromFirestore(doc);
			expect(plain._computed.availableLanguages).toEqual(getSupportedLanguages(doc));
		});
	}

	it("統合エイリアス(lang:'kr')も韓国語として判定される", () => {
		const doc = createWorkDocument({
			languageDownloads: [
				{ workno: "RJ123456", label: "Korean", lang: "kr", dlCount: "10", displayLabel: "Korean" },
			],
		});
		expect(fromFirestore(doc)._computed.primaryLanguage).toBe("ko");
	});
});
