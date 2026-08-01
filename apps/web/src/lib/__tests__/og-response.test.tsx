import { beforeEach, describe, expect, it, vi } from "vitest";

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
vi.mock("@/lib/logger", () => ({ warn: vi.fn() }));

import { warn } from "@/lib/logger";
import { loadMPlusRoundedSubset } from "@/lib/og-font";
import { buildOgImageResponse } from "../og-response";

const size = { width: 1200, height: 630 };

describe("buildOgImageResponse", () => {
	beforeEach(() => {
		vi.mocked(loadMPlusRoundedSubset).mockReset();
		vi.mocked(warn).mockReset();
	});

	it("bold 取得成功時は renderFull を使い、bold フォントのみ付与する（regularText 省略時）", async () => {
		vi.mocked(loadMPlusRoundedSubset).mockResolvedValueOnce(new ArrayBuffer(8));

		const response = (await buildOgImageResponse({
			size,
			boldText: "title",
			renderFallback: () => <div>fallback</div>,
			renderFull: () => <div>full</div>,
		})) as unknown as {
			element: React.ReactElement<{ children: string }>;
			options: { fonts?: unknown[] };
		};

		expect(response.element.props.children).toBe("full");
		expect(response.options.fonts).toHaveLength(1);
		expect(loadMPlusRoundedSubset).toHaveBeenCalledTimes(1);
		expect(loadMPlusRoundedSubset).toHaveBeenCalledWith(700, "title");
	});

	it("regularText 指定時は bold 成功後に regular も取得し、2フォント付与する", async () => {
		vi.mocked(loadMPlusRoundedSubset)
			.mockResolvedValueOnce(new ArrayBuffer(8))
			.mockResolvedValueOnce(new ArrayBuffer(4));

		const response = (await buildOgImageResponse({
			size,
			boldText: "title",
			regularText: "subtitle",
			renderFallback: () => <div>fallback</div>,
			renderFull: () => <div>full</div>,
		})) as unknown as { options: { fonts?: { weight: number }[] } };

		expect(response.options.fonts).toHaveLength(2);
		expect(response.options.fonts?.map((f) => f.weight).sort()).toEqual([400, 700]);
		expect(loadMPlusRoundedSubset).toHaveBeenNthCalledWith(2, 400, "subtitle");
	});

	it("regular 取得が失敗しても bold のみで描画を継続する", async () => {
		vi.mocked(loadMPlusRoundedSubset)
			.mockResolvedValueOnce(new ArrayBuffer(8))
			.mockRejectedValueOnce(new Error("regular font error"));

		const response = (await buildOgImageResponse({
			size,
			boldText: "title",
			regularText: "subtitle",
			renderFallback: () => <div>fallback</div>,
			renderFull: () => <div>full</div>,
		})) as unknown as { options: { fonts?: unknown[] } };

		expect(response.options.fonts).toHaveLength(1);
	});

	it("bold 取得失敗時は renderFallback を使い、fonts 未指定・regular はフェッチしない", async () => {
		vi.mocked(loadMPlusRoundedSubset).mockRejectedValueOnce(new Error("bold font error"));

		const response = (await buildOgImageResponse({
			size,
			boldText: "title",
			regularText: "subtitle",
			renderFallback: () => <div>fallback</div>,
			renderFull: () => <div>full</div>,
		})) as unknown as {
			element: React.ReactElement<{ children: string }>;
			options: { fonts?: unknown[] };
		};

		expect(response.element.props.children).toBe("fallback");
		expect(response.options.fonts).toBeUndefined();
		// bold が失敗した時点で regular は取得しに行かない（無駄な外部fetchを避ける）
		expect(loadMPlusRoundedSubset).toHaveBeenCalledTimes(1);
	});

	// 縮退を無言で握りつぶすと縮退率が測れず、Google Fonts への runtime 依存を
	// 続けるか同梱に倒すかを判断できない。message / alert は監視の契約なので値ごと固定する
	describe("縮退の観測ログ", () => {
		it("bold 失敗時は degradation=ascii_fallback で WARN を出す", async () => {
			const err = new Error("bold font error");
			vi.mocked(loadMPlusRoundedSubset).mockRejectedValueOnce(err);

			await buildOgImageResponse({
				size,
				boldText: "title",
				regularText: "subtitle",
				renderFallback: () => <div>fallback</div>,
				renderFull: () => <div>full</div>,
			});

			expect(warn).toHaveBeenCalledTimes(1);
			expect(warn).toHaveBeenCalledWith("OG image brand font unavailable", {
				alert: "og_font_fallback",
				font_weight: 700,
				degradation: "ascii_fallback",
				error: err,
			});
		});

		it("regular 失敗時は degradation=bold_only で WARN を出す", async () => {
			const err = new Error("regular font error");
			vi.mocked(loadMPlusRoundedSubset)
				.mockResolvedValueOnce(new ArrayBuffer(8))
				.mockRejectedValueOnce(err);

			await buildOgImageResponse({
				size,
				boldText: "title",
				regularText: "subtitle",
				renderFallback: () => <div>fallback</div>,
				renderFull: () => <div>full</div>,
			});

			expect(warn).toHaveBeenCalledTimes(1);
			expect(warn).toHaveBeenCalledWith("OG image brand font unavailable", {
				alert: "og_font_fallback",
				font_weight: 400,
				degradation: "bold_only",
				error: err,
			});
		});

		it("両方成功した通常時はログを出さない（正常系をノイズにしない）", async () => {
			vi.mocked(loadMPlusRoundedSubset)
				.mockResolvedValueOnce(new ArrayBuffer(8))
				.mockResolvedValueOnce(new ArrayBuffer(4));

			await buildOgImageResponse({
				size,
				boldText: "title",
				regularText: "subtitle",
				renderFallback: () => <div>fallback</div>,
				renderFull: () => <div>full</div>,
			});

			expect(warn).not.toHaveBeenCalled();
		});
	});
});
