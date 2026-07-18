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
vi.mock("@/app/videos/actions", () => ({ getVideoById: vi.fn() }));
vi.mock("@/lib/og-font", () => ({ loadMPlusRoundedSubset: vi.fn() }));

import { getVideoById } from "@/app/videos/actions";
import { loadMPlusRoundedSubset } from "@/lib/og-font";
import Image, { alt, contentType, size } from "../opengraph-image";

type OgCardProps = {
	title: string;
	channelTitle: string;
	durationLabel: string;
	thumbnailDataUri: string | null;
};

function makeVideo(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		title: "テスト動画タイトル",
		channelTitle: "涼花みなせ",
		duration: "PT1H23M45S",
		thumbnails: { maxres: { url: "https://i.ytimg.com/vi/abc123/maxresdefault.jpg" } },
		thumbnailUrl: "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
		...overrides,
	};
}

describe("動画詳細の OG 画像（app/videos/[videoId]/opengraph-image.tsx）", () => {
	it("1200×630 の PNG を宣言している", () => {
		expect(size).toEqual({ width: 1200, height: 630 });
		expect(contentType).toBe("image/png");
		expect(alt).toContain("動画情報");
	});

	it("動画取得成功時はタイトル・チャンネル名・再生時間・サムネイルを描画する", async () => {
		vi.mocked(getVideoById).mockResolvedValueOnce(makeVideo() as never);
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
			params: Promise.resolve({ videoId: "abc123" }),
		})) as unknown as { element: React.ReactElement<OgCardProps> };

		expect(response.element.props.title).toBe("テスト動画タイトル");
		expect(response.element.props.channelTitle).toBe("涼花みなせ");
		expect(response.element.props.durationLabel).toBe("1:23:45");
		expect(response.element.props.thumbnailDataUri).toMatch(/^data:image\/jpeg;base64,/);

		vi.unstubAllGlobals();
	});

	it("動画が見つからない場合はサイト名版にフォールバックする", async () => {
		vi.mocked(getVideoById).mockResolvedValueOnce(null);
		vi.mocked(loadMPlusRoundedSubset).mockResolvedValue(new ArrayBuffer(8));

		const response = (await Image({
			params: Promise.resolve({ videoId: "unknown" }),
		})) as unknown as { element: React.ReactElement<OgCardProps> };

		expect(response.element.props.title).toBe("すずみなくりっく！");
		expect(response.element.props.thumbnailDataUri).toBeNull();
	});

	it("サムネイル取得失敗でも 500 にせず画像無しで描画を継続する", async () => {
		vi.mocked(getVideoById).mockResolvedValueOnce(makeVideo() as never);
		vi.mocked(loadMPlusRoundedSubset).mockResolvedValue(new ArrayBuffer(8));
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

		const response = (await Image({
			params: Promise.resolve({ videoId: "abc123" }),
		})) as unknown as { element: React.ReactElement<OgCardProps> };

		expect(response.element.props.thumbnailDataUri).toBeNull();
		expect(response.element.props.title).toBe("テスト動画タイトル");

		vi.unstubAllGlobals();
	});

	it("許可外ホストのサムネイルURLは fetch せず画像無しで描画する", async () => {
		vi.mocked(getVideoById).mockResolvedValueOnce(
			makeVideo({
				thumbnails: { maxres: { url: "https://evil.example.com/steal.jpg" } },
				thumbnailUrl: "https://evil.example.com/steal-thumb.jpg",
			}) as never,
		);
		vi.mocked(loadMPlusRoundedSubset).mockResolvedValue(new ArrayBuffer(8));
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const response = (await Image({
			params: Promise.resolve({ videoId: "abc123" }),
		})) as unknown as { element: React.ReactElement<OgCardProps> };

		expect(fetchMock).not.toHaveBeenCalled();
		expect(response.element.props.thumbnailDataUri).toBeNull();

		vi.unstubAllGlobals();
	});

	it("再生時間が無い場合は durationLabel が空文字になる", async () => {
		vi.mocked(getVideoById).mockResolvedValueOnce(makeVideo({ duration: undefined }) as never);
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
			params: Promise.resolve({ videoId: "abc123" }),
		})) as unknown as { element: React.ReactElement<OgCardProps> };

		expect(response.element.props.durationLabel).toBe("");

		vi.unstubAllGlobals();
	});

	it("フォント取得失敗でも 500 にせず ASCII 縮退版を描画する", async () => {
		vi.mocked(getVideoById).mockResolvedValueOnce(makeVideo({ title: "Ascii Title" }) as never);
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
			params: Promise.resolve({ videoId: "abc123" }),
		})) as unknown as { element: React.ReactElement<OgCardProps>; options: { fonts?: unknown[] } };

		expect(response.element.props.title).toBe("Ascii Title");
		expect(response.options.fonts).toBeUndefined();

		vi.unstubAllGlobals();
	});
});
