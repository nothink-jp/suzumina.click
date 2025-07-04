// functions/src/common.test.ts
import { describe, expect, it } from "vitest";
import { SUZUKA_MINASE_CHANNEL_ID } from "./common";

describe("SUZUKA_MINASE_CHANNEL_ID", () => {
	it("涼花みなせのYouTubeチャンネルIDが正しい値であること", () => {
		expect(SUZUKA_MINASE_CHANNEL_ID).toBe("UChiMMOhl6FpzjoRqvZ5rcaA");
	});
});
