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
vi.mock("../actions", () => ({ getCircleInfo: vi.fn() }));
vi.mock("@/lib/og-font", () => ({ loadMPlusRoundedSubset: vi.fn() }));

import { loadMPlusRoundedSubset } from "@/lib/og-font";
import type { TextOgCardProps } from "@/lib/og-text-card";
import { getCircleInfo } from "../actions";
import Image, { alt, contentType, size } from "../opengraph-image";

describe("サークル詳細の OG 画像（app/circles/[circleId]/opengraph-image.tsx）", () => {
	it("1200×630 の PNG を宣言している", () => {
		expect(size).toEqual({ width: 1200, height: 630 });
		expect(contentType).toBe("image/png");
		expect(alt).toContain("サークル情報");
	});

	it("サークル取得成功時は名称・作品数を描画する", async () => {
		vi.mocked(getCircleInfo).mockResolvedValueOnce({
			circleId: "RG00001",
			name: "テストサークル",
			workCount: 12,
			createdAt: null,
		} as never);
		vi.mocked(loadMPlusRoundedSubset).mockResolvedValue(new ArrayBuffer(8));

		const response = (await Image({
			params: Promise.resolve({ circleId: "RG00001" }),
		})) as unknown as { element: React.ReactElement<TextOgCardProps> };

		expect(response.element.props.name).toBe("テストサークル");
		expect(response.element.props.statLabel).toBe("12作品");
	});

	it("サークルが見つからない場合はサイト名版にフォールバックする", async () => {
		vi.mocked(getCircleInfo).mockResolvedValueOnce(null);
		vi.mocked(loadMPlusRoundedSubset).mockResolvedValue(new ArrayBuffer(8));

		const response = (await Image({
			params: Promise.resolve({ circleId: "unknown" }),
		})) as unknown as { element: React.ReactElement<TextOgCardProps> };

		expect(response.element.props.name).toBe("すずみなくりっく！");
		expect(response.element.props.statLabel).toBe("");
	});

	it("フォント取得失敗でも 500 にせず ASCII 縮退版を描画する", async () => {
		vi.mocked(getCircleInfo).mockResolvedValueOnce({
			circleId: "RG00001",
			name: "Ascii Circle",
			workCount: 3,
			createdAt: null,
		} as never);
		vi.mocked(loadMPlusRoundedSubset).mockRejectedValue(new Error("font error"));

		const response = (await Image({
			params: Promise.resolve({ circleId: "RG00001" }),
		})) as unknown as {
			element: React.ReactElement<TextOgCardProps>;
			options: { fonts?: unknown[] };
		};

		expect(response.element.props.name).toBe("Ascii Circle");
		expect(response.options.fonts).toBeUndefined();
	});
});
