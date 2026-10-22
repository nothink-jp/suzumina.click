/**
 * DLsite 統合データ収集エンドポイントのテスト（SPR-229: computeDueWorkIds / resolveCycleInfo /
 * fetchDLsiteUnifiedData 中心・SPR-368: 重複配信の判定 claimUnifiedRunEvent）
 *
 * レビュー指摘（この専用エンドポイントに直接のテストが無い）への対応。
 * computeDueWorkIds/resolveCycleInfoの単体テストに加え、fetchDLsiteUnifiedDataの
 * エントリポイントを外部依存（Firestore・スクレイプ・DLsite API呼び出し・統合処理）を
 * モックしたうえで新規サイクル/継続run/週次フルスイープ/エラー経路について検証する。
 */

import type {
	CollectionMetadata,
	DLsiteApiResponse,
	WorkDocument,
} from "@suzumina.click/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../infrastructure/database/firestore", () => {
	const updateMock = vi.fn().mockResolvedValue(undefined);
	const getMock = vi.fn().mockResolvedValue({ exists: false });
	const docRef = { update: updateMock, get: getMock, create: vi.fn() };
	const collection = vi.fn(() => ({ doc: vi.fn(() => docRef) }));
	// SPR-368: claimUnifiedRunEvent が使うトランザクション
	const transaction = { get: vi.fn(), update: vi.fn(), set: vi.fn() };
	const runTransaction = vi.fn(async (fn: (tx: typeof transaction) => unknown) => fn(transaction));

	return {
		default: { collection, getAll: vi.fn(), runTransaction },
		Timestamp: { now: vi.fn(() => ({ seconds: 0, nanoseconds: 0 })) },
		__updateMock: updateMock,
		__getMock: getMock,
		__transaction: transaction,
	};
});

vi.mock("../../../services/price-history", () => ({
	bulkCheckPriceHistoryExistsToday: vi.fn().mockResolvedValue(new Set()),
	getJSTDate: vi.fn(() => "2026-07-05"),
	savePriceHistory: vi.fn(),
}));

vi.mock("../../../services/dlsite/work-id-collector", () => ({
	collectWorkIdsForProduction: vi.fn(),
}));

