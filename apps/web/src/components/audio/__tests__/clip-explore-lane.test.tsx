import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClipExploreLane } from "../clip-explore-lane";

/** レーン幅 800px / 動画 13335 秒（3:42:15）で検証。clientX → 時刻は x / 800 * 13335 秒 */
describe("ClipExploreLane", () => {
	const defaultProps = {
		videoDuration: 13335,
		windowStart: 1920,
		windowEnd: 1950,
		madeMarks: [412, 1934, 5210],
		draftMarks: [4520, 8130],
		onJump: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
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
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("レーン・窓インジケータ・両端の時刻が描画される", () => {
		render(<ClipExploreLane {...defaultProps} />);

		expect(screen.getByTestId("clip-explore-lane")).toBeInTheDocument();
		expect(screen.getByTestId("explore-window")).toBeInTheDocument();
		expect(screen.getByText("0:00")).toBeInTheDocument();
		expect(screen.getByText("3:42:15")).toBeInTheDocument();
	});

	it("時間目盛りが1時間刻みで描画される（3.7時間動画）", () => {
		render(<ClipExploreLane {...defaultProps} />);

		expect(screen.getByText("1:00:00")).toBeInTheDocument();
		expect(screen.getByText("2:00:00")).toBeInTheDocument();
		expect(screen.getByText("3:00:00")).toBeInTheDocument();
		expect(screen.queryByText("4:00:00")).not.toBeInTheDocument();
	});

	it("短い動画では10分刻みになる", () => {
		render(<ClipExploreLane {...defaultProps} videoDuration={3600} />);

		expect(screen.getByText("10:00")).toBeInTheDocument();
		expect(screen.getByText("30:00")).toBeInTheDocument();
	});

	it("作成済み・下書きマークが描画される", () => {
		render(<ClipExploreLane {...defaultProps} />);

		expect(screen.getAllByTestId("explore-made-mark")).toHaveLength(3);
		expect(screen.getAllByTestId("explore-draft-mark")).toHaveLength(2);
	});

	it("同一時刻のマークは重複排除される", () => {
		render(<ClipExploreLane {...defaultProps} madeMarks={[100, 100, 200]} />);

		expect(screen.getAllByTestId("explore-made-mark")).toHaveLength(2);
	});

	it("マーク未指定でも描画できる（未ログイン・編集画面）", () => {
		render(
			<ClipExploreLane
				videoDuration={13335}
				windowStart={0}
				windowEnd={30}
				onJump={defaultProps.onJump}
			/>,
		);

		expect(screen.getByTestId("clip-explore-lane")).toBeInTheDocument();
		expect(screen.queryAllByTestId("explore-made-mark")).toHaveLength(0);
	});

	it("クリックでその位置の時刻が onJump に渡る", () => {
		render(<ClipExploreLane {...defaultProps} />);

		// 400px = 動画のちょうど中央 = 6667.5 秒
		fireEvent.click(screen.getByTestId("clip-explore-lane"), { clientX: 400 });
		expect(defaultProps.onJump).toHaveBeenCalledWith(6667.5);
	});

	it("disabled 時はクリックしても onJump が呼ばれない", () => {
		render(<ClipExploreLane {...defaultProps} disabled />);

		fireEvent.click(screen.getByTestId("clip-explore-lane"), { clientX: 400 });
		expect(defaultProps.onJump).not.toHaveBeenCalled();
	});
});
