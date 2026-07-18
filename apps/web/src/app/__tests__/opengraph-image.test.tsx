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
vi.mock("@/lib/og-font", () => ({ loadMPlusRoundedSubset: vi.fn() }));

import { loadMPlusRoundedSubset } from "@/lib/og-font";
import Image, { alt, contentType, size } from "../opengraph-image";

describe("サイト既定 OG 画像（app/opengraph-image.tsx）", () => {
	it("1200×630 の PNG を宣言している", () => {
		expect(size).toEqual({ width: 1200, height: 630 });
		expect(contentType).toBe("image/png");
		expect(alt).toContain("すずみなくりっく！");
	});

	it("フォント取得成功時はブランドフォント付きで日本語ロックアップを描画する", async () => {
		const fontData = new ArrayBuffer(8);
		vi.mocked(loadMPlusRoundedSubset).mockResolvedValueOnce(fontData);

		const response = (await Image()) as unknown as {
			element: React.ReactElement<{ title: string; badgeLabel: string }>;
			options: { fonts?: { data: ArrayBuffer }[] };
		};

		expect(response.element.props.title).toBe("すずみなくりっく！");
		expect(response.element.props.badgeLabel).toBe("涼花みなせ 非公式ファンサイト");
		expect(response.options.fonts?.[0]?.data).toBe(fontData);
	});

	it("フォント取得失敗でも 500 にせず ASCII 縮退版を描画する", async () => {
		vi.mocked(loadMPlusRoundedSubset).mockRejectedValueOnce(new Error("network error"));

		const response = (await Image()) as unknown as {
			element: React.ReactElement<{ title: string }>;
			options: { fonts?: unknown[] };
		};

		expect(response.element.props.title).toBe("suzumina.click");
		expect(response.options.fonts).toBeUndefined();
	});
});