vi.mock("../../../services/dlsite/dlsite-firestore", () => ({
	getExistingWorksMap: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock("../../../services/dlsite/individual-info-api-client", () => ({
	batchFetchIndividualInfo: vi.fn(),
}));

vi.mock("../../../services/dlsite/unified-data-processor", () => ({
	processBatchUnifiedDLsiteData: vi.fn(),
}));

vi.mock("../../../services/dlsite/creator-firestore", () => ({
	recomputeCreatorStats: vi.fn(),
}));

vi.mock("../../../services/dlsite/creator-recompute-queue", () => ({
	resetCreatorRecomputeQueue: vi.fn(),
	takeQueuedCreators: vi.fn(() => []),
}));

vi.mock("../../../services/dlsite/dlsite-read-metrics", () => ({
	resetDlsiteReadMetrics: vi.fn(),
	getDlsiteReadMetrics: vi.fn(() => ({})),
}));

vi.mock("../../../shared/logger", () => ({
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
}));

const { fetchDLsiteUnifiedData } = await import("../fetch-dlsite-unified-data");
const { claimUnifiedRunEvent } = await import("../collection-metadata");
const logger = vi.mocked(await import("../../../shared/logger"));
const { computeDueWorkIds, resolveCycleInfo } = await import("../run-unified-data-collection");
const { bulkCheckPriceHistoryExistsToday } = await import("../../../services/price-history");
const { collectWorkIdsForProduction } = await import("../../../services/dlsite/work-id-collector");
const { getExistingWorksMap } = await import("../../../services/dlsite/dlsite-firestore");
const { batchFetchIndividualInfo } = await import(
	"../../../services/dlsite/individual-info-api-client"
);
const { processBatchUnifiedDLsiteData } = await import(
	"../../../services/dlsite/unified-data-processor"
);
const firestoreMock = vi.mocked(await import("../../../infrastructure/database/firestore"));
const updateMock = (firestoreMock as unknown as { __updateMock: ReturnType<typeof vi.fn> })
	.__updateMock;
const getMetadataMock = (firestoreMock as unknown as { __getMock: ReturnType<typeof vi.fn> })
	.__getMock;
const transactionMock = (
	firestoreMock as unknown as {
		__transaction: Record<"get" | "update" | "set", ReturnType<typeof vi.fn>>;
	}
).__transaction;
const runTransactionMock = vi.mocked(firestoreMock.default.runTransaction);

/** トランザクション内で読まれるメタデータ doc（recentEventIds の判定対象） */
function metadataSnapshot(recentEventIds?: string[]) {
	return {
		exists: true,
		data: () => ({ isInProgress: false, lastFetchedAt: null, recentEventIds }),
	};
}

function makeApiResponse(workno: string): DLsiteApiResponse {
	return { workno, work_name: `テスト作品${workno}`, price: 1000 } as unknown as DLsiteApiResponse;
}

// 本番GCFv2（Eventarc経由）と同じMessagePublishedData envelope（message一段ネスト）で
// 組み立てる。平坦形（event.data.data直下）でモックするとテストだけ通って本番で
// mode検出が縮退する（SPR-229/230の週次フルスイープ未発火の回帰）。
// id は Pub/Sub の messageId（重複配信では同じ id が再び届く・SPR-368）。
function pubsubEvent(payload?: Record<string, unknown>, id = "message-1") {
	return {
		id,
		type: "google.cloud.pubsub.topic.v1.messagePublished",
		data: payload
			? { message: { data: Buffer.from(JSON.stringify(payload)).toString("base64") } }
			: undefined,
	} as unknown as Parameters<typeof fetchDLsiteUnifiedData>[0];
}

function makeWork(overrides: Partial<WorkDocument> = {}): WorkDocument {
	return {
		productId: "RJ000000",
		releaseDateISO: "2020-01-01T00:00:00Z", // 十分に古い日付（デフォルトはstable）
		salesStatus: { isSale: false, isSoldOut: false },
		...overrides,
	} as WorkDocument;
}

function makeMetadata(overrides: Partial<CollectionMetadata> = {}): CollectionMetadata {
	return {
		lastFetchedAt: null,
		isInProgress: false,
		...overrides,
	} as CollectionMetadata;
}

describe("computeDueWorkIds", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		delete process.env.DLSITE_TIER_FILTERING_ENABLED;
	});

	it("DLSITE_TIER_FILTERING_ENABLED=falseの場合、全件を対象にしtieredはnullになる", async () => {
		process.env.DLSITE_TIER_FILTERING_ENABLED = "false";
		const result = await computeDueWorkIds(["RJ001", "RJ002"], new Map(), false);

		expect(result.dueWorkIds).toEqual(["RJ001", "RJ002"]);
		expect(result.tiered).toBeNull();
		expect(bulkCheckPriceHistoryExistsToday).not.toHaveBeenCalled();
	});

	it("通常runでは new/volatile/stable(due) のみをdue-setに含め、stable(skip)を除外する", async () => {
		const existingWorksMap = new Map<string, WorkDocument>([
			["RJ_STABLE_SKIP", makeWork({ productId: "RJ_STABLE_SKIP" })],
			[
				"RJ_VOLATILE",
				makeWork({ productId: "RJ_VOLATILE", salesStatus: { isSale: true, isSoldOut: false } }),
			],
		]);
		vi.mocked(bulkCheckPriceHistoryExistsToday).mockResolvedValue(new Set(["RJ_STABLE_SKIP"]));

		const result = await computeDueWorkIds(
			["RJ_NEW", "RJ_VOLATILE", "RJ_STABLE_SKIP"],
			existingWorksMap,
			false,
		);

		expect(result.dueWorkIds).toEqual(["RJ_NEW", "RJ_VOLATILE"]);
		expect(result.tiered?.stableSkippedIds).toEqual(["RJ_STABLE_SKIP"]);
	});

	it("forceFullSweep=trueの場合、stable(skip)も含め全件をdue-setにするがtieredは計算する", async () => {
		const existingWorksMap = new Map<string, WorkDocument>([
			["RJ_STABLE_SKIP", makeWork({ productId: "RJ_STABLE_SKIP" })],
		]);
		vi.mocked(bulkCheckPriceHistoryExistsToday).mockResolvedValue(new Set(["RJ_STABLE_SKIP"]));

		const result = await computeDueWorkIds(["RJ_NEW", "RJ_STABLE_SKIP"], existingWorksMap, true);

		expect(result.dueWorkIds).toEqual(["RJ_NEW", "RJ_STABLE_SKIP"]);
		expect(result.tiered?.stableSkippedIds).toEqual(["RJ_STABLE_SKIP"]);
	});

	it("bulkCheckPriceHistoryExistsTodayにはstable候補のみを渡す（new/volatileは対象外）", async () => {
		const existingWorksMap = new Map<string, WorkDocument>([
			[
				"RJ_VOLATILE",
				makeWork({ productId: "RJ_VOLATILE", salesStatus: { isSale: true, isSoldOut: false } }),
			],
			["RJ_STABLE", makeWork({ productId: "RJ_STABLE" })],
		]);
		vi.mocked(bulkCheckPriceHistoryExistsToday).mockResolvedValue(new Set());

		await computeDueWorkIds(["RJ_NEW", "RJ_VOLATILE", "RJ_STABLE"], existingWorksMap, false);

		expect(bulkCheckPriceHistoryExistsToday).toHaveBeenCalledWith(["RJ_STABLE"], "2026-07-05");
	});
});

