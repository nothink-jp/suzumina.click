import { describe, expect, it } from "vitest";
import {
	CHUNK_OVERLAP_SECONDS,
	CHUNK_SECONDS,
	chunkIndexForTime,
	chunkRange,
	maxChunkIndex,
	parseTranscriptionResponse,
	snapRangeForUtterance,
} from "../transcription-core";

describe("chunkIndexForTime / maxChunkIndex", () => {
	it("10分単位でチャンク番号を返す", () => {
		expect(chunkIndexForTime(0)).toBe(0);
		expect(chunkIndexForTime(599.9)).toBe(0);
		expect(chunkIndexForTime(600)).toBe(1);
		expect(chunkIndexForTime(4993.6)).toBe(8);
	});

	it("負値は0にクランプする", () => {
		expect(chunkIndexForTime(-5)).toBe(0);
	});

	it("動画長を渡すと最終チャンクへクランプする（AIレビュー対応: 動画長ちょうどの再生位置）", () => {
		// 動画長が600の倍数ぴったりのとき、素の floor は存在しないチャンクを指す
		expect(chunkIndexForTime(1200, 1200)).toBe(1);
		expect(chunkIndexForTime(600, 600)).toBe(0);
		// 通常位置はクランプの影響を受けない
		expect(chunkIndexForTime(650, 1200)).toBe(1);
	});

	it("動画長から最終チャンク番号を返す", () => {
		expect(maxChunkIndex(600)).toBe(0);
		expect(maxChunkIndex(601)).toBe(1);
		expect(maxChunkIndex(11065)).toBe(18);
		expect(maxChunkIndex(0)).toBe(0);
	});
});

describe("chunkRange", () => {
	it("担当範囲とオーバーラップ込みの生成窓を返す", () => {
		const range = chunkRange(1, 3600);
		expect(range).toEqual({
			chunkStart: 600,
			chunkEnd: 1200,
			requestStart: 600,
			requestEnd: 1200 + CHUNK_OVERLAP_SECONDS,
		});
	});

	it("末尾チャンクは動画長でクランプされる", () => {
		const range = chunkRange(1, 900);
		expect(range.chunkEnd).toBe(900);
		expect(range.requestEnd).toBe(900);
	});
});

describe("parseTranscriptionResponse", () => {
	const chunkStart = 600;
	const chunkEnd = 1200;

	it("相対時刻を絶対時刻へ変換し、start 昇順で返す", () => {
		const raw = JSON.stringify({
			utterances: [
				{ start: 10.5, end: 12.5, text: "こんにちは" },
				{ start: 2.0, end: 4.0, text: "えっと" },
			],
		});
		const result = parseTranscriptionResponse(raw, chunkStart, chunkEnd);
		expect(result).toEqual([
			{ start: 602, end: 604, text: "えっと" },
			{ start: 610.5, end: 612.5, text: "こんにちは" },
		]);
	});

	it("オーバーラップ窓で拾った次チャンク分（start >= chunkEnd）は捨てる", () => {
		const raw = JSON.stringify({
			utterances: [
				{ start: 599, end: 601, text: "チャンク内の発話" },
				{ start: CHUNK_SECONDS + 5, end: CHUNK_SECONDS + 8, text: "次チャンクの発話" },
			],
		});
		const result = parseTranscriptionResponse(raw, chunkStart, chunkEnd);
		expect(result).toHaveLength(1);
		expect(result?.[0]?.text).toBe("チャンク内の発話");
	});

	it("壊れた要素は捨てて続行する", () => {
		const raw = JSON.stringify({
			utterances: [
				{ start: 1, end: 2, text: "有効" },
				{ start: "x", end: 2, text: "start が数値でない" },
				{ start: 5, end: 3, text: "end <= start" },
				{ start: 7, end: 8, text: "   " },
				{ start: 9, end: 10 },
			],
		});
		const result = parseTranscriptionResponse(raw, chunkStart, chunkEnd);
		expect(result).toHaveLength(1);
	});

	it("song kind を保持し、その他の kind は落とす", () => {
		const raw = JSON.stringify({
			utterances: [
				{ start: 1, end: 2, text: "♪", kind: "song" },
				{ start: 3, end: 4, text: "雑談", kind: "unknown" },
			],
		});
		const result = parseTranscriptionResponse(raw, chunkStart, chunkEnd);
		expect(result?.[0]?.kind).toBe("song");
		expect(result?.[1]?.kind).toBeUndefined();
	});

	it("長すぎるテキストは切り詰める", () => {
		const raw = JSON.stringify({
			utterances: [{ start: 1, end: 2, text: "あ".repeat(300) }],
		});
		const result = parseTranscriptionResponse(raw, chunkStart, chunkEnd);
		expect(result?.[0]?.text).toHaveLength(200);
	});

	it("JSON でない・utterances が無い応答は null", () => {
		expect(parseTranscriptionResponse("not json", chunkStart, chunkEnd)).toBeNull();
		expect(parseTranscriptionResponse("{}", chunkStart, chunkEnd)).toBeNull();
	});
});

describe("snapRangeForUtterance", () => {
	it("前0.15秒・後0.35秒のパディングを付ける", () => {
		expect(snapRangeForUtterance({ start: 100, end: 102 }, 3600)).toEqual({
			startTime: 99.9,
			endTime: 102.4,
		});
	});

	it("動画の先頭・末尾でクランプされる", () => {
		expect(snapRangeForUtterance({ start: 0.1, end: 3600 }, 3600)).toEqual({
			startTime: 0,
			endTime: 3600,
		});
	});
});
