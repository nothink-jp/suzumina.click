import { beforeEach, describe, expect, it, vi } from "vitest";
import * as logger from "../logger";
import { decodePubsubMode, type MessagePublishedData } from "../pubsub-utils";

vi.mock("../logger", () => ({
	warn: vi.fn(),
	info: vi.fn(),
	error: vi.fn(),
}));

function envelope(payload: Record<string, unknown>): MessagePublishedData {
	return {
		message: { data: Buffer.from(JSON.stringify(payload)).toString("base64") },
		subscription: "projects/test/subscriptions/test-sub",
	};
}

describe("decodePubsubMode", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("本番GCFv2のMessagePublishedData envelope（message一段ネスト）からmodeを取り出す", () => {
		expect(decodePubsubMode(envelope({ mode: "weekly_full_sweep" }))).toBe("weekly_full_sweep");
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it("modeを持たないペイロードはundefined（通常run）", () => {
		expect(decodePubsubMode(envelope({ type: "unified_update" }))).toBeUndefined();
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it("dataがundefinedならundefined（warnなし）", () => {
		expect(decodePubsubMode(undefined)).toBeUndefined();
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it("旧・平坦形（event.data.data直下）はデコードせずwarnを出す（SPR-229/230回帰の文書化）", () => {
		// かつてのテストモックだけがこの形で、本番では発生しない。silent fallbackで
		// 週次フルスイープが本番で一度も発火しなかった回帰を、warn必須として固定する。
		const flat = {
			data: Buffer.from(JSON.stringify({ mode: "weekly_full_sweep" })).toString("base64"),
		} as unknown as MessagePublishedData;
		expect(decodePubsubMode(flat)).toBeUndefined();
		expect(logger.warn).toHaveBeenCalledTimes(1);
	});

	it("message.dataが不正なJSONならwarnを出してundefined", () => {
		const broken: MessagePublishedData = {
			message: { data: Buffer.from("not-json").toString("base64") },
		};
		expect(decodePubsubMode(broken)).toBeUndefined();
		expect(logger.warn).toHaveBeenCalledTimes(1);
	});

	it("modeが文字列でなければundefined", () => {
		expect(decodePubsubMode(envelope({ mode: 123 }))).toBeUndefined();
	});
});