describe("resolveCycleInfo（継続run分岐）", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("継続run中はティア再判定をせず、保存済みallWorkIdsをそのまま使う", async () => {
		const metadata = makeMetadata({ isFullSweepCycle: false });
		const continuationInfo = {
			isContinuation: true as const,
			allWorkIds: ["RJ001", "RJ002"],
			startBatch: 1,
		};

		const result = await resolveCycleInfo(metadata, continuationInfo, false);

		expect(result?.allWorkIds).toEqual(["RJ001", "RJ002"]);
		expect(result?.startBatch).toBe(1);
		expect(result?.wouldSkipStableIds).toBeUndefined();
	});

	it("継続run中でisFullSweepCycleかつfullSweepWouldSkipWorkIdsがあればwouldSkipStableIdsを復元する", async () => {
		const metadata = makeMetadata({
			isFullSweepCycle: true,
			fullSweepWouldSkipWorkIds: ["RJ_STABLE_SKIP"],
		});
		const continuationInfo = {
			isContinuation: true as const,
			allWorkIds: ["RJ001"],
			startBatch: 0,
		};

		const result = await resolveCycleInfo(metadata, continuationInfo, false);

		expect(result?.wouldSkipStableIds).toEqual(new Set(["RJ_STABLE_SKIP"]));
	});

	it("週次フルスイープが継続run中に発火した場合、pendingFullSweepをFirestoreに記録し前サイクルのまま継続する", async () => {
		const metadata = makeMetadata({ isFullSweepCycle: false });
		const continuationInfo = {
			isContinuation: true as const,
			allWorkIds: ["RJ001"],
			startBatch: 0,
		};

		const result = await resolveCycleInfo(metadata, continuationInfo, true);

		// 前サイクル（tieredモード）のまま継続する = 週次フルスイープはこのrunには反映されない
		expect(result?.allWorkIds).toEqual(["RJ001"]);
		// ただし次の新規サイクルで拾い直せるようpendingFullSweep:trueが書き込まれる
		expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ pendingFullSweep: true }));
	});

	it("週次フルスイープでなければpendingFullSweepは書き込まれない", async () => {
		const metadata = makeMetadata();
		const continuationInfo = {
			isContinuation: true as const,
			allWorkIds: ["RJ001"],
			startBatch: 0,
		};

		await resolveCycleInfo(metadata, continuationInfo, false);

		expect(updateMock).not.toHaveBeenCalled();
	});
});

