import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, getUserRateLimitInfo, incrementButtonCount } from "../rate-limit-actions";

// Firestoreのモック
const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockRunTransaction = vi.fn();

vi.mock("@/lib/firestore", () => ({
	getFirestore: () => ({
		collection: () => ({
			doc: () => ({
				get: mockGet,
				update: mockUpdate,
			}),
		}),
		runTransaction: mockRunTransaction,
	}),
}));

// rate-limit-utilsのモック
vi.mock("@/lib/rate-limit-utils", () => ({
	getJSTDateString: vi.fn(() => "2024-01-01"),
	calculateDailyLimit: vi.fn((flags) => (flags?.isFamilyMember ? 110 : 10)),
}));

describe("rate-limit-actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("checkRateLimit", () => {
		it("ユーザーが存在しない場合は制限情報を返すこと", async () => {
			mockGet.mockResolvedValue({ exists: false });

			const result = await checkRateLimit("test-user");

			expect(result).toEqual({
				canCreate: false,
				current: 0,
				limit: 0,
				remaining: 0,
				isFamilyMember: false,
			});
		});

		it("日付が変わっていたら自動リセットされること", async () => {
			mockGet.mockResolvedValue({
				exists: true,
				data: () => ({
					dailyButtonLimit: {
						date: "2023-12-31",
						count: 5,
						limit: 10,
						guildChecked: true,
					},
					flags: {
						isFamilyMember: false,
					},
				}),
			});

			const result = await checkRateLimit("test-user");

			expect(result).toEqual({
				canCreate: true,
				current: 0,
				limit: 10,
				remaining: 10,
				isFamilyMember: false,
			});
		});

		it("同日の場合は現在の状態を返すこと", async () => {
			mockGet.mockResolvedValue({
				exists: true,
				data: () => ({
					dailyButtonLimit: {
						date: "2024-01-01",
						count: 3,
						limit: 10,
						guildChecked: false,
					},
					flags: {
						isFamilyMember: false,
					},
				}),
			});

			const result = await checkRateLimit("test-user");

			expect(result).toEqual({
				canCreate: true,
				current: 3,
				limit: 10,
				remaining: 7,
				isFamilyMember: false,
			});
		});

		it("上限に達している場合はcanCreateがfalseになること", async () => {
			mockGet.mockResolvedValue({
				exists: true,
				data: () => ({
					dailyButtonLimit: {
						date: "2024-01-01",
						count: 10,
						limit: 10,
						guildChecked: false,
					},
					flags: {
						isFamilyMember: false,
					},
				}),
			});

			const result = await checkRateLimit("test-user");

			expect(result).toEqual({
				canCreate: false,
				current: 10,
				limit: 10,
				remaining: 0,
				isFamilyMember: false,
			});
		});

		it("ファミリーメンバーの場合は正しい制限が適用されること", async () => {
			mockGet.mockResolvedValue({
				exists: true,
				data: () => ({
					dailyButtonLimit: {
						date: "2024-01-01",
						count: 50,
						limit: 110,
						guildChecked: true,
					},
					flags: {
						isFamilyMember: true,
					},
				}),
			});

			const result = await checkRateLimit("test-user");

			expect(result).toEqual({
				canCreate: true,
				current: 50,
				limit: 110,
				remaining: 60,
				isFamilyMember: true,
			});
		});
	});

	describe("incrementButtonCount", () => {
		it("カウントが正常に増加すること", async () => {
			const mockTransaction = {
				get: vi.fn().mockResolvedValue({
					exists: true,
					data: () => ({
						dailyButtonLimit: {
							date: "2024-01-01",
							count: 3,
							limit: 10,
							guildChecked: false,
						},
						flags: {
							isFamilyMember: false,
						},
					}),
				}),
				update: vi.fn(),
			};

			mockRunTransaction.mockImplementation(async (callback) => {
				return await callback(mockTransaction);
			});

			const result = await incrementButtonCount("test-user");

			expect(result).toBe(true);
			expect(mockTransaction.update).toHaveBeenCalledWith(expect.anything(), {
				"dailyButtonLimit.count": 4,
			});
		});

		it("日付が変わっていたらリセットして1にすること", async () => {
			const mockTransaction = {
				get: vi.fn().mockResolvedValue({
					exists: true,
					data: () => ({
						dailyButtonLimit: {
							date: "2023-12-31",
							count: 5,
							limit: 10,
							guildChecked: true,
						},
						flags: {
							isFamilyMember: false,
						},
					}),
				}),
				update: vi.fn(),
			};

			mockRunTransaction.mockImplementation(async (callback) => {
				return await callback(mockTransaction);
			});

			const result = await incrementButtonCount("test-user");

			expect(result).toBe(true);
			expect(mockTransaction.update).toHaveBeenCalledWith(expect.anything(), {
				dailyButtonLimit: {
					date: "2024-01-01",
					count: 1,
					limit: 10,
					guildChecked: false,
				},
			});
		});

		it("上限に達している場合はfalseを返すこと", async () => {
			const mockTransaction = {
				get: vi.fn().mockResolvedValue({
					exists: true,
					data: () => ({
						dailyButtonLimit: {
							date: "2024-01-01",
							count: 10,
							limit: 10,
							guildChecked: false,
						},
						flags: {
							isFamilyMember: false,
						},
					}),
				}),
				update: vi.fn(),
			};

			mockRunTransaction.mockImplementation(async (callback) => {
				return await callback(mockTransaction);
			});

			const result = await incrementButtonCount("test-user");

			expect(result).toBe(false);
			expect(mockTransaction.update).not.toHaveBeenCalled();
		});

		it("ユーザーが存在しない場合はfalseを返すこと", async () => {
			const mockTransaction = {
				get: vi.fn().mockResolvedValue({
					exists: false,
				}),
				update: vi.fn(),
			};

			mockRunTransaction.mockImplementation(async (callback) => {
				return await callback(mockTransaction);
			});

			const result = await incrementButtonCount("test-user");

			expect(result).toBe(false);
			expect(mockTransaction.update).not.toHaveBeenCalled();
		});
	});

	describe("getUserRateLimitInfo", () => {
		it("正常にレート制限情報を取得できること", async () => {
			mockGet.mockResolvedValue({
				exists: true,
				data: () => ({
					dailyButtonLimit: {
						date: "2024-01-01",
						count: 3,
						limit: 10,
						guildChecked: false,
					},
					flags: {
						isFamilyMember: false,
					},
				}),
			});

			const result = await getUserRateLimitInfo("test-user");

			expect(result).toEqual({
				canCreate: true,
				current: 3,
				limit: 10,
				remaining: 7,
				isFamilyMember: false,
			});
		});

		it("エラーが発生した場合はnullを返すこと", async () => {
			mockGet.mockRejectedValue(new Error("Firestore error"));

			const result = await getUserRateLimitInfo("test-user");

			expect(result).toBe(null);
		});
	});
});
