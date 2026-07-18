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
vi.mock("@/app/works/actions", () => ({ getWorkById: vi.fn() }));
vi.mock("@/lib/og-font", () => ({ loadMPlusRoundedSubset: vi.fn() }));

import { getWorkById } from "@/app/works/actions";
import { loadMPlusRoundedSubset } from "@/lib/og-font";
import Image, { alt, contentType, size } from "../opengraph-image";

type OgCardProps = {
	title: string;
	circle: string;
	price: string;
	jacketDataUri: string | null;
};

function makeWork(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		title: "テスト作品タイトル",
		circle: "テストサークル",
		price: { formattedPrice: "1,320円" },
		highResImageUrl: "https://img.dlsite.jp/example_main.jpg",
		thumbnailUrl: "https://img.dlsite.jp/example_sam.jpg",
		...overrides,
	};
}

describe("作品詳細の OG 画像（app/works/[workId]/opengraph-image.tsx）", () => {
	it("1200×630 の PNG を宣言している", () => {
		expect(size).toEqual({ width: 1200, height: 630 });
		expect(contentType).toBe("image/png");
		expect(alt).toContain("DLsite作品情報");
	});

	it("作品取得成功時はタイトル・サークル・価格・ジャケットを描画する", async () => {
		vi.mocked(getWorkById).mockResolvedValueOnce(makeWork() as never);
		vi.mocked(loadMPlusRoundedSubset).mockResolvedValue(new ArrayBuffer(8));
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				arrayBuffer: async () => new ArrayBuffer(4),
				headers: new Headers({ "content-type": "image/jpeg" }),
			}),
		);

		const response = (await Image({
			params: Promise.resolve({ workId: "RJ00000001" }),
		})) as unknown as { element: React.ReactElement<OgCardProps> };

		expect(response.element.props.title).toBe("テスト作品タイトル");
		expect(response.element.props.circle).toBe("テストサークル");
		expect(response.element.props.price).toBe("1,320円");
		expect(response.element.props.jacketDataUri).toMatch(/^data:image\/jpeg;base64,/);

		vi.unstubAllGlobals();
	});

	it("作品が見つからない場合はサイト名版にフォールバックする", async () => {
		vi.mocked(getWorkById).mockResolvedValueOnce(null);
		vi.mocked(loadMPlusRoundedSubset).mockResolvedValue(new ArrayBuffer(8));

		const response = (await Image({
			params: Promise.resolve({ workId: "unknown" }),
		})) as unknown as { element: React.ReactElement<OgCardProps> };

		expect(response.element.props.title).toBe("すずみなくりっく！");
		expect(response.element.props.jacketDataUri).toBeNull();
	});

	it("ジャケット取得失敗でも 500 にせず画像無しで描画を継続する", async () => {
		vi.mocked(getWorkById).mockResolvedValueOnce(makeWork() as never);
		vi.mocked(loadMPlusRoundedSubset).mockResolvedValue(new ArrayBuffer(8));
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

		const response = (await Image({
			params: Promise.resolve({ workId: "RJ00000001" }),
		})) as unknown as { element: React.ReactElement<OgCardProps> };

		expect(response.element.props.jacketDataUri).toBeNull();
		expect(response.element.props.title).toBe("テスト作品タイトル");

		vi.unstubAllGlobals();
	});

	it("許可外ホストのジャケットURLは fetch せず画像無しで描画する", async () => {
		vi.mocked(getWorkById).mockResolvedValueOnce(
			makeWork({
				highResImageUrl: "https://evil.example.com/steal.jpg",
				thumbnailUrl: "https://evil.example.com/steal-thumb.jpg",
			}) as never,
		);
		vi.mocked(loadMPlusRoundedSubset).mockResolvedValue(new ArrayBuffer(8));
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const response = (await Image({
			params: Promise.resolve({ workId: "RJ00000001" }),
		})) as unknown as { element: React.ReactElement<OgCardProps> };

		expect(fetchMock).not.toHaveBeenCalled();
		expect(response.element.props.jacketDataUri).toBeNull();

		vi.unstubAllGlobals();
	});

	it("フォント取得失敗でも 500 にせず ASCII 縮退版を描画する", async () => {
		vi.mocked(getWorkById).mockResolvedValueOnce(makeWork({ title: "Ascii Title" }) as never);
		vi.mocked(loadMPlusRoundedSubset).mockRejectedValue(new Error("font error"));
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				arrayBuffer: async () => new ArrayBuffer(4),
				headers: new Headers({ "content-type": "image/jpeg" }),
			}),
		);

		const response = (await Image({
			params: Promise.resolve({ workId: "RJ00000001" }),
		})) as unknown as { element: React.ReactElement<OgCardProps>; options: { fonts?: unknown[] } };

		expect(response.element.props.title).toBe("Ascii Title");
		expect(response.options.fonts).toBeUndefined();

		vi.unstubAllGlobals();
	});
});