describe("fetchDLsiteUnifiedData（エントリポイント統合）", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getMetadataMock.mockResolvedValue({ exists: false });
		transactionMock.get.mockResolvedValue({ exists: false });
		vi.mocked(bulkCheckPriceHistoryExistsToday).mockResolvedValue(new Set());
		vi.mocked(getExistingWorksMap).mockResolvedValue(new Map());
		vi.mocked(processBatchUnifiedDLsiteData).mockImplementation(async (apiResponses) =>
			apiResponses.map((r) => ({
				workId: r.workno ?? "UNKNOWN",
				success: true,
				updates: { work: true, circle: true, creators: true, priceHistory: true },
				errors: [],
			})),
		);
	});

	it("新規サイクルで全件newの場合、収集した作品を全件取得・処理して正常完了する", async () => {
		vi.mocked(collectWorkIdsForProduction).mockResolvedValue(["RJ001", "RJ002"]);
		vi.mocked(batchFetchIndividualInfo).mockResolvedValue({
			results: new Map([
				["RJ001", makeApiResponse("RJ001")],
				["RJ002", makeApiResponse("RJ002")],
			]),
			failedWorkIds: [],
		});

		await fetchDLsiteUnifiedData(pubsubEvent());

		expect(collectWorkIdsForProduction).toHaveBeenCalledTimes(1);
		expect(batchFetchIndividualInfo).toHaveBeenCalledWith(["RJ001", "RJ002"], expect.any(Object));
		expect(processBatchUnifiedDLsiteData).toHaveBeenCalled();
		// 完走後、batchProcessingModeがfalseへ戻される（finalizeCompletedProcessing）
		expect(updateMock).toHaveBeenCalledWith(
			expect.objectContaining({ batchProcessingMode: false }),
		);
	});

	it("stableかつ当日分priceHistoryが既にある作品は通常runのdue-setから除外される", async () => {
		const existingWorksMap = new Map<string, WorkDocument>([
			[
				"RJ_STABLE_SKIP",
				{
					productId: "RJ_STABLE_SKIP",
					releaseDateISO: "2020-01-01T00:00:00Z",
					salesStatus: { isSale: false, isSoldOut: false },
				} as WorkDocument,
			],
		]);
		vi.mocked(collectWorkIdsForProduction).mockResolvedValue(["RJ_NEW", "RJ_STABLE_SKIP"]);
		vi.mocked(getExistingWorksMap).mockResolvedValue(existingWorksMap);
		vi.mocked(bulkCheckPriceHistoryExistsToday).mockResolvedValue(new Set(["RJ_STABLE_SKIP"]));
		vi.mocked(batchFetchIndividualInfo).mockResolvedValue({
			results: new Map([["RJ_NEW", makeApiResponse("RJ_NEW")]]),
			failedWorkIds: [],
		});

		await fetchDLsiteUnifiedData(pubsubEvent());

		// stable-skip作品はAPI取得対象から除外される
		expect(batchFetchIndividualInfo).toHaveBeenCalledWith(["RJ_NEW"], expect.any(Object));
	});

	it("週次フルスイープ（mode=weekly_full_sweep）ではstable(skip)相当も含め全件を取得する", async () => {
		const existingWorksMap = new Map<string, WorkDocument>([
			[
				"RJ_STABLE_SKIP",
				{
					productId: "RJ_STABLE_SKIP",
					releaseDateISO: "2020-01-01T00:00:00Z",
					salesStatus: { isSale: false, isSoldOut: false },
				} as WorkDocument,
			],
		]);
		vi.mocked(collectWorkIdsForProduction).mockResolvedValue(["RJ_NEW", "RJ_STABLE_SKIP"]);
		vi.mocked(getExistingWorksMap).mockResolvedValue(existingWorksMap);
		vi.mocked(bulkCheckPriceHistoryExistsToday).mockResolvedValue(new Set(["RJ_STABLE_SKIP"]));
		vi.mocked(batchFetchIndividualInfo).mockResolvedValue({
			results: new Map([
				["RJ_NEW", makeApiResponse("RJ_NEW")],
				["RJ_STABLE_SKIP", makeApiResponse("RJ_STABLE_SKIP")],
			]),
			failedWorkIds: [],
		});

		await fetchDLsiteUnifiedData(pubsubEvent({ mode: "weekly_full_sweep" }));

		// 週次フルスイープなのでstable-skip相当も含め全件取得する
		const [calledWorkIds] = vi.mocked(batchFetchIndividualInfo).mock.calls[0] ?? [];
		expect(calledWorkIds).toEqual(expect.arrayContaining(["RJ_NEW", "RJ_STABLE_SKIP"]));
	});

	it("継続run（batchProcessingMode=true）では作品ID収集をスキップし保存済みバッチを再開する", async () => {
		getMetadataMock.mockResolvedValue({
			exists: true,
			data: () => ({
				isInProgress: true,
				batchProcessingMode: true,
				allWorkIds: ["RJ001"],
				currentBatch: 0,
				totalBatches: 1,
			}),
		});
		vi.mocked(batchFetchIndividualInfo).mockResolvedValue({
			results: new Map([["RJ001", makeApiResponse("RJ001")]]),
			failedWorkIds: [],
		});

		await fetchDLsiteUnifiedData(pubsubEvent());

		expect(collectWorkIdsForProduction).not.toHaveBeenCalled();
		expect(batchFetchIndividualInfo).toHaveBeenCalledWith(["RJ001"], expect.any(Object));
	});

	it("作品ID収集が失敗した場合、runを中断しエラーを記録する（例外を投げない）", async () => {
		vi.mocked(collectWorkIdsForProduction).mockRejectedValue(new Error("scrape failed"));

		await expect(fetchDLsiteUnifiedData(pubsubEvent())).resolves.toBeUndefined();

		expect(batchFetchIndividualInfo).not.toHaveBeenCalled();
	});

	describe("重複配信（SPR-368）", () => {
		it("初めて見る event.id なら記録してから run を走らせ、開始ログに eventId を出す", async () => {
			vi.mocked(collectWorkIdsForProduction).mockResolvedValue(["RJ001"]);
			vi.mocked(batchFetchIndividualInfo).mockResolvedValue({
				results: new Map([["RJ001", makeApiResponse("RJ001")]]),
				failedWorkIds: [],
			});

			await fetchDLsiteUnifiedData(pubsubEvent(undefined, "message-new"));

			expect(transactionMock.set).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ recentEventIds: ["message-new"] }),
			);
			expect(logger.info).toHaveBeenCalledWith(
				"統合データ収集開始",
				expect.objectContaining({ eventId: "message-new" }),
			);
			expect(collectWorkIdsForProduction).toHaveBeenCalledTimes(1);
		});

		it("記録済みの event.id なら run を走らせず、開始ログも出さずに正常終了する（= ack）", async () => {
			transactionMock.get.mockResolvedValue(metadataSnapshot(["message-dup"]));

			await expect(
				fetchDLsiteUnifiedData(pubsubEvent(undefined, "message-dup")),
			).resolves.toBeUndefined();

			expect(collectWorkIdsForProduction).not.toHaveBeenCalled();
			expect(getMetadataMock).not.toHaveBeenCalled();
			expect(logger.info).not.toHaveBeenCalledWith("統合データ収集開始", expect.anything());
			expect(logger.warn).toHaveBeenCalledWith(
				"重複配信のため統合データ収集をスキップ",
				expect.objectContaining({ eventId: "message-dup" }),
			);
		});

		it("重複判定が失敗したら run を走らせず、例外を投げずにエラーを記録する", async () => {
			runTransactionMock.mockRejectedValueOnce(new Error("firestore unavailable"));

			await expect(fetchDLsiteUnifiedData(pubsubEvent())).resolves.toBeUndefined();

			expect(collectWorkIdsForProduction).not.toHaveBeenCalled();
			expect(updateMock).toHaveBeenCalledWith(
				expect.objectContaining({ isInProgress: false, lastError: "firestore unavailable" }),
			);
		});
	});
});

