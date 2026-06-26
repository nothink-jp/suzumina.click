/**
 * dlsite 同期 reads 計測（SPR-225 Stage 0 → P0 で一般化）のテスト
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
	getDlsiteReadMetrics,
	recordCreatorExistenceLookup,
	recordExistingMappingQuery,
	recordRecompute,
	recordRelationDeletes,
	recordRelationWrites,
	recordWorksMapRead,
	resetDlsiteReadMetrics,
} from "../dlsite-read-metrics";

const EMPTY = {
	worksMapQueries: 0,
	worksMapDocsRead: 0,
	existingMappingQueries: 0,
	existingMappingDocsRead: 0,
	creatorExistenceLookups: 0,
	recomputeCalls: 0,
	recomputeDocsRead: 0,
	relationWrites: 0,
	relationDeletes: 0,
};

describe("dlsite-read-metrics", () => {
	beforeEach(() => {
		resetDlsiteReadMetrics();
	});

	it("初期状態は全カウンタ 0", () => {
		expect(getDlsiteReadMetrics()).toEqual(EMPTY);
	});

	it("各 record が回数と docs 数を加算する（worksMap 含む）", () => {
		recordWorksMapRead(70, 2067);
		recordWorksMapRead(1, 4);
		recordExistingMappingQuery(3);
		recordExistingMappingQuery(2);
		recordCreatorExistenceLookup();
		recordRecompute(500);
		recordRecompute(10);
		recordRelationWrites(4);
		recordRelationDeletes(1);

		expect(getDlsiteReadMetrics()).toEqual({
			worksMapQueries: 71,
			worksMapDocsRead: 2071,
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
		recordWorksMapRead(70, 2000);
		recordRecompute(123);
		recordRelationWrites(2);
		resetDlsiteReadMetrics();

		expect(getDlsiteReadMetrics()).toEqual(EMPTY);
	});

	it("snapshot は内部状態のコピーを返す（変更しても影響しない）", () => {
		recordWorksMapRead(1, 5);
		const snapshot = getDlsiteReadMetrics();
		snapshot.worksMapDocsRead = 9999;

		expect(getDlsiteReadMetrics().worksMapDocsRead).toBe(5);
	});
});
