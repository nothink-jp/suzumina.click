/**
 * DLsite 統合データ収集エンドポイントのテスト（SPR-229: computeDueWorkIds / resolveCycleInfo /
 * fetchDLsiteUnifiedData 中心・SPR-368: 重複配信の判定。判定そのものは shared/__tests__/run-metadata.test.ts）
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
	// SPR-368: claimRunEvent（shared/run-metadata）が使うトランザクション
	const transaction = { get: vi.fn(), update: vi.fn(), set: vi.fn() };
	const runTransaction = vi.fn(async (fn: (tx: typeof transaction) => unknown) => fn(transaction));

	return {
		default: { collection, getAll: vi.fn(), runTransaction },
		Timestamp: {
			now: vi.fn(() => ({ seconds: 0, nanoseconds: 0 })),
			fromMillis: (ms: number) => ({ toMillis: () => ms }),
		},
		FieldValue: { delete: () => "__delete__" },
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

const { fetchDLsiteUnifiedData, runUnifiedDataCollectionWithReport, WEEKLY_FULL_SWEEP_MODE } =
	await import("../fetch-dlsite-unified-data");
const logger = vi.mocked(await import("../../../shared/logger"));
const { computeDueWorkIds, resolveCycleInfo } = await import("../run-unified-data-collection");
const { FUNCTION_RUN_BUDGET, JOB_RUN_BUDGET } = await import("../process-batch");
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

	describe("stable-due の上限（SPR-411）", () => {
		const stableIds = Array.from({ length: 600 }, (_, i) => `RJ_S${i}`);
		const volatileIds = Array.from({ length: 250 }, (_, i) => `RJ_V${i}`);
		const worksMap = (volatile: string[]) =>
			new Map<string, WorkDocument>([
				...stableIds.map((id) => [id, makeWork({ productId: id })] as const),
				...volatile.map(
					(id) =>
						[
							id,
							makeWork({ productId: id, salesStatus: { isSale: true, isSoldOut: false } }),
						] as const,
				),
			]);

		it("due-set を1 run に収まる 450 件に抑え、超えた stable は繰り延べる", async () => {
			vi.mocked(bulkCheckPriceHistoryExistsToday).mockResolvedValue(new Set());

			const result = await computeDueWorkIds(
				[...volatileIds, ...stableIds],
				worksMap(volatileIds),
				false,
			);

			expect(result.dueWorkIds).toHaveLength(450);
			// volatile は全件残り、削られるのは stable だけ
			expect(result.dueWorkIds.slice(0, 250)).toEqual(volatileIds);
			expect(result.tiered?.stableDueIds).toHaveLength(200);
			expect(logger.info).toHaveBeenCalledWith(
				"ティア差分due-set計算完了(SPR-229 Stage②)",
				expect.objectContaining({ stable_due: 200, stable_deferred: 400 }),
			);
		});

		it("new + volatile だけで上限を超えても、stable を最低 50 件は取得する", async () => {
			vi.mocked(bulkCheckPriceHistoryExistsToday).mockResolvedValue(new Set());
			const manyVolatile = Array.from({ length: 500 }, (_, i) => `RJ_V${i}`);

			const result = await computeDueWorkIds(
				[...manyVolatile, ...stableIds],
				worksMap(manyVolatile),
				false,
			);

			expect(result.tiered?.volatileIds).toHaveLength(500);
			expect(result.tiered?.stableDueIds).toHaveLength(50);
		});

		it("週次フルスイープには上限を掛けない", async () => {
			vi.mocked(bulkCheckPriceHistoryExistsToday).mockResolvedValue(new Set());
			const all = [...volatileIds, ...stableIds];

			const result = await computeDueWorkIds(all, worksMap(volatileIds), true);

			expect(result.dueWorkIds).toEqual(all);
			expect(result.tiered?.stableDueIds).toHaveLength(600);
		});
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

	it("既存作品の取得に失敗したら、どの作品も処理・書き込みせず run を失敗にする（SPR-346）", async () => {
		vi.mocked(collectWorkIdsForProduction).mockResolvedValue(["RJ001", "RJ002"]);
		vi.mocked(getExistingWorksMap).mockRejectedValue(new Error("既存作品データの取得に失敗"));

		await fetchDLsiteUnifiedData(pubsubEvent());

		expect(batchFetchIndividualInfo).not.toHaveBeenCalled();
		expect(processBatchUnifiedDLsiteData).not.toHaveBeenCalled();
		expect(updateMock).toHaveBeenCalledWith(
			expect.objectContaining({ isInProgress: false, lastError: expect.any(String) }),
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

	describe("レート制限（SPR-408）", () => {
		it("429 で打ち切られたら cursor を進めずに中断し、alert 付きの WARN を出す", async () => {
			vi.mocked(collectWorkIdsForProduction).mockResolvedValue(["RJ001", "RJ002"]);
			vi.mocked(batchFetchIndividualInfo).mockResolvedValue({
				results: new Map([["RJ001", makeApiResponse("RJ001")]]),
				failedWorkIds: [],
				interruption: { reason: "rate_limit", retryAfterSeconds: 300, skippedWorkIds: ["RJ002"] },
			});

			await fetchDLsiteUnifiedData(pubsubEvent());

			// 取れた分は保存する
			expect(processBatchUnifiedDLsiteData).toHaveBeenCalledWith(
				[makeApiResponse("RJ001")],
				expect.any(Object),
			);
			expect(logger.warn).toHaveBeenCalledWith(
				"DLsite レート制限により run を中断",
				expect.objectContaining({
					alert: "dlsite_rate_limited",
					batchNumber: 1,
					retryAfterSeconds: 300,
				}),
			);
			// 次の run が同じバッチからやり直す
			expect(updateMock).toHaveBeenCalledWith(
				expect.objectContaining({ currentBatch: 0, lastError: "レート制限により中断" }),
			);
			// サイクルは完了扱いにしない
			expect(logger.info).not.toHaveBeenCalledWith("全バッチ処理完了", expect.anything());
		});

		it("1件も取れずに打ち切られても「APIレスポンスなし」（全面停止アラートの契約）は出さない", async () => {
			vi.mocked(collectWorkIdsForProduction).mockResolvedValue(["RJ001"]);
			vi.mocked(batchFetchIndividualInfo).mockResolvedValue({
				results: new Map(),
				failedWorkIds: [],
				interruption: { reason: "rate_limit", skippedWorkIds: ["RJ001"] },
			});

			await fetchDLsiteUnifiedData(pubsubEvent());

			expect(processBatchUnifiedDLsiteData).not.toHaveBeenCalled();
			expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining("APIレスポンスなし"));
			expect(logger.warn).toHaveBeenCalledWith(
				"DLsite レート制限により run を中断",
				expect.objectContaining({ alert: "dlsite_rate_limited" }),
			);
			expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ currentBatch: 0 }));
		});
	});

	describe("API 取得の締め切り（SPR-319）", () => {
		it("取得に run 起動時刻 + 520秒 の締め切りを渡す", async () => {
			vi.mocked(collectWorkIdsForProduction).mockResolvedValue(["RJ001"]);
			vi.mocked(batchFetchIndividualInfo).mockResolvedValue({
				results: new Map([["RJ001", makeApiResponse("RJ001")]]),
				failedWorkIds: [],
			});
			const before = Date.now();

			await fetchDLsiteUnifiedData(pubsubEvent());

			const [, options] = vi.mocked(batchFetchIndividualInfo).mock.calls[0] ?? [];
			expect(options?.deadlineAt).toBeGreaterThanOrEqual(before + 520_000);
			expect(options?.deadlineAt).toBeLessThanOrEqual(Date.now() + 520_000);
		});

		it("締め切りで打ち切られたら cursor を進めずに中断し、レート制限のアラートは出さない", async () => {
			vi.mocked(collectWorkIdsForProduction).mockResolvedValue(["RJ001", "RJ002"]);
			vi.mocked(batchFetchIndividualInfo).mockResolvedValue({
				results: new Map([["RJ001", makeApiResponse("RJ001")]]),
				failedWorkIds: [],
				interruption: { reason: "deadline", skippedWorkIds: ["RJ002"] },
			});

			await fetchDLsiteUnifiedData(pubsubEvent());

			// 取れた分は保存する
			expect(processBatchUnifiedDLsiteData).toHaveBeenCalledWith(
				[makeApiResponse("RJ001")],
				expect.any(Object),
			);
			expect(logger.warn).toHaveBeenCalledWith(
				"API取得の締め切りにより run を中断",
				expect.objectContaining({ batchNumber: 1, totalBatches: 1 }),
			);
			// レート制限ではないので、log-based メトリクスの契約キーは付けない
			expect(logger.warn).not.toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ alert: "dlsite_rate_limited" }),
			);
			// 次の run が同じバッチからやり直す
			expect(updateMock).toHaveBeenCalledWith(
				expect.objectContaining({ currentBatch: 0, lastError: "API取得の締め切りにより中断" }),
			);
			expect(logger.info).not.toHaveBeenCalledWith("全バッチ処理完了", expect.anything());
		});
	});

	describe("runUnifiedDataCollectionWithReport（Functions と Jobs が共有する本体。SPR-415）", () => {
		it("成功したら true を返し、開始ログに起動元の情報を載せる（重複配信の判定は通らない）", async () => {
			vi.mocked(collectWorkIdsForProduction).mockResolvedValue(["RJ001"]);
			vi.mocked(batchFetchIndividualInfo).mockResolvedValue({
				results: new Map([["RJ001", makeApiResponse("RJ001")]]),
				failedWorkIds: [],
			});

			const ok = await runUnifiedDataCollectionWithReport({
				mode: "individual_info_api_unified",
				trigger: { jobMode: "dlsite", execution: "dlsite-abc" },
				runId: "dlsite-abc",
				budget: JOB_RUN_BUDGET,
			});

			expect(ok).toBe(true);
			// 「統合データ収集開始」は dlsite_run_started メトリクスの契約。文言とキーを変えない
			expect(logger.info).toHaveBeenCalledWith(
				"統合データ収集開始",
				expect.objectContaining({
					jobMode: "dlsite",
					execution: "dlsite-abc",
					mode: "individual_info_api_unified",
					週次フルスイープ: false,
				}),
			);
			// 重複配信の判定（recentEventIds）は通らない。書くのは「実行中」の印だけ
			expect(transactionMock.set).not.toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ recentEventIds: expect.anything() }),
			);
		});

		it("mode が weekly_full_sweep なら週次フルスイープとして走らせる", async () => {
			vi.mocked(collectWorkIdsForProduction).mockResolvedValue(["RJ001"]);
			vi.mocked(batchFetchIndividualInfo).mockResolvedValue({
				results: new Map([["RJ001", makeApiResponse("RJ001")]]),
				failedWorkIds: [],
			});

			await runUnifiedDataCollectionWithReport({
				mode: WEEKLY_FULL_SWEEP_MODE,
				trigger: {},
				runId: "run-1",
				budget: FUNCTION_RUN_BUDGET,
			});

			expect(logger.info).toHaveBeenCalledWith(
				"統合データ収集開始",
				expect.objectContaining({ 週次フルスイープ: true }),
			);
		});

		it("run が失敗したら false を返す（例外は投げない。Jobs は終了コードに使う）", async () => {
			vi.mocked(collectWorkIdsForProduction).mockRejectedValue(new Error("scrape failed"));

			await expect(
				runUnifiedDataCollectionWithReport({
					mode: undefined,
					trigger: {},
					runId: "run-1",
					budget: FUNCTION_RUN_BUDGET,
				}),
			).resolves.toBe(false);
		});
	});

	describe("レート制限を待って続ける（Cloud Run Jobs の予算。SPR-417）", () => {
		const jobRun = {
			mode: "individual_info_api_unified",
			trigger: { jobMode: "dlsite" },
			runId: "dlsite-abc",
			budget: JOB_RUN_BUDGET,
		};

		beforeEach(() => {
			vi.useFakeTimers();
			return () => vi.useRealTimers();
		});

		it("Retry-After のぶん待ち、取れていない作品だけを取り直して、サイクルを完了する", async () => {
			vi.mocked(collectWorkIdsForProduction).mockResolvedValue(["RJ001", "RJ002", "RJ003"]);
			vi.mocked(batchFetchIndividualInfo)
				.mockResolvedValueOnce({
					results: new Map([["RJ001", makeApiResponse("RJ001")]]),
					failedWorkIds: [],
					interruption: {
						reason: "rate_limit",
						retryAfterSeconds: 1800,
						skippedWorkIds: ["RJ002", "RJ003"],
					},
				})
				.mockResolvedValueOnce({
					results: new Map([
						["RJ002", makeApiResponse("RJ002")],
						["RJ003", makeApiResponse("RJ003")],
					]),
					failedWorkIds: [],
				});

			const run = runUnifiedDataCollectionWithReport(jobRun);
			// 待つのは Retry-After + 余裕 5 秒。その手前では取り直さない
			await vi.advanceTimersByTimeAsync(1_804_000);
			expect(batchFetchIndividualInfo).toHaveBeenCalledTimes(1);
			await vi.advanceTimersByTimeAsync(2_000);
			await expect(run).resolves.toBe(true);

			expect(vi.mocked(batchFetchIndividualInfo).mock.calls[1]?.[0]).toEqual(["RJ002", "RJ003"]);
			expect(logger.info).toHaveBeenCalledWith(
				"DLsite レート制限のため待機",
				expect.objectContaining({
					batchNumber: 1,
					retryAfterSeconds: 1800,
					waitSeconds: 1805,
					waitCount: 1,
					remainingInBatch: 2,
				}),
			);
			// ブロックは平常。アラートの契約キーは出さない
			expect(logger.warn).not.toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ alert: "dlsite_rate_limited" }),
			);
			expect(logger.info).toHaveBeenCalledWith("全バッチ処理完了", expect.anything());
			expect(logger.info).toHaveBeenCalledWith(
				"DLsite run の集計",
				expect.objectContaining({
					apiCalls: 3,
					worksUpdated: 3,
					stopReason: "completed",
					rateLimitWaits: 1,
					rateLimitWaitSeconds: 1805,
				}),
			);
		});

		it("Retry-After が無ければ既定の 300 秒、短すぎれば下限の 30 秒を待つ", async () => {
			vi.mocked(collectWorkIdsForProduction).mockResolvedValue(["RJ001"]);
			vi.mocked(batchFetchIndividualInfo)
				.mockResolvedValueOnce({
					results: new Map(),
					failedWorkIds: [],
					interruption: { reason: "rate_limit", skippedWorkIds: ["RJ001"] },
				})
				.mockResolvedValueOnce({
					results: new Map(),
					failedWorkIds: [],
					interruption: { reason: "rate_limit", retryAfterSeconds: 2, skippedWorkIds: ["RJ001"] },
				})
				.mockResolvedValueOnce({
					results: new Map([["RJ001", makeApiResponse("RJ001")]]),
					failedWorkIds: [],
				});

			const run = runUnifiedDataCollectionWithReport(jobRun);
			await vi.advanceTimersByTimeAsync(305_000 + 35_000);
			await expect(run).resolves.toBe(true);

			expect(logger.info).toHaveBeenCalledWith(
				"DLsite レート制限のため待機",
				expect.objectContaining({ waitSeconds: 305, waitCount: 1 }),
			);
			expect(logger.info).toHaveBeenCalledWith(
				"DLsite レート制限のため待機",
				expect.objectContaining({ waitSeconds: 35, waitCount: 2 }),
			);
		});

		it("取り直した数件が全部 取得失敗でも「APIレスポンスなし」（全面停止アラートの契約）は出さない", async () => {
			vi.mocked(collectWorkIdsForProduction).mockResolvedValue(["RJ001", "RJ002"]);
			vi.mocked(batchFetchIndividualInfo)
				.mockResolvedValueOnce({
					results: new Map([["RJ001", makeApiResponse("RJ001")]]),
					failedWorkIds: [],
					interruption: { reason: "rate_limit", retryAfterSeconds: 60, skippedWorkIds: ["RJ002"] },
				})
				// 取り直した 1 件は削除済みの作品（素の 404）。バッチが全滅したわけではない
				.mockResolvedValueOnce({ results: new Map(), failedWorkIds: ["RJ002"] });

			const run = runUnifiedDataCollectionWithReport(jobRun);
			await vi.advanceTimersByTimeAsync(65_000);
			await expect(run).resolves.toBe(true);

			expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining("APIレスポンスなし"));
			expect(updateMock).not.toHaveBeenCalledWith(
				expect.objectContaining({ lastError: "APIレスポンスなし" }),
			);
			// バッチは完了扱い（cursor を進める）。失敗した件数は WARN に残す
			expect(logger.warn).toHaveBeenCalledWith("バッチ 1: 1件の取得失敗");
			expect(logger.info).toHaveBeenCalledWith("全バッチ処理完了", expect.anything());
			expect(logger.info).toHaveBeenCalledWith(
				"DLsite run の集計",
				expect.objectContaining({ apiCalls: 2, worksUpdated: 1, stopReason: "completed" }),
			);
		});

		it("待つ時間が残っていなければ、cursor を進めずに正常終了する（続きは次の実行）", async () => {
			vi.mocked(collectWorkIdsForProduction).mockResolvedValue(["RJ001", "RJ002"]);
			vi.mocked(batchFetchIndividualInfo)
				.mockResolvedValueOnce({
					results: new Map(),
					failedWorkIds: [],
					interruption: {
						reason: "rate_limit",
						retryAfterSeconds: 1800,
						skippedWorkIds: ["RJ001", "RJ002"],
					},
				})
				// 30 分待ったあとの残りは 24 分弱。次の 30 分は待てない
				.mockResolvedValueOnce({
					results: new Map([["RJ001", makeApiResponse("RJ001")]]),
					failedWorkIds: [],
					interruption: {
						reason: "rate_limit",
						retryAfterSeconds: 1800,
						skippedWorkIds: ["RJ002"],
					},
				});

			const run = runUnifiedDataCollectionWithReport(jobRun);
			await vi.advanceTimersByTimeAsync(1_805_000);
			await expect(run).resolves.toBe(true);

			expect(batchFetchIndividualInfo).toHaveBeenCalledTimes(2);
			expect(logger.info).toHaveBeenCalledWith(
				"DLsite レート制限: 待つ時間が残っていないため run を終了",
				expect.objectContaining({ batchNumber: 1, retryAfterSeconds: 1800 }),
			);
			expect(logger.warn).not.toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ alert: "dlsite_rate_limited" }),
			);
			expect(updateMock).toHaveBeenCalledWith(
				expect.objectContaining({ currentBatch: 0, lastError: "レート制限により中断" }),
			);
			expect(logger.info).not.toHaveBeenCalledWith("全バッチ処理完了", expect.anything());
			expect(logger.info).toHaveBeenCalledWith(
				"DLsite run の集計",
				expect.objectContaining({ apiCalls: 1, stopReason: "rate_limit", rateLimitWaits: 1 }),
			);
		});

		it("Functions の予算では待たない（1 回で打ち切り、alert 付きの WARN を出す）", async () => {
			vi.mocked(collectWorkIdsForProduction).mockResolvedValue(["RJ001"]);
			vi.mocked(batchFetchIndividualInfo).mockResolvedValue({
				results: new Map(),
				failedWorkIds: [],
				interruption: { reason: "rate_limit", retryAfterSeconds: 60, skippedWorkIds: ["RJ001"] },
			});

			await expect(
				runUnifiedDataCollectionWithReport({ ...jobRun, budget: FUNCTION_RUN_BUDGET }),
			).resolves.toBe(true);

			expect(batchFetchIndividualInfo).toHaveBeenCalledTimes(1);
			expect(logger.info).not.toHaveBeenCalledWith(
				"DLsite レート制限のため待機",
				expect.anything(),
			);
			expect(logger.warn).toHaveBeenCalledWith(
				"DLsite レート制限により run を中断",
				expect.objectContaining({ alert: "dlsite_rate_limited" }),
			);
		});
	});

	describe("実行の重なり（「実行中」の印。SPR-417）", () => {
		const otherRunLock = {
			exists: true,
			data: () => ({
				isInProgress: true,
				lastFetchedAt: null,
				runLock: { holder: "other-run", expiresAt: { toMillis: () => Date.now() + 60_000 } },
			}),
		};
		const functionRun = {
			mode: "individual_info_api_unified",
			trigger: { eventId: "message-1" },
			runId: "message-1",
			budget: FUNCTION_RUN_BUDGET,
		};

		it("印を取ってから走り、終わったら自分の印を消す", async () => {
			vi.mocked(collectWorkIdsForProduction).mockResolvedValue(["RJ001"]);
			vi.mocked(batchFetchIndividualInfo).mockResolvedValue({
				results: new Map([["RJ001", makeApiResponse("RJ001")]]),
				failedWorkIds: [],
			});
			// 1 回目（取る）は印なし、2 回目（消す）は自分の印が残っている
			transactionMock.get.mockResolvedValueOnce({ exists: false }).mockResolvedValueOnce({
				exists: true,
				data: () => ({ runLock: { holder: "message-1", expiresAt: { toMillis: () => 0 } } }),
			});

			await expect(runUnifiedDataCollectionWithReport(functionRun)).resolves.toBe(true);

			expect(transactionMock.set).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ runLock: expect.objectContaining({ holder: "message-1" }) }),
			);
			expect(transactionMock.update).toHaveBeenCalledWith(expect.anything(), {
				runLock: "__delete__",
			});
		});

		it("ほかの実行が進行中なら、何も走らせず・開始ログも出さずに正常終了する", async () => {
			transactionMock.get.mockResolvedValue(otherRunLock);

			await expect(runUnifiedDataCollectionWithReport(functionRun)).resolves.toBe(true);

			expect(collectWorkIdsForProduction).not.toHaveBeenCalled();
			expect(logger.info).not.toHaveBeenCalledWith("統合データ収集開始", expect.anything());
			expect(logger.warn).toHaveBeenCalledWith(
				"別の実行が進行中のため統合データ収集をスキップ",
				expect.objectContaining({ eventId: "message-1" }),
			);
			// 通常の run は pendingFullSweep を立てない。ほかの実行の印も消さない
			expect(updateMock).not.toHaveBeenCalled();
			expect(transactionMock.update).not.toHaveBeenCalled();
		});

		it("飛ばしたのが週次フルスイープなら pendingFullSweep を立てる（その週の分を消さない）", async () => {
			transactionMock.get.mockResolvedValue(otherRunLock);

			await expect(
				runUnifiedDataCollectionWithReport({ ...functionRun, mode: WEEKLY_FULL_SWEEP_MODE }),
			).resolves.toBe(true);

			expect(collectWorkIdsForProduction).not.toHaveBeenCalled();
			expect(updateMock).toHaveBeenCalledWith({ pendingFullSweep: true });
		});

		it("pendingFullSweep を立てられなかったら false（失敗として残す）", async () => {
			transactionMock.get.mockResolvedValue(otherRunLock);
			updateMock.mockRejectedValueOnce(new Error("UNAVAILABLE"));

			await expect(
				runUnifiedDataCollectionWithReport({ ...functionRun, mode: WEEKLY_FULL_SWEEP_MODE }),
			).resolves.toBe(false);
		});

		it("run が失敗しても印は消す", async () => {
			vi.mocked(collectWorkIdsForProduction).mockRejectedValue(new Error("scrape failed"));
			transactionMock.get.mockResolvedValueOnce({ exists: false }).mockResolvedValueOnce({
				exists: true,
				data: () => ({ runLock: { holder: "message-1", expiresAt: { toMillis: () => 0 } } }),
			});

			await expect(runUnifiedDataCollectionWithReport(functionRun)).resolves.toBe(false);

			expect(transactionMock.update).toHaveBeenCalledWith(expect.anything(), {
				runLock: "__delete__",
			});
		});
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

		it("重複の判定が失敗したら、判定せずに run を走らせる（fail-open・週次フルスイープを消さない）", async () => {
			runTransactionMock.mockRejectedValueOnce(new Error("ABORTED: too much contention"));
			vi.mocked(collectWorkIdsForProduction).mockResolvedValue(["RJ001"]);
			vi.mocked(batchFetchIndividualInfo).mockResolvedValue({
				results: new Map([["RJ001", makeApiResponse("RJ001")]]),
				failedWorkIds: [],
			});

			await expect(
				fetchDLsiteUnifiedData(pubsubEvent({ mode: "weekly_full_sweep" })),
			).resolves.toBeUndefined();

			expect(logger.warn).toHaveBeenCalledWith(
				"重複配信の判定に失敗したため、判定せずに run を実行",
				expect.objectContaining({
					eventId: "message-1",
					error: expect.objectContaining({ message: "ABORTED: too much contention" }),
				}),
			);
			expect(logger.info).toHaveBeenCalledWith(
				"統合データ収集開始",
				expect.objectContaining({ eventId: "message-1", 週次フルスイープ: true }),
			);
			expect(collectWorkIdsForProduction).toHaveBeenCalledTimes(1);
			// catch-all（isInProgress=false / lastError の書き込み）には入らない
			expect(updateMock).not.toHaveBeenCalledWith(
				expect.objectContaining({ lastError: expect.any(String) }),
			);
		});
	});
});