describe("claimUnifiedRunEvent（SPR-368）", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("初めて見る id は新しい順の先頭に足し、直近 5 件だけを残す", async () => {
		transactionMock.get.mockResolvedValue(metadataSnapshot(["m5", "m4", "m3", "m2", "m1"]));

		await expect(claimUnifiedRunEvent("m6")).resolves.toBe(true);

		expect(transactionMock.update).toHaveBeenCalledWith(expect.anything(), {
			recentEventIds: ["m6", "m5", "m4", "m3", "m2"],
		});
	});

	it("記録済みの id なら false を返し、何も書き込まない", async () => {
		transactionMock.get.mockResolvedValue(metadataSnapshot(["m2", "m1"]));

		await expect(claimUnifiedRunEvent("m1")).resolves.toBe(false);

		expect(transactionMock.update).not.toHaveBeenCalled();
		expect(transactionMock.set).not.toHaveBeenCalled();
	});

	it("recentEventIds を持たない既存 doc では、その id だけを記録する", async () => {
		transactionMock.get.mockResolvedValue(metadataSnapshot(undefined));

		await expect(claimUnifiedRunEvent("m1")).resolves.toBe(true);

		expect(transactionMock.update).toHaveBeenCalledWith(expect.anything(), {
			recentEventIds: ["m1"],
		});
	});

	it("メタデータ doc が無ければ初期値と一緒に作成する", async () => {
		transactionMock.get.mockResolvedValue({ exists: false });

		await expect(claimUnifiedRunEvent("m1")).resolves.toBe(true);

		expect(transactionMock.set).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ isInProgress: false, recentEventIds: ["m1"] }),
		);
	});

	it("id が空なら判定できないので、記録せずに true を返す", async () => {
		await expect(claimUnifiedRunEvent("")).resolves.toBe(true);

		expect(runTransactionMock).not.toHaveBeenCalled();
	});
});
