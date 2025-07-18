import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAudioButtonValidation } from "./use-audio-button-validation";

describe("useAudioButtonValidation", () => {
	describe("有効な入力", () => {
		it("すべて有効な値の場合はisValidがtrueになる", () => {
			const { result } = renderHook(() =>
				useAudioButtonValidation({
					title: "有効なタイトル",
					startTime: 10,
					endTime: 20,
					tags: ["tag1", "tag2"],
					description: "有効な説明",
				}),
			);

			expect(result.current.isValid).toBe(true);
			expect(result.current.duration).toBe(10);
			expect(result.current.errors.title).toBe(null);
			expect(result.current.errors.timeRange).toBe(null);
			expect(result.current.errors.duration).toBe(null);
			expect(result.current.errors.tags).toBe(null);
			expect(result.current.errors.description).toBe(null);
		});

		it("最小値で有効な場合", () => {
			const { result } = renderHook(() =>
				useAudioButtonValidation({
					title: "a",
					startTime: 0,
					endTime: 1,
					tags: [],
					description: "",
				}),
			);

			expect(result.current.isValid).toBe(true);
			expect(result.current.duration).toBe(1);
		});

		it("最大値で有効な場合", () => {
			const { result } = renderHook(() =>
				useAudioButtonValidation({
					title: "a".repeat(100),
					startTime: 0,
					endTime: 60,
					tags: Array.from({ length: 10 }, (_, i) => `tag${i}`),
					description: "a".repeat(500),
				}),
			);

			expect(result.current.isValid).toBe(true);
			expect(result.current.duration).toBe(60);
		});
	});

	describe("タイトルのバリデーション", () => {
		it("空のタイトルはエラーになる", () => {
			const { result } = renderHook(() =>
				useAudioButtonValidation({
					title: "",
					startTime: 10,
					endTime: 20,
				}),
			);

			expect(result.current.isValid).toBe(false);
			expect(result.current.errors.title).toBe("タイトルを入力してください");
		});

		it("空白のみのタイトルはエラーになる", () => {
			const { result } = renderHook(() =>
				useAudioButtonValidation({
					title: "   ",
					startTime: 10,
					endTime: 20,
				}),
			);

			expect(result.current.isValid).toBe(false);
			expect(result.current.errors.title).toBe("タイトルを入力してください");
		});

		it("100文字を超えるタイトルはエラーになる", () => {
			const { result } = renderHook(() =>
				useAudioButtonValidation({
					title: "a".repeat(101),
					startTime: 10,
					endTime: 20,
				}),
			);

			expect(result.current.isValid).toBe(false);
			expect(result.current.errors.title).toBe("タイトルは100文字以下で入力してください");
		});
	});

	describe("時間範囲のバリデーション", () => {
		it("開始時間が終了時間以上の場合はエラーになる", () => {
			const { result } = renderHook(() =>
				useAudioButtonValidation({
					title: "有効なタイトル",
					startTime: 20,
					endTime: 10,
				}),
			);

			expect(result.current.isValid).toBe(false);
			expect(result.current.errors.timeRange).toBe("終了時間は開始時間より後に設定してください");
		});

		it("開始時間と終了時間が同じ場合はエラーになる", () => {
			const { result } = renderHook(() =>
				useAudioButtonValidation({
					title: "有効なタイトル",
					startTime: 10,
					endTime: 10,
				}),
			);

			expect(result.current.isValid).toBe(false);
			expect(result.current.errors.timeRange).toBe("終了時間は開始時間より後に設定してください");
		});
	});

	describe("時間長のバリデーション", () => {
		it("1秒未満の場合はエラーになる", () => {
			const { result } = renderHook(() =>
				useAudioButtonValidation({
					title: "有効なタイトル",
					startTime: 10,
					endTime: 10.5,
				}),
			);

			expect(result.current.isValid).toBe(false);
			expect(result.current.errors.duration).toBe("音声の長さは1秒以上にしてください");
		});

		it("60秒を超える場合はエラーになる", () => {
			const { result } = renderHook(() =>
				useAudioButtonValidation({
					title: "有効なタイトル",
					startTime: 0,
					endTime: 61,
				}),
			);

			expect(result.current.isValid).toBe(false);
			expect(result.current.errors.duration).toBe("音声の長さは60秒以下にしてください");
		});
	});

	describe("タグのバリデーション", () => {
		it("10個を超えるタグはエラーになる", () => {
			const { result } = renderHook(() =>
				useAudioButtonValidation({
					title: "有効なタイトル",
					startTime: 10,
					endTime: 20,
					tags: Array.from({ length: 11 }, (_, i) => `tag${i}`),
				}),
			);

			expect(result.current.isValid).toBe(false);
			expect(result.current.errors.tags).toBe("タグは10個まで設定できます");
		});

		it("空のタグはエラーになる", () => {
			const { result } = renderHook(() =>
				useAudioButtonValidation({
					title: "有効なタイトル",
					startTime: 10,
					endTime: 20,
					tags: ["validTag", ""],
				}),
			);

			expect(result.current.isValid).toBe(false);
			expect(result.current.errors.tags).toBe("タグは1〜30文字で入力してください");
		});

		it("30文字を超えるタグはエラーになる", () => {
			const { result } = renderHook(() =>
				useAudioButtonValidation({
					title: "有効なタイトル",
					startTime: 10,
					endTime: 20,
					tags: ["validTag", "a".repeat(31)],
				}),
			);

			expect(result.current.isValid).toBe(false);
			expect(result.current.errors.tags).toBe("タグは1〜30文字で入力してください");
		});
	});

	describe("説明のバリデーション", () => {
		it("500文字を超える説明はエラーになる", () => {
			const { result } = renderHook(() =>
				useAudioButtonValidation({
					title: "有効なタイトル",
					startTime: 10,
					endTime: 20,
					description: "a".repeat(501),
				}),
			);

			expect(result.current.isValid).toBe(false);
			expect(result.current.errors.description).toBe("説明は500文字以下で入力してください");
		});
	});

	describe("時間の精度", () => {
		it("小数点以下の時間も正しく処理される", () => {
			const { result } = renderHook(() =>
				useAudioButtonValidation({
					title: "有効なタイトル",
					startTime: 10.1,
					endTime: 15.7,
				}),
			);

			expect(result.current.isValid).toBe(true);
			expect(result.current.duration).toBe(5.6);
		});

		it("時間の丸め処理が正しく行われる", () => {
			const { result } = renderHook(() =>
				useAudioButtonValidation({
					title: "有効なタイトル",
					startTime: 10.15,
					endTime: 15.75,
				}),
			);

			expect(result.current.isValid).toBe(true);
			expect(result.current.duration).toBe(5.6);
		});
	});
});
