import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TimeControlPanel } from "../time-control-panel";

function buildAudition(
	overrides: Partial<Parameters<typeof TimeControlPanel>[0]["audition"]> = {},
) {
	return {
		isLooping: false,
		prerollEnabled: true,
		onToggleLoop: vi.fn(),
		onPlayHead: vi.fn(),
		onPlayTail: vi.fn(),
		onTogglePreroll: vi.fn(),
		...overrides,
	};
}

describe("TimeControlPanel", () => {
	const defaultProps = {
		startTime: 0,
		endTime: 0,
		currentTime: 0,
		videoDuration: 300,
		startTimeInput: "0:00.0",
		endTimeInput: "0:00.0",
		isEditingStartTime: false,
		isEditingEndTime: false,
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
		onSetStartTime: vi.fn(),
		onSetEndTime: vi.fn(),
		onSeek: vi.fn(),
		audition: buildAudition(),
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
			expect(screen.getByTestId("clip-trim-lane")).toBeInTheDocument();
		});

		it("現在時間が正しく表示される", () => {
			const props = { ...defaultProps, currentTime: 125.7 };
			render(<TimeControlPanel {...props} />);

			// 再生位置ピルとレーンの再生ヘッドの両方に出る
			expect(screen.getAllByText("2:05.7").length).toBeGreaterThan(0);
		});

		it("ズームボタンが3段階表示され、既定は±15秒", () => {
			render(<TimeControlPanel {...defaultProps} />);

			expect(screen.getByRole("button", { name: "±5秒" })).toHaveAttribute("aria-pressed", "false");
			expect(screen.getByRole("button", { name: "±15秒" })).toHaveAttribute("aria-pressed", "true");
			expect(screen.getByRole("button", { name: "±60秒" })).toHaveAttribute(
				"aria-pressed",
				"false",
			);
		});

		it("試聴コントロールが表示される", () => {
			render(<TimeControlPanel {...defaultProps} />);

			expect(screen.getByRole("button", { name: /区間をループ再生/ })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "頭を聴く" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "末尾を聴く" })).toBeInTheDocument();
			expect(screen.getByText("1.5秒前から鳴らす")).toBeInTheDocument();
		});
	});

	describe("Boundary Nudge Rows", () => {
		it("開始・終了それぞれに ±1 / ±0.1 の4ボタンが44pxで並ぶ", () => {
			render(<TimeControlPanel {...defaultProps} />);

			for (const label of ["-1", "-0.1", "+0.1", "+1"]) {
				const buttons = screen.getAllByRole("button").filter((btn) => btn.textContent === label);
				expect(buttons).toHaveLength(2);
				for (const btn of buttons) {
					expect(btn).toHaveClass("h-11", "w-11");
				}
			}
		});

		it("微調整ボタンでコールバックが呼ばれる", async () => {
			const user = userEvent.setup();
			render(<TimeControlPanel {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: "開始を0.1秒後ろへ" }));
			expect(defaultProps.onAdjustStartTime).toHaveBeenCalledWith(0.1);

			await user.click(screen.getByRole("button", { name: "終了を1秒前へ" }));
			expect(defaultProps.onAdjustEndTime).toHaveBeenCalledWith(-1);
		});

		it("時間入力フィールドが表示・編集できる", () => {
			const props = {
				...defaultProps,
				startTime: 10.5,
				endTime: 25.8,
			};
			render(<TimeControlPanel {...props} />);

			expect(screen.getByDisplayValue("0:10.5")).toBeInTheDocument();
			expect(screen.getByDisplayValue("0:25.8")).toBeInTheDocument();
		});

		it("1時間超は h:mm:ss.s 表記になる", () => {
			const props = {
				...defaultProps,
				startTime: 3723.4,
				endTime: 3733.4,
				videoDuration: 14400,
			};
			render(<TimeControlPanel {...props} />);

			expect(screen.getByDisplayValue("1:02:03.4")).toBeInTheDocument();
		});
	});

	describe("Duration Display", () => {
		it("有効な範囲で正しい時間が表示される", () => {
			const props = { ...defaultProps, startTime: 10, endTime: 15 };
			render(<TimeControlPanel {...props} />);

			// 長さ表示ボックスとレーン内クリップラベルの両方に出る
			expect(screen.getAllByText("5.0秒").length).toBeGreaterThan(0);
		});

		it("無効な範囲（開始時間 >= 終了時間）でエラーメッセージが表示される", () => {
			const props = { ...defaultProps, startTime: 15, endTime: 10 };
			render(<TimeControlPanel {...props} />);

			expect(screen.getByText("無効")).toBeInTheDocument();
			expect(screen.getByText("開始時間は終了時間より前にしてください")).toBeInTheDocument();
		});

		it("60秒超過でエラーメッセージが表示される", () => {
			const props = { ...defaultProps, startTime: 0, endTime: 65 };
			render(<TimeControlPanel {...props} />);

			expect(screen.getAllByText("65.0秒").length).toBeGreaterThan(0);
			expect(screen.getByText("60秒以下にしてください")).toBeInTheDocument();
		});

		it("1秒未満でエラーメッセージが表示される", () => {
			const props = { ...defaultProps, startTime: 0, endTime: 0.5 };
			render(<TimeControlPanel {...props} />);

			expect(screen.getByText("1秒以上にしてください")).toBeInTheDocument();
		});
	});

	describe("Audition Controls", () => {
		it("ループ再生ボタンクリックでコールバックが呼ばれる", async () => {
			const user = userEvent.setup();
			const audition = buildAudition();
			render(<TimeControlPanel {...defaultProps} startTime={0} endTime={5} audition={audition} />);

			await user.click(screen.getByRole("button", { name: /区間をループ再生/ }));
			expect(audition.onToggleLoop).toHaveBeenCalledTimes(1);
		});

		it("ループ中は停止表示になる", () => {
			render(
				<TimeControlPanel
					{...defaultProps}
					startTime={0}
					endTime={5}
					audition={buildAudition({ isLooping: true })}
				/>,
			);

			expect(screen.getByRole("button", { name: /停止/ })).toBeInTheDocument();
			expect(screen.queryByRole("button", { name: /区間をループ再生/ })).not.toBeInTheDocument();
		});

		it("無効な範囲では試聴ボタンが無効", () => {
			render(<TimeControlPanel {...defaultProps} startTime={10} endTime={5} />);

			expect(screen.getByRole("button", { name: /区間をループ再生/ })).toBeDisabled();
			expect(screen.getByRole("button", { name: "頭を聴く" })).toBeDisabled();
			expect(screen.getByRole("button", { name: "末尾を聴く" })).toBeDisabled();
		});

		it("作成中は試聴ボタンが無効", () => {
			render(<TimeControlPanel {...defaultProps} startTime={0} endTime={5} isCreating />);

			expect(screen.getByRole("button", { name: /区間をループ再生/ })).toBeDisabled();
		});

		it("頭・末尾の試聴ボタンでコールバックが呼ばれる", async () => {
			const user = userEvent.setup();
			const audition = buildAudition();
			render(<TimeControlPanel {...defaultProps} startTime={0} endTime={5} audition={audition} />);

			await user.click(screen.getByRole("button", { name: "頭を聴く" }));
			expect(audition.onPlayHead).toHaveBeenCalledTimes(1);

			await user.click(screen.getByRole("button", { name: "末尾を聴く" }));
			expect(audition.onPlayTail).toHaveBeenCalledTimes(1);
		});

		it("プリロールのチェックボックスでコールバックが呼ばれる", async () => {
			const user = userEvent.setup();
			const audition = buildAudition();
			render(<TimeControlPanel {...defaultProps} audition={audition} />);

			await user.click(screen.getByText("1.5秒前から鳴らす"));
			expect(audition.onTogglePreroll).toHaveBeenCalled();
		});
	});

	describe("Zoom", () => {
		it("ズームボタンで切り替えられる", async () => {
			const user = userEvent.setup();
			render(<TimeControlPanel {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: "±5秒" }));
			expect(screen.getByRole("button", { name: "±5秒" })).toHaveAttribute("aria-pressed", "true");
			expect(screen.getByRole("button", { name: "±15秒" })).toHaveAttribute(
				"aria-pressed",
				"false",
			);
		});
	});

	describe("Keyboard Shortcuts", () => {
		it("← → で再生位置が0.1秒動く", () => {
			render(<TimeControlPanel {...defaultProps} currentTime={10} />);

			fireEvent.keyDown(document, { key: "ArrowRight" });
			expect(defaultProps.onSeek).toHaveBeenCalledWith(10.1);

			fireEvent.keyDown(document, { key: "ArrowLeft" });
			expect(defaultProps.onSeek).toHaveBeenCalledWith(9.9);
		});

		it("Shift + ← → で1秒動く", () => {
			render(<TimeControlPanel {...defaultProps} currentTime={10} />);

			fireEvent.keyDown(document, { key: "ArrowRight", shiftKey: true });
			expect(defaultProps.onSeek).toHaveBeenCalledWith(11);
		});

		it("0未満・動画長超へはシークしない（クランプ）", () => {
			render(<TimeControlPanel {...defaultProps} currentTime={0} videoDuration={300} />);

			fireEvent.keyDown(document, { key: "ArrowLeft" });
			expect(defaultProps.onSeek).toHaveBeenCalledWith(0);
		});

		it("Space でループ再生がトグルされる", () => {
			const audition = buildAudition();
			render(<TimeControlPanel {...defaultProps} audition={audition} />);

			fireEvent.keyDown(document, { key: " " });
			expect(audition.onToggleLoop).toHaveBeenCalledTimes(1);
		});

		it("[ ] でズームが切り替わる", () => {
			render(<TimeControlPanel {...defaultProps} />);

			fireEvent.keyDown(document, { key: "[" });
			expect(screen.getByRole("button", { name: "±60秒" })).toHaveAttribute("aria-pressed", "true");

			fireEvent.keyDown(document, { key: "]" });
			expect(screen.getByRole("button", { name: "±15秒" })).toHaveAttribute("aria-pressed", "true");
		});

		it("入力欄フォーカス中はショートカットが無効", async () => {
			const user = userEvent.setup();
			render(<TimeControlPanel {...defaultProps} currentTime={10} />);

			const input = screen.getAllByDisplayValue("0:00.0")[0]!;
			await user.click(input);
			fireEvent.keyDown(input, { key: "ArrowRight" });
			expect(defaultProps.onSeek).not.toHaveBeenCalled();
		});

		it("作成中はショートカットが無効", () => {
			render(<TimeControlPanel {...defaultProps} currentTime={10} isCreating />);

			fireEvent.keyDown(document, { key: "ArrowRight" });
			expect(defaultProps.onSeek).not.toHaveBeenCalled();
		});
	});

	describe("Explore Lane (SPR-289)", () => {
		it("探索レーンと凡例が表示される", () => {
			render(<TimeControlPanel {...defaultProps} madeMarks={[10, 50]} draftMarks={[100]} />);

			expect(screen.getByText("動画全体から探す")).toBeInTheDocument();
			expect(screen.getByTestId("clip-explore-lane")).toBeInTheDocument();
			expect(screen.getByText("作成済み 2")).toBeInTheDocument();
			expect(screen.getByText("下書き 1")).toBeInTheDocument();
		});

		it("下書きが無いときは下書き凡例を出さない", () => {
			render(<TimeControlPanel {...defaultProps} madeMarks={[10]} />);

			expect(screen.getByText("作成済み 1")).toBeInTheDocument();
			expect(screen.queryByText(/下書き/)).not.toBeInTheDocument();
		});

		it("探索レーンのクリックでクリップが長さを保ったまま移動する", () => {
			const rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
				left: 0,
				top: 0,
				right: 800,
				bottom: 64,
				width: 800,
				height: 64,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			} as DOMRect);

			render(<TimeControlPanel {...defaultProps} startTime={10} endTime={20} />);

			// 400px = 動画(300秒)の中央 150 秒 → 長さ10秒のまま 150-160 へ
			fireEvent.click(screen.getByTestId("clip-explore-lane"), { clientX: 400 });
			expect(defaultProps.onSetStartTime).toHaveBeenCalledWith(150);
			expect(defaultProps.onSetEndTime).toHaveBeenCalledWith(160);

			rectSpy.mockRestore();
		});
	});

	describe("I/O Set Buttons", () => {
		it("開始・終了時間に設定ボタンでコールバックが呼ばれる", async () => {
			const user = userEvent.setup();
			render(<TimeControlPanel {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /開始時間に設定/ }));
			expect(defaultProps.onSetCurrentAsStart).toHaveBeenCalledTimes(1);

			await user.click(screen.getByRole("button", { name: /終了時間に設定/ }));
			expect(defaultProps.onSetCurrentAsEnd).toHaveBeenCalledTimes(1);
		});
	});
});
