/**
 * Migration Scripts Basic Tests
 *
 * 移行スクリプトの基本的な動作確認テスト
 */

import { describe, expect, it, vi } from "vitest";

// テスト環境でFirestoreを許可
process.env.NODE_ENV = "test";
process.env.ALLOW_TEST_FIRESTORE = "true";

// モックの設定
const mockFirestore = {
	collection: vi.fn(),
	batch: vi.fn(() => ({
		update: vi.fn(),
		commit: vi.fn(),
	})),
	runTransaction: vi.fn(),
};

vi.mock("../../infrastructure/database/firestore", () => ({
	getFirestore: vi.fn(() => mockFirestore),
	default: {
		get collection() {
			return mockFirestore.collection;
		},
		get batch() {
			return mockFirestore.batch;
		},
		get runTransaction() {
			return mockFirestore.runTransaction;
		},
	},
}));

vi.mock("node:child_process", () => ({
	execSync: vi.fn(() => "mocked output"),
}));

vi.mock("firebase-admin/firestore", () => ({
	FieldValue: {
		delete: vi.fn(() => "DELETE_FIELD"),
	},
}));

describe("Migration Scripts", () => {
	describe("Import Tests", () => {
		it("should import FirestoreBackupService", async () => {
			const { FirestoreBackupService } = await import("../backup-firestore");
			expect(FirestoreBackupService).toBeDefined();
		});

		it("should import MigrationRollbackService", async () => {
			const { MigrationRollbackService } = await import("../rollback-v2-migration");
			expect(MigrationRollbackService).toBeDefined();
		});

		it("should import MigrationValidationService", async () => {
			const { MigrationValidationService } = await import("../validate-v2-migration");
			expect(MigrationValidationService).toBeDefined();
		});

		it("should import ProductionMigrationExecutor", async () => {
			const { ProductionMigrationExecutor } = await import("../execute-migration");
			expect(ProductionMigrationExecutor).toBeDefined();
		});
	});

	describe("Service Instantiation", () => {
		it("should create FirestoreBackupService instance", async () => {
			const { FirestoreBackupService } = await import("../backup-firestore");
			const service = new FirestoreBackupService({
				projectId: "test-project",
				bucketName: "test-bucket",
				collections: ["test"],
				dryRun: true,
			});
			expect(service).toBeDefined();
		});

		it("should create MigrationRollbackService instance", async () => {
			const { MigrationRollbackService } = await import("../rollback-v2-migration");
			const service = new MigrationRollbackService({
				collections: ["test"],
				dryRun: true,
			});
			expect(service).toBeDefined();
		});

		it("should create MigrationValidationService instance", async () => {
			const { MigrationValidationService } = await import("../validate-v2-migration");
			const service = new MigrationValidationService({
				collections: ["test"],
			});
			expect(service).toBeDefined();
		});

		it("should create ProductionMigrationExecutor instance", async () => {
			const { ProductionMigrationExecutor } = await import("../execute-migration");
			const executor = new ProductionMigrationExecutor();
			expect(executor).toBeDefined();
		});
	});
});
