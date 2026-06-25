/**
 * creator 同期 reads 計測（SPR-225 Stage 0）のテスト
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
	getCreatorSyncMetrics,
	recordCreatorExistenceLookup,
	recordExistingMappingQuery,
	recordRecompute,
	recordRelationDeletes,
	recordRelationWrites,
	resetCreatorSyncMetrics,
} from "../creator-sync-metrics";

describe("creator-sync-metrics", () => {
	beforeEach(() => {
		resetCreatorSyncMetrics();
	});

	it("初期状態は全カウンタ 0", () => {
		expect(getCreatorSyncMetrics()).toEqual({
			existingMappingQueries: 0,
			existingMappingDocsRead: 0,
			creatorExistenceLookups: 0,
			recomputeCalls: 0,
			recomputeDocsRead: 0,
			relationWrites: 0,
			relationDeletes: 0,
		});
	});

	it("各 record が回数と docs 数を加算する", () => {
		recordExistingMappingQuery(3);
		recordExistingMappingQuery(2);
		recordCreatorExistenceLookup();
		recordRecompute(500);
		recordRecompute(10);
		recordRelationWrites(4);
		recordRelationDeletes(1);

		expect(getCreatorSyncMetrics()).toEqual({
			existingMappingQueries: 2,
			existingMappingDocsRead: 5,
			creatorExistenceLookups: 1,
			recomputeCalls: 2,
			recomputeDocsRead: 510,
			relationWrites: 4,
			relationDeletes: 1,
		});
	});

	it("reset で前 run の値をクリアする", () => {
		recordRecompute(123);
		recordRelationWrites(2);
		resetCreatorSyncMetrics();

		expect(getCreatorSyncMetrics()).toEqual({
			existingMappingQueries: 0,
			existingMappingDocsRead: 0,
			creatorExistenceLookups: 0,
			recomputeCalls: 0,
			recomputeDocsRead: 0,
			relationWrites: 0,
			relationDeletes: 0,
		});
	});

	it("snapshot は内部状態のコピーを返す（変更しても影響しない）", () => {
		recordRecompute(5);
		const snapshot = getCreatorSyncMetrics();
		snapshot.recomputeDocsRead = 9999;

		expect(getCreatorSyncMetrics().recomputeDocsRead).toBe(5);
	});
});
