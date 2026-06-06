import { beforeEach, describe, expect, it, vi } from "vitest";
import { convertFirestoreToAudioButton, fetchAndConvertButtons } from "../audio-button-converters";

vi.mock("@/lib/logger", () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }));

const fsButton = (over: Record<string, unknown> = {}) =>
	({
		id: "ab1",
		buttonText: "ボタン",
		videoId: "vid1",
		videoTitle: "動画",
		startTime: 0,
		endTime: 5,
		createdBy: "u1",
		createdByName: "作者",
		createdAt: "2024-01-01T00:00:00.000Z",
		...over,
		// biome-ignore lint/suspicious/noExplicitAny: テスト用の最小データ
	}) as any;

beforeEach(() => {
	vi.clearAllMocks();
});

describe("convertFirestoreToAudioButton", () => {
	it("有効データは AudioButton に変換", () => {
		const r = convertFirestoreToAudioButton(fsButton());
		expect(r?.id).toBe("ab1");
		expect(r?.buttonText).toBe("ボタン");
	});

	it("必須欠落（buttonText/videoId なし）は null", () => {
		expect(convertFirestoreToAudioButton(fsButton({ buttonText: "", videoId: "" }))).toBeNull();
	});
});

describe("fetchAndConvertButtons", () => {
	it("クエリ結果を変換し null を除外する", async () => {
		const query = {
			get: vi.fn().mockResolvedValue({
				docs: [
					{ id: "ab1", data: () => fsButton({ id: undefined }) },
					{ id: "ab2", data: () => fsButton({ id: undefined, buttonText: "", videoId: "" }) }, // → null
				],
			}),
		};
		const r = await fetchAndConvertButtons(query as never);
		expect(r).toHaveLength(1);
		expect(r[0]?.id).toBe("ab1");
	});
});
