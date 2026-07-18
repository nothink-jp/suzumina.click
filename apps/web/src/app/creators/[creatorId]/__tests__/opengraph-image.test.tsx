import { describe, expect, it, vi } from "vitest";

// ImageResponse は実描画せず、渡された element / options を検証できる形で捕捉する
vi.mock("next/og", () => ({
	ImageResponse: class {
		element: React.ReactElement;
		options: { fonts?: unknown[] } | undefined;
		constructor(element: React.ReactElement, options?: { fonts?: unknown[] }) {
			this.element = element;
			this.options = options;
		}
	},
}));
vi.mock("../actions", () => ({ getCreatorInfo: vi.fn() }));
vi.mock("@/lib/og-font", () => ({ loadMPlusRoundedSubset: vi.fn() }));
// vitest では "use cache" ディレクティブは no-op になり cacheLife が cache スコープ外呼び出しになるためモックする
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

import { loadMPlusRoundedSubset } from "@/lib/og-font";
import type { TextOgCardProps } from "@/lib/og-text-card";
import { getCreatorInfo } from "../actions";
import Image, { alt, contentType, size } from "../opengraph-image";

describe("クリエイター詳細の OG 画像（app/creators/[creatorId]/opengraph-image.tsx）", () => {
	it("1200×630 の PNG を宣言している", () => {
		expect(size).toEqual({ width: 1200, height: 630 });
		expect(contentType).toBe("image/png");
		expect(alt).toContain("クリエイター情報");
	});

	it("クリエイター取得成功時は名称・役割・作品数を描画する", async () => {
		vi.mocked(getCreatorInfo).mockResolvedValueOnce({
			id: "CR00001",
			name: "テストクリエイター",
			types: ["voice"],
			workCount: 8,
		} as never);
		vi.mocked(loadMPlusRoundedSubset).mockResolvedValue(new ArrayBuffer(8));

		const response = (await Image({
			params: Promise.resolve({ creatorId: "CR00001" }),
		})) as unknown as { element: React.ReactElement<TextOgCardProps> };

		expect(response.element.props.name).toBe("テストクリエイター");
		expect(response.element.props.subtitle).toBe("声優");
		expect(response.element.props.statLabel).toBe("8作品");
	});

	it("クリエイターが見つからない場合はサイト名版にフォールバックする", async () => {
		vi.mocked(getCreatorInfo).mockResolvedValueOnce(null);
		vi.mocked(loadMPlusRoundedSubset).mockResolvedValue(new ArrayBuffer(8));

		const response = (await Image({
			params: Promise.resolve({ creatorId: "unknown" }),
		})) as unknown as { element: React.ReactElement<TextOgCardProps> };

		expect(response.element.props.name).toBe("すずみなくりっく！");
		expect(response.element.props.subtitle).toBe("");
	});

	it("フォント取得失敗でも 500 にせず ASCII 縮退版を描画する", async () => {
		vi.mocked(getCreatorInfo).mockResolvedValueOnce({
			id: "CR00001",
			name: "Ascii Creator",
			types: ["music"],
			workCount: 2,
		} as never);
		vi.mocked(loadMPlusRoundedSubset).mockRejectedValue(new Error("font error"));

		const response = (await Image({
			params: Promise.resolve({ creatorId: "CR00001" }),
		})) as unknown as {
			element: React.ReactElement<TextOgCardProps>;
			options: { fonts?: unknown[] };
		};

		expect(response.element.props.name).toBe("Ascii Creator");
		expect(response.options.fonts).toBeUndefined();
	});
});
