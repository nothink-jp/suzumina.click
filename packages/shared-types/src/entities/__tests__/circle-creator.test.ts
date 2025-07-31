import { describe, expect, it } from "vitest";
import {
	CircleDataSchema,
	CREATOR_TYPE_LABELS,
	CreatorPageInfoSchema,
	type CreatorType,
	CreatorTypeSchema,
	CreatorWorkMappingSchema,
	getCreatorTypeLabel,
	isValidCircleId,
	isValidCreatorId,
} from "../circle-creator";

describe("CircleDataSchema", () => {
	it("正しいサークルデータを検証する", () => {
		const validData = {
			circleId: "RG12345",
			name: "テストサークル",
			nameEn: "Test Circle",
			workCount: 10,
			lastUpdated: new Date(),
			createdAt: new Date(),
		};

		const result = CircleDataSchema.safeParse(validData);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.circleId).toBe("RG12345");
			expect(result.data.name).toBe("テストサークル");
			expect(result.data.workCount).toBe(10);
		}
	});

	it("workCountのデフォルト値を設定する", () => {
		const validData = {
			circleId: "RG12345",
			name: "テストサークル",
			lastUpdated: new Date(),
			createdAt: new Date(),
		};

		const result = CircleDataSchema.safeParse(validData);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.workCount).toBe(0);
		}
	});

	it("無効なサークルIDを拒否する", () => {
		const invalidData = {
			circleId: "INVALID",
			name: "テストサークル",
			lastUpdated: new Date(),
			createdAt: new Date(),
		};

		const result = CircleDataSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("空のサークル名を拒否する", () => {
		const invalidData = {
			circleId: "RG12345",
			name: "",
			lastUpdated: new Date(),
			createdAt: new Date(),
		};

		const result = CircleDataSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});
});

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

describe("CreatorWorkMappingSchema", () => {
	it("正しいマッピングデータを検証する", () => {
		const validData = {
			creatorId: "123456",
			workId: "RJ01234567",
			creatorName: "テストクリエイター",
			types: ["voice", "music"],
			circleId: "RG12345",
			createdAt: new Date(),
		};

		const result = CreatorWorkMappingSchema.safeParse(validData);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.creatorId).toBe("123456");
			expect(result.data.workId).toBe("RJ01234567");
			expect(result.data.types).toHaveLength(2);
		}
	});

	it("空のクリエイターIDを拒否する", () => {
		const invalidData = {
			creatorId: "",
			workId: "RJ01234567",
			creatorName: "テストクリエイター",
			types: ["voice"],
			circleId: "RG12345",
			createdAt: new Date(),
		};

		const result = CreatorWorkMappingSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("無効な作品IDを拒否する", () => {
		const invalidData = {
			creatorId: "123456",
			workId: "INVALID",
			creatorName: "テストクリエイター",
			types: ["voice"],
			circleId: "RG12345",
			createdAt: new Date(),
		};

		const result = CreatorWorkMappingSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("空のtypes配列を拒否する", () => {
		const invalidData = {
			creatorId: "123456",
			workId: "RJ01234567",
			creatorName: "テストクリエイター",
			types: [],
			circleId: "RG12345",
			createdAt: new Date(),
		};

		const result = CreatorWorkMappingSchema.safeParse(invalidData);
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
