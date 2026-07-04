import { describe, expect, it, vi } from "vitest";
import { updateVideoButtonCount, validateVideoForAudioButton } from "../audio-button-validation";

vi.mock("@/lib/logger", () => ({
	warn: vi.fn(),
	error: vi.fn(),
	info: vi.fn(),
	debug: vi.fn(),
}));

// videoDoc.get() が返すデータを差し替えられる Firestore モック
const makeFirestore = (videoData: unknown, exists = true) => {
	const update = vi.fn().mockResolvedValue(undefined);
	const get = vi.fn().mockResolvedValue({ exists, data: () => videoData });
	const doc = vi.fn(() => ({ get, update }));
	return {
		firestore: { collection: vi.fn(() => ({ doc })) },
		update,
	};
};

const validate = (videoData: unknown, exists = true) => {
	const { firestore } = makeFirestore(videoData, exists);
	return validateVideoForAudioButton("vid1", firestore as any);
};

describe("validateVideoForAudioButton", () => {
	it("動画が存在しなければ invalid", async () => {
		expect(await validate(undefined, false)).toEqual({
			valid: false,
			error: "指定された動画が見つかりません",
		});
	});

	it("埋め込み制限ありは invalid", async () => {
		const r = await validate({ status: { embeddable: false } });
		expect(r.valid).toBe(false);
		expect(r.error).toContain("埋め込み");
	});

	it("アーカイブでない（videoType も archived でない）は invalid", async () => {
		expect((await validate({ videoType: "normal" })).valid).toBe(false);
	});

	it("配信アーカイブ（actualEndTime + 15分超）は valid", async () => {
		const r = await validate({
			liveStreamingDetails: { actualEndTime: "2024-01-01T01:00:00Z" },
			duration: "PT20M",
		});
		expect(r).toEqual({ valid: true });
	});

	it("videoType=archived は valid", async () => {
		expect(await validate({ videoType: "archived" })).toEqual({ valid: true });
	});
});

describe("updateVideoButtonCount", () => {
	it("存在する動画の count を増やす（hasAudioButtons は書かない = SPR-239）", async () => {
		const { firestore, update } = makeFirestore({ audioButtonCount: 2 });
		await updateVideoButtonCount("vid1", firestore as never, 1);
		expect(update).toHaveBeenCalledWith(expect.objectContaining({ audioButtonCount: 3 }));
		expect(update).toHaveBeenCalledWith(
			expect.not.objectContaining({ hasAudioButtons: expect.anything() }),
		);
	});

	it("count は 0 未満にならない", async () => {
		const { firestore, update } = makeFirestore({ audioButtonCount: 0 });
		await updateVideoButtonCount("vid1", firestore as never, -1);
		expect(update).toHaveBeenCalledWith(expect.objectContaining({ audioButtonCount: 0 }));
	});

	it("動画が存在しなければ update しない", async () => {
		const { firestore, update } = makeFirestore(undefined, false);
		await updateVideoButtonCount("vid1", firestore as never);
		expect(update).not.toHaveBeenCalled();
	});
});
