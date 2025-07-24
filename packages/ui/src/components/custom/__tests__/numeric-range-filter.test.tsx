import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NumericRangeFilter } from "../numeric-range-filter";

describe("NumericRangeFilter", () => {
	const mockOnChange = vi.fn();

	beforeEach(() => {
		mockOnChange.mockClear();
	});

	it("基本的なレンダリングが正しく行われる", () => {
		render(
			<NumericRangeFilter
				label="数値範囲"
				value={{ min: undefined, max: undefined }}
				onChange={mockOnChange}
			/>,
		);

		expect(screen.getByRole("button")).toBeInTheDocument();
		expect(screen.getByText(/数値範囲/)).toBeInTheDocument();
	});

	it("値がある場合の表示フォーマット", () => {
		render(
			<NumericRangeFilter
				label="再生数"
				value={{ min: 10, max: 100 }}
				onChange={mockOnChange}
				unit="回"
			/>,
		);

		expect(screen.getByText(/再生数.*10.*100.*回/)).toBeInTheDocument();
	});

	it("最小値のみ設定時の表示", () => {
		render(
			<NumericRangeFilter
				label="再生数"
				value={{ min: 10, max: undefined }}
				onChange={mockOnChange}
				unit="回"
			/>,
		);

		expect(screen.getByText(/再生数.*10.*回以上/)).toBeInTheDocument();
	});

	it("最大値のみ設定時の表示", () => {
		render(
			<NumericRangeFilter
				label="再生数"
				value={{ min: undefined, max: 100 }}
				onChange={mockOnChange}
				unit="回"
			/>,
		);

		expect(screen.getByText(/再生数.*100.*回以下/)).toBeInTheDocument();
	});

	it("値がない場合の表示", () => {
		render(
			<NumericRangeFilter
				label="再生数"
				value={{ min: undefined, max: undefined }}
				onChange={mockOnChange}
				unit="回"
			/>,
		);

		expect(screen.getByText(/再生数.*すべて/)).toBeInTheDocument();
	});

	it("プリセットオプションがある場合", () => {
		const presets = [
			{ label: "1回以上", min: 1 },
			{ label: "10回以上", min: 10 },
		];

		render(
			<NumericRangeFilter
				label="再生数"
				value={{ min: undefined, max: undefined }}
				onChange={mockOnChange}
				presets={presets}
			/>,
		);

		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("値がある場合は secondary バリアントになる", () => {
		render(
			<NumericRangeFilter
				label="再生数"
				value={{ min: 10, max: undefined }}
				onChange={mockOnChange}
			/>,
		);

		const button = screen.getByRole("button");
		expect(button).toHaveClass("bg-secondary");
	});

	it("値がない場合は outline バリアントになる", () => {
		render(
			<NumericRangeFilter
				label="再生数"
				value={{ min: undefined, max: undefined }}
				onChange={mockOnChange}
			/>,
		);

		const button = screen.getByRole("button");
		expect(button).toHaveClass("border");
	});
});
