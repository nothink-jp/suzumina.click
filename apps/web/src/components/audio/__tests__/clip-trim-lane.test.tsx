import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClipTrimLane } from "../clip-trim-lane";

/**
 * レーン幅 800px / 表示窓 [0, 30]（viewCenter=15, halfWindow=15）に固定して検証する。
 * clientX → 時刻の換算は x / 800 * 30 秒。
 */
describe("ClipTrimLane", () => {
	const defaultProps = {
		startTime: 10,
		endTime: 20,
		currentTime: 12,
		videoDuration: 300,
		viewCenter: 15,
		halfWindow: 15,
		onChangeStart: vi.fn(),
		onChangeEnd: vi.fn(),
		onMoveClip: vi.fn(),
		onSeek: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
			left: 0,
			top: 0,
			right: 800,
			bottom: 96,
			width: 800,
			height: 96,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		} as DOMRect);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("クリップブロック・ハンドル・再生ヘッドが描画される", () => {
		render(<ClipTrimLane {...defaultProps} />);

		expect(screen.getByTestId("clip-trim-lane")).toBeInTheDocument();
		expect(screen.getByTestId("clip-start-handle")).toBeInTheDocument();
		expect(screen.getByTestId("clip-end-handle")).toBeInTheDocument();
		expect(screen.getByText("10.0秒")).toBeInTheDocument();
		// 再生ヘッドのタイムチップ（formatTimestamp 表記）
		expect(screen.getByText("0:12.0")).toBeInTheDocument();
	});

	it("ハンドルに slider ロールと現在値が付く", () => {
		render(<ClipTrimLane {...defaultProps} />);

		expect(screen.getByTestId("clip-start-handle")).toHaveAttribute("aria-valuenow", "10");
		expect(screen.getByTestId("clip-end-handle")).toHaveAttribute("aria-valuenow", "20");
	});

	it("開始ハンドルのドラッグで onChangeStart が呼ばれる", () => {
		render(<ClipTrimLane {...defaultProps} />);

		fireEvent.pointerDown(screen.getByTestId("clip-start-handle"), { clientX: 267 });
		// 160px = 6.0 秒
		fireEvent.pointerMove(document, { clientX: 160 });
		expect(defaultProps.onChangeStart).toHaveBeenCalledWith(6);
		fireEvent.pointerUp(document);
	});

	it("開始ハンドルは終了-1秒まででクランプされる", () => {
		render(<ClipTrimLane {...defaultProps} />);

		fireEvent.pointerDown(screen.getByTestId("clip-start-handle"), { clientX: 267 });
		// 720px = 27 秒 → end(20) - 1 = 19 でクランプ
		fireEvent.pointerMove(document, { clientX: 720 });
		expect(defaultProps.onChangeStart).toHaveBeenCalledWith(19);
		fireEvent.pointerUp(document);
	});

	it("終了ハンドルのドラッグで onChangeEnd が呼ばれる", () => {
		render(<ClipTrimLane {...defaultProps} />);

		fireEvent.pointerDown(screen.getByTestId("clip-end-handle"), { clientX: 533 });
		// 640px = 24 秒
		fireEvent.pointerMove(document, { clientX: 640 });
		expect(defaultProps.onChangeEnd).toHaveBeenCalledWith(24);
		fireEvent.pointerUp(document);
	});

	it("終了ハンドルは開始+60秒を超えない", () => {
		render(
			<ClipTrimLane {...defaultProps} startTime={0} endTime={20} viewCenter={40} halfWindow={60} />,
		);

		// 窓 [-20, 100]: 800px = 120秒 → clientX 700 = 85 秒 → 0 + 60 でクランプ
		fireEvent.pointerDown(screen.getByTestId("clip-end-handle"), { clientX: 267 });
		fireEvent.pointerMove(document, { clientX: 700 });
		expect(defaultProps.onChangeEnd).toHaveBeenCalledWith(60);
		fireEvent.pointerUp(document);
	});

	it("中央ドラッグで長さを保ったまま移動する", () => {
		render(<ClipTrimLane {...defaultProps} />);

		// 掴み位置 400px = 15秒（クリップ内・開始から+5秒）
		fireEvent.pointerDown(screen.getByTestId("clip-move-area"), { clientX: 400 });
		// 480px = 18秒 → 開始 13 / 終了 23（長さ10秒を維持）
		fireEvent.pointerMove(document, { clientX: 480 });
		expect(defaultProps.onMoveClip).toHaveBeenCalledWith(13, 23);
		fireEvent.pointerUp(document);
	});

	it("レーン余白クリックで onSeek が呼ばれる", () => {
		render(<ClipTrimLane {...defaultProps} />);

		// 80px = 3.0 秒
		fireEvent.click(screen.getByTestId("clip-trim-lane"), { clientX: 80 });
		expect(defaultProps.onSeek).toHaveBeenCalledWith(3);
	});

	it("ドラッグ直後の click ではシークしない", () => {
		render(<ClipTrimLane {...defaultProps} />);

		fireEvent.pointerDown(screen.getByTestId("clip-start-handle"), { clientX: 267 });
		fireEvent.pointerMove(document, { clientX: 160 });
		fireEvent.pointerUp(document);
		// ブラウザは pointerup 直後に click を発火する
		fireEvent.click(screen.getByTestId("clip-trim-lane"), { clientX: 160 });
		expect(defaultProps.onSeek).not.toHaveBeenCalled();
	});

	it("ハンドルフォーカス中の ←→ で境界が0.1秒動く（Shift で1秒）", () => {
		render(<ClipTrimLane {...defaultProps} />);

		const startHandle = screen.getByTestId("clip-start-handle");
		fireEvent.keyDown(startHandle, { key: "ArrowRight" });
		expect(defaultProps.onChangeStart).toHaveBeenCalledWith(10.1);

		fireEvent.keyDown(startHandle, { key: "ArrowLeft", shiftKey: true });
		expect(defaultProps.onChangeStart).toHaveBeenCalledWith(9);
	});

	it("disabled 時はドラッグもクリックも無効", () => {
		render(<ClipTrimLane {...defaultProps} disabled />);

		fireEvent.pointerDown(screen.getByTestId("clip-start-handle"), { clientX: 267 });
		fireEvent.pointerMove(document, { clientX: 160 });
		expect(defaultProps.onChangeStart).not.toHaveBeenCalled();

		fireEvent.click(screen.getByTestId("clip-trim-lane"), { clientX: 80 });
		expect(defaultProps.onSeek).not.toHaveBeenCalled();
	});

	it("再生ヘッドは表示窓の外では描画されない", () => {
		render(<ClipTrimLane {...defaultProps} currentTime={100} />);

		expect(screen.queryByText("1:40.0")).not.toBeInTheDocument();
	});
});
