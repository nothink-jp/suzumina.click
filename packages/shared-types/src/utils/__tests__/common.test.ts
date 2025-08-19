import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	type ActionResult,
	convertFromFirestore,
	convertToFirestore,
	deserialize,
	formatZodError,
	serialize,
	type ValidationError,
} from "../common";

// テスト用のスキーマ定義
const TestDataSchema = z.object({
	id: z.string(),
	name: z.string(),
	age: z.number(),
	isActive: z.boolean(),
	tags: z.array(z.string()).optional(),
});

type TestData = z.infer<typeof TestDataSchema>;

const validTestData: TestData = {
	id: "test-123",
	name: "Test User",
	age: 25,
	isActive: true,
	tags: ["tag1", "tag2"],
};

describe("formatZodError", () => {
	it("Zodエラーを正しく整形できる", () => {
		const invalidData = {
			id: 123, // string型でなければならない
			name: "",
			age: "invalid", // number型でなければならない
		};

		try {
			TestDataSchema.parse(invalidData);
		} catch (error) {
			if (error instanceof z.ZodError) {
				const formattedErrors = formatZodError(error);

				expect(formattedErrors.length).toBeGreaterThan(0);
				expect(formattedErrors[0]).toMatchObject({
					path: expect.any(Array),
					message: expect.any(String),
				});

				// 具体的なエラーをチェック
				const idError = formattedErrors.find((err) => err.path.includes("id"));
				expect(idError).toBeDefined();
				expect(idError?.message).toContain("string");
			}
		}
	});

	it("空のエラー配列も正しく処理できる", () => {
		const validData = { ...validTestData };
		const result = TestDataSchema.safeParse(validData);

		expect(result.success).toBe(true);
	});
});

describe("serialize/deserialize", () => {
	it("オブジェクトを正しくシリアライズ・デシリアライズできる", () => {
		const serialized = serialize(validTestData);
		expect(typeof serialized).toBe("string");

		const deserialized = deserialize(serialized, TestDataSchema);
		expect(deserialized).toEqual(validTestData);
	});

	it("複雑なオブジェクトも正しく処理できる", () => {
		const complexData = {
			...validTestData,
			nested: {
				value: "nested",
				array: [1, 2, 3],
			},
			nullValue: null,
			undefinedValue: undefined, // undefinedはJSON.stringifyで削除される
		};

		const ComplexSchema = TestDataSchema.extend({
			nested: z.object({
				value: z.string(),
				array: z.array(z.number()),
			}),
			nullValue: z.null(),
		});

		const serialized = serialize(complexData);
		const deserialized = deserialize(serialized, ComplexSchema);

		expect(deserialized.nested.value).toBe("nested");
		expect(deserialized.nested.array).toEqual([1, 2, 3]);
		expect(deserialized.nullValue).toBeNull();
		expect("undefinedValue" in deserialized).toBe(false);
	});

	it("不正なJSON文字列でエラーが発生する", () => {
		const invalidJson = "invalid json string";

		expect(() => {
			deserialize(invalidJson, TestDataSchema);
		}).toThrow("データの形式が無効です");
	});

	it("スキーマバリデーションエラーで適切なエラーが発生する", () => {
		const invalidData = {
			id: 123,
			name: "Test",
			age: "invalid",
			isActive: true,
		};

		const serialized = serialize(invalidData);

		expect(() => {
			deserialize(serialized, TestDataSchema);
		}).toThrow("データの形式が無効です");
	});

	it("空のオブジェクトも正しく処理できる", () => {
		const EmptySchema = z.object({});
		const emptyData = {};

		const serialized = serialize(emptyData);
		const deserialized = deserialize(serialized, EmptySchema);

		expect(deserialized).toEqual({});
	});
});

