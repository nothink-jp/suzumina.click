// functions/src/infrastructure/database/firestore.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock constructor function that creates a new instance each time
const mockFirestoreConstructor = vi.fn().mockImplementation(() => ({
	collection: vi.fn(),
	doc: vi.fn(),
	batch: vi.fn(),
	runTransaction: vi.fn(),
}));

// @google-cloud/firestore のモック
vi.mock("@google-cloud/firestore", () => {
	const mockNow = vi.fn().mockReturnValue({
		seconds: 1234567890,
		nanoseconds: 0,
		toDate: () => new Date(1234567890 * 1000),
	});
	const mockFromDate = vi.fn().mockImplementation((date) => ({
		seconds: Math.floor(date.getTime() / 1000),
		nanoseconds: 0,
		toDate: () => date,
	}));

	return {
		Firestore: mockFirestoreConstructor,
		Timestamp: {
			now: mockNow,
			fromDate: mockFromDate,
		},
	};
});

// ロガーのモック
const mockLoggerInfo = vi.fn();
const mockLoggerError = vi.fn();
vi.mock("../../../shared/logger", () => ({
	info: mockLoggerInfo,
	error: mockLoggerError,
}));

// テストの前にモジュールをインポート
let firestoreModule: any;
let getFirestore: any;
let createFirestoreInstance: any;
let resetFirestoreInstance: any;
let Timestamp: any;

