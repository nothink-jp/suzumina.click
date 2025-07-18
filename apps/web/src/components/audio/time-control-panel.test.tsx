import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TimeControlPanel } from "./time-control-panel";

describe("TimeControlPanel", () => {
	const defaultProps = {
		startTime: 0,
		endTime: 0,
		currentTime: 0,
		startTimeInput: "0:00.0",
		endTimeInput: "0:00.0",
		isEditingStartTime: false,
		isEditingEndTime: false,
		isAdjusting: false,
		onStartTimeInputChange: vi.fn(),
		onEndTimeInputChange: vi.fn(),
		onStartTimeBlur: vi.fn(),
		onEndTimeBlur: vi.fn(),
		onStartTimeKeyDown: vi.fn(),
		onEndTimeKeyDown: vi.fn(),
		onSetCurrentAsStart: vi.fn(),
		onSetCurrentAsEnd: vi.fn(),
		onAdjustStartTime: vi.fn(),
		onAdjustEndTime: vi.fn(),
		onPreviewRange: vi.fn(),
		isCreating: false,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Basic Rendering", () => {
		it("コンポーネントが正常にレンダリングされる", () => {
			render(<TimeControlPanel {...defaultProps} />);

			expect(screen.getByText("切り抜き範囲")).toBeInTheDocument();
			expect(screen.getByText("開始時間に設定")).toBeInTheDocument();
			expect(screen.getByText("終了時間に設定")).toBeInTheDocument();
		});

		it("現在時間が正しく表示される", () => {
			const props = { ...defaultProps, currentTime: 125.7 };
			render(<TimeControlPanel {...props} />);

			expect(screen.getByText("2:05.7")).toBeInTheDocument();
		});

		it("プレビューボタンが表示される", () => {
			render(<TimeControlPanel {...defaultProps} />);

			expect(screen.getByRole("button", { name: /選択範囲をプレビュー/ })).toBeInTheDocument();
		});
	});

	describe("Time Input Fields", () => {
		it("TimeInputFieldコンポーネントが正しい props で呼び出される", () => {
			const props = {
				...defaultProps,
				startTime: 10.5,
				endTime: 25.8,
				startTimeInput: "0:10.5",
				endTimeInput: "0:25.8",
			};
			render(<TimeControlPanel {...props} />);

			expect(screen.getByDisplayValue("0:10.5")).toBeInTheDocument();
			expect(screen.getByDisplayValue("0:25.8")).toBeInTheDocument();
		});

		it("編集状態が正しく反映される", () => {
			const props = {
				...defaultProps,
				isEditingStartTime: true,
				isEditingEndTime: true,
			};
			render(<TimeControlPanel {...props} />);

			// 編集状態の表示は TimeInputField コンポーネント内で処理される
			expect(screen.getByText("開始時間に設定")).toBeInTheDocument();
			expect(screen.getByText("終了時間に設定")).toBeInTheDocument();
		});
	});

	describe("Duration Display", () => {
		it("有効な範囲で正しい時間が表示される", () => {
			const props = {
				...defaultProps,
				startTime: 10,
				endTime: 15,
			};
			render(<TimeControlPanel {...props} />);

			expect(screen.getByText("5.0秒")).toBeInTheDocument();
		});

		it("無効な範囲（開始時間 >= 終了時間）でエラーメッセージが表示される", () => {
			const props = {
				...defaultProps,
				startTime: 15,
				endTime: 10,
			};
			render(<TimeControlPanel {...props} />);

			expect(screen.getByText("無効")).toBeInTheDocument();
			expect(screen.getByText("開始時間は終了時間より前にしてください")).toBeInTheDocument();
		});

		it("60秒超過でエラーメッセージが表示される", () => {
			const props = {
				...defaultProps,
				startTime: 0,
				endTime: 65,
			};
			render(<TimeControlPanel {...props} />);

			expect(screen.getByText("65.0秒")).toBeInTheDocument();
			expect(screen.getByText("60秒以下にしてください")).toBeInTheDocument();
		});

		it("1秒未満でエラーメッセージが表示される", () => {
			const props = {
				...defaultProps,
				startTime: 0,
				endTime: 0.5,
			};
			render(<TimeControlPanel {...props} />);

			expect(screen.getByText("0.5秒")).toBeInTheDocument();
			expect(screen.getByText("1秒以上にしてください")).toBeInTheDocument();
		});
	});

	describe("Preview Functionality", () => {
		it("有効な範囲でプレビューボタンが有効", () => {
			const props = {
				...defaultProps,
				startTime: 0,
				endTime: 5,
			};
			render(<TimeControlPanel {...props} />);

			const previewButton = screen.getByRole("button", { name: /選択範囲をプレビュー/ });
			expect(previewButton).toBeEnabled();
		});

		it("無効な範囲でプレビューボタンが無効", () => {
			const props = {
				...defaultProps,
				startTime: 10,
				endTime: 5,
			};
			render(<TimeControlPanel {...props} />);

			const previewButton = screen.getByRole("button", { name: /選択範囲をプレビュー/ });
			expect(previewButton).toBeDisabled();
		});

		it("作成中はプレビューボタンが無効", () => {
			const props = {
				...defaultProps,
				startTime: 0,
				endTime: 5,
				isCreating: true,
			};
			render(<TimeControlPanel {...props} />);

			const previewButton = screen.getByRole("button", { name: /選択範囲をプレビュー/ });
			expect(previewButton).toBeDisabled();
		});

		it("プレビューボタンクリックでコールバックが呼ばれる", async () => {
			const user = userEvent.setup();
			const onPreviewRange = vi.fn();
			const props = {
				...defaultProps,
				startTime: 0,
				endTime: 5,
				onPreviewRange,
			};
			render(<TimeControlPanel {...props} />);

			const previewButton = screen.getByRole("button", { name: /選択範囲をプレビュー/ });
			await user.click(previewButton);

			expect(onPreviewRange).toHaveBeenCalledTimes(1);
		});
	});

	describe("Styling and States", () => {
		it("有効な範囲で適切なスタイルが適用される", () => {
			const props = {
				...defaultProps,
				startTime: 0,
				endTime: 5,
			};
			render(<TimeControlPanel {...props} />);

			const durationDisplay = screen.getByText("5.0秒").closest("div");
			expect(durationDisplay).toHaveClass("bg-primary/10", "border-primary/20");
		});

		it("無効な範囲で適切なエラースタイルが適用される", () => {
			const props = {
				...defaultProps,
				startTime: 10,
				endTime: 5,
			};
			render(<TimeControlPanel {...props} />);

			const durationDisplay = screen.getByText("無効").closest("div");
			expect(durationDisplay).toHaveClass("bg-destructive/10", "border-destructive/20");
		});

		it("60秒超過で適切なエラースタイルが適用される", () => {
			const props = {
				...defaultProps,
				startTime: 0,
				endTime: 65,
			};
			render(<TimeControlPanel {...props} />);

			const durationText = screen.getByText("65.0秒");
			expect(durationText).toHaveClass("text-destructive");
		});
	});

	describe("Responsive Design", () => {
		it("レスポンシブクラスが適切に適用される", () => {
			render(<TimeControlPanel {...defaultProps} />);

			const previewButton = screen.getByRole("button", { name: /選択範囲をプレビュー/ });
			expect(previewButton).toHaveClass("min-h-[44px]", "h-11", "sm:h-12");
		});

		it("モバイル対応のグリッドクラスが適用される", () => {
			render(<TimeControlPanel {...defaultProps} />);

			// TimeInputField が配置されるグリッドコンテナを確認
			const gridContainer = screen.getByText("開始時間に設定").closest(".grid");
			expect(gridContainer).toHaveClass("grid-cols-1", "sm:grid-cols-2");
		});
	});

	describe("Accessibility", () => {
		it("適切なボタンラベルが設定されている", () => {
			render(<TimeControlPanel {...defaultProps} />);

			expect(screen.getByRole("button", { name: /選択範囲をプレビュー/ })).toBeInTheDocument();
		});

		it("時間表示に適切なテキストが含まれている", () => {
			const props = {
				...defaultProps,
				startTime: 0,
				endTime: 5,
			};
			render(<TimeControlPanel {...props} />);

			expect(screen.getByText(/切り抜き時間:/)).toBeInTheDocument();
		});

		it("エラーメッセージが適切に表示される", () => {
			const props = {
				...defaultProps,
				startTime: 10,
				endTime: 5,
			};
			render(<TimeControlPanel {...props} />);

			expect(screen.getByText("開始時間は終了時間より前にしてください")).toBeInTheDocument();
		});
	});

	describe("Edge Cases", () => {
		it("小数点を含む時間が正しく表示される", () => {
			const props = {
				...defaultProps,
				startTime: 1.23,
				endTime: 4.56,
			};
			render(<TimeControlPanel {...props} />);

			expect(screen.getByText("3.3秒")).toBeInTheDocument();
		});

		it("0秒の範囲で適切に処理される", () => {
			const props = {
				...defaultProps,
				startTime: 5,
				endTime: 5,
			};
			render(<TimeControlPanel {...props} />);

			expect(screen.getByText("無効")).toBeInTheDocument();
		});

		it("非常に大きな時間値でも正常に動作する", () => {
			const props = {
				...defaultProps,
				currentTime: 7200, // 2時間
			};
			render(<TimeControlPanel {...props} />);

			// format="auto"では1時間超過のh:mm:ss.sフォーマットになる
			expect(screen.getByText("2:00:00.0")).toBeInTheDocument();
		});

		it("負の時間値は適切に処理される", () => {
			const props = {
				...defaultProps,
				startTime: -5,
				endTime: 10,
			};
			render(<TimeControlPanel {...props} />);

			// 負の値でも時間計算は正常に動作する
			expect(screen.getByText("15.0秒")).toBeInTheDocument();
		});
	});
});
