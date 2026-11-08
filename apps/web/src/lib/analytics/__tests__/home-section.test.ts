import { describe, expect, it } from "vitest";
import { toLinkDestination } from "../home-section";

const ORIGIN = "https://suzumina.click";

describe("toLinkDestination", () => {
	it("サイト内のパスはクエリ・ハッシュを落とす", () => {
		expect(toLinkDestination("/buttons?sort=new#top", ORIGIN)).toBe("/buttons");
		expect(toLinkDestination("/", ORIGIN)).toBe("/");
		expect(toLinkDestination("https://suzumina.click/videos", ORIGIN)).toBe("/videos");
	});

	it("ID セグメント（数字・RJ 番号・数字を含む英数字）を :id に丸める", () => {
		expect(toLinkDestination("/works/RJ01679795", ORIGIN)).toBe("/works/:id");
		expect(toLinkDestination("/creators/13664", ORIGIN)).toBe("/creators/:id");
		expect(toLinkDestination("/buttons/53aRiTlfhjLKFDiJUOaX", ORIGIN)).toBe("/buttons/:id");
		expect(toLinkDestination("/videos/jBSYmvU8gCg", ORIGIN)).toBe("/videos/:id");
	});

	it("英字だけの固定パスは ID とみなさない", () => {
		expect(toLinkDestination("/settings", ORIGIN)).toBe("/settings");
		expect(toLinkDestination("/favorites", ORIGIN)).toBe("/favorites");
		expect(toLinkDestination("/users/me", ORIGIN)).toBe("/users/me");
	});

	it("外部リンクは www. を除いたホスト名にする", () => {
		expect(
			toLinkDestination("https://www.dlsite.com/maniax/work/=/product_id/RJ01753624.html", ORIGIN),
		).toBe("dlsite.com");
		expect(toLinkDestination("https://ch.nicovideo.jp/foo", ORIGIN)).toBe("ch.nicovideo.jp");
	});

	it("http(s) 以外は送らない", () => {
		expect(toLinkDestination("mailto:info@example.com", ORIGIN)).toBeNull();
		expect(toLinkDestination("javascript:void(0)", ORIGIN)).toBeNull();
	});
});
