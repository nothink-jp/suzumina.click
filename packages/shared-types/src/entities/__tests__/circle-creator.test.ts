import { describe, expect, it } from "vitest";
import { CREATOR_TYPE_LABELS, getCreatorTypeLabel } from "../../utilities/creator/type-label";
import { isValidCircleId, isValidCreatorId } from "../../utilities/validators/dlsite-ids";
import { CreatorPageInfoSchema, type CreatorType, CreatorTypeSchema } from "../circle-creator";

describe("CreatorTypeSchema", () => {
	it("有効なクリエイタータイプを検証する", () => {
		const validTypes: CreatorType[] = ["voice", "illustration", "scenario", "music", "other"];

		for (const type of validTypes) {
			const result = CreatorTypeSchema.safeParse(type);
			expect(result.success).toBe(true);
		}
	});

	it("無効なクリエイタータイプを拒否する", () => {
		const result = CreatorTypeSchema.safeParse("invalid");
		expect(result.success).toBe(false);
	});
});

describe("CreatorPageInfoSchema", () => {
	it("正しいページ情報を検証する", () => {
		const validData = {
			id: "123456",
			name: "テストクリエイター",
			types: ["voice", "music"],
			workCount: 5,
		};

		const result = CreatorPageInfoSchema.safeParse(validData);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.id).toBe("123456");
			expect(result.data.workCount).toBe(5);
		}
	});

	it("負のworkCountを拒否する", () => {
		const invalidData = {
			id: "123456",
			name: "テストクリエイター",
			types: ["voice"],
			workCount: -1,
		};

		const result = CreatorPageInfoSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});
});

describe("getCreatorTypeLabel", () => {
	it("単一タイプのラベルを返す", () => {
		expect(getCreatorTypeLabel(["voice"])).toBe("声優");
		expect(getCreatorTypeLabel(["illustration"])).toBe("イラスト");
		expect(getCreatorTypeLabel(["scenario"])).toBe("シナリオ");
		expect(getCreatorTypeLabel(["music"])).toBe("音楽");
		expect(getCreatorTypeLabel(["other"])).toBe("その他");
	});

	it("複数タイプのラベルを結合して返す", () => {
		expect(getCreatorTypeLabel(["voice", "music"])).toBe("声優 / 音楽");
		expect(getCreatorTypeLabel(["illustration", "scenario", "other"])).toBe(
			"イラスト / シナリオ / その他",
		);
	});

	it("空の配列に対して空文字を返す", () => {
		expect(getCreatorTypeLabel([])).toBe("");
	});

	it("不明なタイプに対してそのまま返す", () => {
		expect(getCreatorTypeLabel(["unknown"])).toBe("unknown");
		expect(getCreatorTypeLabel(["voice", "unknown"])).toBe("声優 / unknown");
	});
});

describe("isValidCircleId", () => {
	it("有効なサークルIDを検証する", () => {
		expect(isValidCircleId("RG12345")).toBe(true);
		expect(isValidCircleId("RG00001")).toBe(true);
		expect(isValidCircleId("RG99999")).toBe(true);
	});

	it("無効なサークルIDを拒否する", () => {
		expect(isValidCircleId("")).toBe(false);
		expect(isValidCircleId("RJ12345")).toBe(false);
		expect(isValidCircleId("RG")).toBe(false);
		expect(isValidCircleId("12345")).toBe(false);
		expect(isValidCircleId("RGABCDE")).toBe(false);
		expect(isValidCircleId("rg12345")).toBe(false);
	});
});

describe("isValidCreatorId", () => {
	it("有効なクリエイターIDを検証する", () => {
		expect(isValidCreatorId("123456")).toBe(true);
		expect(isValidCreatorId("a")).toBe(true);
		expect(isValidCreatorId("creator-123")).toBe(true);
		expect(isValidCreatorId("some_long_creator_id_string")).toBe(true);
	});

	it("無効なクリエイターIDを拒否する", () => {
		expect(isValidCreatorId("")).toBe(false);
	});
});

describe("CREATOR_TYPE_LABELS", () => {
	it("すべてのクリエイタータイプにラベルが定義されている", () => {
		const types: CreatorType[] = ["voice", "illustration", "scenario", "music", "other"];

		for (const type of types) {
			expect(CREATOR_TYPE_LABELS[type]).toBeDefined();
			expect(typeof CREATOR_TYPE_LABELS[type]).toBe("string");
			expect(CREATOR_TYPE_LABELS[type].length).toBeGreaterThan(0);
		}
	});
});