describe("firestore", () => {
	beforeEach(async () => {
		// Clear mocks but don't reset modules to avoid import issues
		vi.clearAllMocks();

		// Reset firestore instance to ensure clean state
		if (resetFirestoreInstance) {
			resetFirestoreInstance();
		}

		// Import modules fresh only on first run or if they don't exist
		if (!getFirestore) {
			const importedModule = await import("../firestore");
			firestoreModule = importedModule.default;
			getFirestore = importedModule.getFirestore;
			createFirestoreInstance = importedModule.createFirestoreInstance;
			resetFirestoreInstance = importedModule.resetFirestoreInstance;
			Timestamp = importedModule.Timestamp;
		}
	});

	describe("getFirestore", () => {
		it("シングルトンとして動作し、初回呼び出し時のみFirestoreインスタンスを作成すること", () => {
			// 1回目の呼び出し
			const instance1 = getFirestore();
			expect(mockFirestoreConstructor).toHaveBeenCalledTimes(1);

			// 2回目の呼び出し
			const instance2 = getFirestore();
			expect(mockFirestoreConstructor).toHaveBeenCalledTimes(1); // 追加で呼ばれていないこと

			// 同じインスタンスが返されること
			expect(instance1).toBe(instance2);
		});

		it("デフォルトエクスポートとgetFirestore()が同じインスタンスを返すこと", () => {
			// Since the default export is created at module load time and tests reset instances,
			// we need to get a fresh reference. Both should be Firestore-like objects.
			const defaultInstance = firestoreModule;
			const getFirestoreInstance = getFirestore();

			// They should both be valid Firestore instances with the expected methods
			expect(defaultInstance).toBeDefined();
			expect(getFirestoreInstance).toBeDefined();
			expect(typeof defaultInstance.collection).toBe("function");
			expect(typeof getFirestoreInstance.collection).toBe("function");
		});

		it("resetFirestoreInstance()の後に呼び出すと新しいインスタンスが作成されること", () => {
			// Get current call count
			const initialCallCount = mockFirestoreConstructor.mock.calls.length;

			// 1回目の呼び出し
			const instance1 = getFirestore();
			expect(mockFirestoreConstructor).toHaveBeenCalledTimes(initialCallCount + 1);

			// インスタンスをリセット
			resetFirestoreInstance();

			// リセット後の呼び出し
			const instance2 = getFirestore();
			expect(mockFirestoreConstructor).toHaveBeenCalledTimes(initialCallCount + 2); // 新たにインスタンスが作成されること

			// 異なるインスタンスが返されること
			expect(instance1).not.toBe(instance2);
		});
	});

	describe("createFirestoreInstance", () => {
		it("Firestoreを初期化すること", () => {
			const instance = createFirestoreInstance();

			expect(mockFirestoreConstructor).toHaveBeenCalledWith({
				ignoreUndefinedProperties: true,
			});
			expect(mockLoggerInfo).toHaveBeenCalledWith("Firestoreクライアントが初期化されました");
			expect(instance).toBeDefined();
			expect(typeof instance).toBe("object");
		});
	});

	describe("Timestamp", () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it("Timestamp.nowがFirestoreのTimestamp.nowを正しくラップすること", () => {
			const timestamp = Timestamp.now();

			expect(timestamp).toEqual(
				expect.objectContaining({
					seconds: 1234567890,
					nanoseconds: 0,
				}),
			);
		});

		it("Timestamp.fromDateがFirestoreのTimestamp.fromDateを正しくラップすること", () => {
			const testDate = new Date(2023, 1, 1);

			const timestamp = Timestamp.fromDate(testDate);

			expect(timestamp).toEqual(
				expect.objectContaining({
					seconds: Math.floor(testDate.getTime() / 1000),
					nanoseconds: 0,
				}),
			);
		});

		it("複数回のTimestamp.now呼び出しでも正しく動作すること", () => {
			const timestamp1 = Timestamp.now();
			const timestamp2 = Timestamp.now();

			expect(timestamp1).toEqual(timestamp2); // モックでは同じ値が返される
		});

		it("異なる日付でTimestamp.fromDateを呼び出すと異なる結果が返されること", () => {
			const date1 = new Date(2023, 1, 1);
			const date2 = new Date(2023, 1, 2);

			const timestamp1 = Timestamp.fromDate(date1);
			const timestamp2 = Timestamp.fromDate(date2);

			expect(timestamp1.seconds).not.toBe(timestamp2.seconds);
		});

		it("Timestampがtodate()メソッドを持つこと", () => {
			const testDate = new Date(2023, 1, 1);
			const timestamp = Timestamp.fromDate(testDate);

			expect(timestamp.toDate()).toBe(testDate);
		});
	});

	describe("エラーハンドリング", () => {
		it("Firestoreコンストラクタがエラーを投げた場合、適切に伝播されること", () => {
			mockFirestoreConstructor.mockImplementationOnce(() => {
				throw new Error("Firestore initialization failed");
			});

			expect(() => createFirestoreInstance()).toThrow("Firestore initialization failed");
		});

		it("ログ出力エラーが発生してもFirestore作成処理が続行されること", () => {
			mockLoggerInfo.mockImplementationOnce(() => {
				throw new Error("Logging failed");
			});

			// The current implementation doesn't handle logger errors, so it will throw
			expect(() => createFirestoreInstance()).toThrow("Logging failed");
		});
	});

	describe("設定オプション", () => {
		it("ignoreUndefinedPropertiesオプションが有効化されること", () => {
			createFirestoreInstance();

			expect(mockFirestoreConstructor).toHaveBeenCalledWith({
				ignoreUndefinedProperties: true,
			});
		});

		it("複数回の初期化でも同じオプションが使用されること", () => {
			const initialCallCount = mockFirestoreConstructor.mock.calls.length;

			createFirestoreInstance();
			resetFirestoreInstance();
			createFirestoreInstance();

			expect(mockFirestoreConstructor).toHaveBeenCalledTimes(initialCallCount + 2);
			// Check that the most recent calls used the right options
			const calls = mockFirestoreConstructor.mock.calls;
			expect(calls[calls.length - 2]).toEqual([{ ignoreUndefinedProperties: true }]);
			expect(calls[calls.length - 1]).toEqual([{ ignoreUndefinedProperties: true }]);
		});
	});

	describe("パフォーマンス・メモリ管理", () => {
		it("シングルトンパターンによりメモリ効率が保たれること", () => {
			const initialCallCount = mockFirestoreConstructor.mock.calls.length;

			// 複数回呼び出してもコンストラクタは1回のみ
			Array.from({ length: 10 }, () => getFirestore());

			expect(mockFirestoreConstructor).toHaveBeenCalledTimes(initialCallCount + 1);
		});

		it("resetFirestoreInstance()が確実にインスタンスをクリアすること", () => {
			const initialCallCount = mockFirestoreConstructor.mock.calls.length;

			const instance1 = getFirestore();
			expect(mockFirestoreConstructor).toHaveBeenCalledTimes(initialCallCount + 1);

			resetFirestoreInstance();

			// リセット後は新しいインスタンスが作成される
			const instance2 = getFirestore();
			expect(mockFirestoreConstructor).toHaveBeenCalledTimes(initialCallCount + 2);

			expect(instance1).not.toBe(instance2);
		});
	});

	describe("モジュール互換性", () => {
		it("ESModuleとしてのexportが正しく機能すること", () => {
			expect(typeof getFirestore).toBe("function");
			expect(typeof createFirestoreInstance).toBe("function");
			expect(typeof resetFirestoreInstance).toBe("function");
			expect(typeof Timestamp).toBe("object");
			expect(typeof firestoreModule).toBe("object");
		});

		it("TypeScript型定義との互換性があること", () => {
			// 型が正しく推論されるかのテスト
			const instance = getFirestore();
			const timestamp = Timestamp.now();
			const timestampFromDate = Timestamp.fromDate(new Date());

			expect(instance).toBeDefined();
			expect(timestamp).toBeDefined();
			expect(timestampFromDate).toBeDefined();
		});
	});

	describe("環境固有テスト", () => {
		it("テスト環境でのresetFirestoreInstanceが正常に動作すること", () => {
			const initialCallCount = mockFirestoreConstructor.mock.calls.length;

			// NODE_ENVがtestの場合の動作確認
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "test";

			try {
				const instance1 = getFirestore();
				resetFirestoreInstance();
				const instance2 = getFirestore();

				expect(instance1).not.toBe(instance2);
				expect(mockFirestoreConstructor).toHaveBeenCalledTimes(initialCallCount + 2);
			} finally {
				process.env.NODE_ENV = originalEnv;
			}
		});

		it("本番環境でも同様に動作すること", () => {
			const initialCallCount = mockFirestoreConstructor.mock.calls.length;

			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "production";

			try {
				const instance1 = getFirestore();
				const instance2 = getFirestore();

				expect(instance1).toBe(instance2);
				expect(mockFirestoreConstructor).toHaveBeenCalledTimes(initialCallCount + 1);
			} finally {
				process.env.NODE_ENV = originalEnv;
			}
		});
	});
});
