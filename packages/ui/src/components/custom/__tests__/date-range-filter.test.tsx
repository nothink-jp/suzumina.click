import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DateRangeFilter } from "../date-range-filter";

describe("DateRangeFilter", () => {
	const mockOnChange = vi.fn();

	beforeEach(() => {
		mockOnChange.mockClear();
	});

	it("基本的なレンダリングが正しく行われる", () => {
		render(
			<DateRangeFilter
				label="日付範囲"
				value={{ from: undefined, to: undefined }}
				onChange={mockOnChange}
			/>,
		);

		expect(screen.getByText("日付範囲: すべて")).toBeInTheDocument();
	});

	it("初期値が正しく表示される", () => {
		const fromDate = new Date("2024-01-01");
		const toDate = new Date("2024-01-31");

		render(
			<DateRangeFilter
				label="日付範囲"
				value={{ from: fromDate, to: toDate }}
				onChange={mockOnChange}
			/>,
		);

		expect(screen.getByText("日付範囲: 2024/01/01 - 2024/01/31")).toBeInTheDocument();
	});

	it("開始日のみ設定時の表示", () => {
		const fromDate = new Date("2024-01-01");

		render(
			<DateRangeFilter
				label="作成日"
				value={{ from: fromDate, to: undefined }}
				onChange={mockOnChange}
			/>,
		);

		expect(screen.getByText("作成日: 2024/01/01以降")).toBeInTheDocument();
	});

	it("終了日のみ設定時の表示", () => {
		const toDate = new Date("2024-01-31");

		render(
			<DateRangeFilter
				label="作成日"
				value={{ from: undefined, to: toDate }}
				onChange={mockOnChange}
			/>,
		);

		expect(screen.getByText("作成日: 2024/01/31以前")).toBeInTheDocument();
	});

	it("同じ日付設定時の表示", () => {
		const sameDate = new Date("2024-01-01");

		render(
			<DateRangeFilter
				label="作成日"
				value={{ from: sameDate, to: sameDate }}
				onChange={mockOnChange}
			/>,
		);

		expect(screen.getByText("作成日: 2024/01/01")).toBeInTheDocument();
	});

	it("値がある場合は secondary バリアントのボタンになる", () => {
		const fromDate = new Date("2024-01-01");

		render(
			<DateRangeFilter
				label="作成日"
				value={{ from: fromDate, to: undefined }}
				onChange={mockOnChange}
			/>,
		);

		const button = screen.getByRole("button");
		expect(button).toHaveClass("bg-secondary");
	});

	it("値がない場合は outline バリアントのボタンになる", () => {
		render(
			<DateRangeFilter
				label="作成日"
				value={{ from: undefined, to: undefined }}
				onChange={mockOnChange}
			/>,
		);

		const button = screen.getByRole("button");
		expect(button).toHaveClass("border");
	});

	it("ポップオーバーを開くとプリセットが表示される", async () => {
		const user = userEvent.setup();
		render(
			<DateRangeFilter
				label="作成日"
				value={{ from: undefined, to: undefined }}
				onChange={mockOnChange}
			/>,
		);

		const button = screen.getByRole("button");
		await user.click(button);

		expect(screen.getByText("今日")).toBeInTheDocument();
		expect(screen.getByText("今週")).toBeInTheDocument();
		expect(screen.getByText("今月")).toBeInTheDocument();
		expect(screen.getByText("過去3ヶ月")).toBeInTheDocument();
	});
});
