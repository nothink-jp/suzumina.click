/**
 * creator 再計算キュー（SPR-225 Stage 1）のテスト
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
	enqueueChangedCreators,
	queuedCreatorCount,
	resetCreatorRecomputeQueue,
	takeQueuedCreators,
} from "../creator-recompute-queue";

describe("creator-recompute-queue", () => {
	beforeEach(() => {
		resetCreatorRecomputeQueue();
	});

	it("初期状態は空", () => {
		expect(queuedCreatorCount()).toBe(0);
		expect(takeQueuedCreators()).toEqual([]);
	});

	it("enqueue した creator を重複排除して保持する", () => {
		enqueueChangedCreators(["VA001", "VA002"]);
		enqueueChangedCreators(["VA002", "VA003"]);

		expect(queuedCreatorCount()).toBe(3);
		expect(new Set(takeQueuedCreators())).toEqual(new Set(["VA001", "VA002", "VA003"]));
	});

	it("take はキューを空にする（2回目は空配列）", () => {
		enqueueChangedCreators(["VA001"]);

		expect(takeQueuedCreators()).toEqual(["VA001"]);
		expect(takeQueuedCreators()).toEqual([]);
		expect(queuedCreatorCount()).toBe(0);
	});

	it("reset で積んだ creator をクリアする", () => {
		enqueueChangedCreators(["VA001", "VA002"]);
		resetCreatorRecomputeQueue();

		expect(queuedCreatorCount()).toBe(0);
	});

	it("Set など任意の Iterable を受け付ける", () => {
		enqueueChangedCreators(new Set(["VA001", "VA001", "VA002"]));

		expect(queuedCreatorCount()).toBe(2);
	});
});