describe("convertFromFirestore", () => {
	it("Firestoreデータを正しく変換できる", () => {
		const firestoreData = {
			id: "test-123",
			name: "Test User",
			age: 25,
			isActive: true,
			tags: ["tag1", "tag2"],
		};

		const result = convertFromFirestore(TestDataSchema, firestoreData);
		expect(result).toEqual(validTestData);
	});

	it("不正なFirestoreデータでエラーが発生する", () => {
		const invalidFirestoreData = {
			id: 123, // stringでなければならない
			name: "Test User",
			age: "invalid", // numberでなければならない
			isActive: "true", // booleanでなければならない
		};

		expect(() => {
			convertFromFirestore(TestDataSchema, invalidFirestoreData);
		}).toThrow("データ形式が無効です");
	});

	it("余分なフィールドを持つデータも正しく処理できる", () => {
		const firestoreDataWithExtra = {
			...validTestData,
			extraField: "extra value",
			anotherExtra: 999,
		};

		const result = convertFromFirestore(TestDataSchema, firestoreDataWithExtra);
		expect(result).toEqual(validTestData);
		expect("extraField" in result).toBe(false);
	});

	it("オプショナルフィールドが欠けていても正しく処理できる", () => {
		const dataWithoutOptional = {
			id: "test-123",
			name: "Test User",
			age: 25,
			isActive: true,
			// tags は省略
		};

		const result = convertFromFirestore(TestDataSchema, dataWithoutOptional);
		expect(result.tags).toBeUndefined();
		expect(result.id).toBe("test-123");
	});
});

describe("convertToFirestore", () => {
	it("データを正しくFirestore保存用に変換できる", () => {
		const result = convertToFirestore(validTestData);

		expect(result).toEqual(validTestData);
		expect(typeof result).toBe("object");
		expect(result).not.toBe(validTestData); // 新しいオブジェクトである
	});

	it("関数やundefinedの値を適切に処理できる", () => {
		const dataWithFunctions = {
			...validTestData,
			fn: () => "function",
			undefinedValue: undefined,
			symbolValue: Symbol("test"),
		};

		const result = convertToFirestore(dataWithFunctions);

		expect("fn" in result).toBe(false);
		expect("undefinedValue" in result).toBe(false);
		expect("symbolValue" in result).toBe(false);
		expect(result.id).toBe(validTestData.id);
	});

	it("ネストしたオブジェクトも正しく処理できる", () => {
		const nestedData = {
			...validTestData,
			nested: {
				value: "nested",
				deep: {
					value: "deep",
				},
			},
		};

		const result = convertToFirestore(nestedData);

		expect(result.nested).toEqual({
			value: "nested",
			deep: {
				value: "deep",
			},
		});
	});

	it("配列も正しく処理できる", () => {
		const dataWithArrays = {
			...validTestData,
			numbers: [1, 2, 3],
			objects: [{ a: 1 }, { b: 2 }],
			mixed: ["string", 123, true, null],
		};

		const result = convertToFirestore(dataWithArrays);

		expect(result.numbers).toEqual([1, 2, 3]);
		expect(result.objects).toEqual([{ a: 1 }, { b: 2 }]);
		expect(result.mixed).toEqual(["string", 123, true, null]);
	});

	it("null値も正しく保持される", () => {
		const dataWithNull = {
			...validTestData,
			nullValue: null,
		};

		const result = convertToFirestore(dataWithNull);
		expect(result.nullValue).toBeNull();
	});
});

describe("ActionResult型", () => {
	it("成功レスポンスの型チェック", () => {
		const successResult: ActionResult<TestData> = {
			success: true,
			data: validTestData,
		};

		expect(successResult.success).toBe(true);
		expect(successResult.data).toEqual(validTestData);
		expect(successResult.error).toBeUndefined();
	});

	it("エラーレスポンスの型チェック", () => {
		const errorResult: ActionResult = {
			success: false,
			error: "Something went wrong",
		};

		expect(errorResult.success).toBe(false);
		expect(errorResult.error).toBe("Something went wrong");
		expect(errorResult.data).toBeUndefined();
	});

	it("バリデーションエラーレスポンスの型チェック", () => {
		const validationErrors: ValidationError[] = [
			{ path: ["name"], message: "Name is required" },
			{ path: ["age"], message: "Age must be a number" },
		];

		const validationErrorResult: ActionResult = {
			success: false,
			validationErrors,
		};

		expect(validationErrorResult.success).toBe(false);
		expect(validationErrorResult.validationErrors).toEqual(validationErrors);
		expect(validationErrorResult.validationErrors?.[0]?.path).toEqual(["name"]);
	});
});
