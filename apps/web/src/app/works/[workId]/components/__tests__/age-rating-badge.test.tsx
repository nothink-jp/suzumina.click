import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// checkAgeRating / getAgeRatingDisplayName の内部に依存せず分岐を検証
const { mockCheck, mockDisplay } = vi.hoisted(() => ({ mockCheck: vi.fn(), mockDisplay: vi.fn() }));
vi.mock("@suzumina.click/shared-types", () => ({
	// parseWorkDocument 用の pass-through（検証は素通し）
	WorkDocumentSchema: { safeParse: (data: unknown) => ({ success: true, data }) },
	checkAgeRating: mockCheck,
	getAgeRatingDisplayName: mockDisplay,
}));

const { AgeRatingBadge } = await import("../age-rating-badge");

describe("AgeRatingBadge", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDisplay.mockReturnValue("表示名");
	});

	it("R18 は赤バッジ", () => {
		mockCheck.mockReturnValue({ isR18: true, isAllAges: false });
		render(<AgeRatingBadge ageRating="R18" />);
		expect(screen.getByText("表示名").className).toContain("bg-red-600");
	});

	it("全年齢は緑バッジ", () => {
		mockCheck.mockReturnValue({ isR18: false, isAllAges: true });
		render(<AgeRatingBadge ageRating="全年齢" />);
		expect(screen.getByText("表示名").className).toContain("border-green-500");
	});

	it("その他はグレー、size=sm で小サイズ class", () => {
		mockCheck.mockReturnValue({ isR18: false, isAllAges: false });
		render(<AgeRatingBadge ageRating="R15" size="sm" />);
		const badge = screen.getByText("表示名");
		expect(badge.className).toContain("bg-gray-100");
		expect(badge.className).toContain("text-sm px-3 py-1");
	});

	it("size 既定（base）は大サイズ class", () => {
		mockCheck.mockReturnValue({ isR18: true, isAllAges: false });
		render(<AgeRatingBadge ageRating="R18" />);
		expect(screen.getByText("表示名").className).toContain("text-base px-4 py-2");
	});
});
