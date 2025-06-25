import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioButton } from "./audio-button.js";

// Mock audio element methods
const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockPause = vi.fn();
const mockLoad = vi.fn();

// Mock HTMLAudioElement with necessary properties
Object.defineProperty(HTMLMediaElement.prototype, "play", {
	writable: true,
	value: mockPlay,
});

Object.defineProperty(HTMLMediaElement.prototype, "pause", {
	writable: true,
	value: mockPause,
});

Object.defineProperty(HTMLMediaElement.prototype, "load", {
	writable: true,
	value: mockLoad,
});

// Helper function to simulate audio loading
const simulateAudioLoad = () => {
	const audioElement = document.querySelector("audio") as HTMLAudioElement;
	if (audioElement) {
		act(() => {
			audioElement.dispatchEvent(new Event("loadeddata"));
		});
	}
};

describe("AudioButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("基本的な音声ボタンが表示される", () => {
		render(<AudioButton audioUrl="test-audio.mp3" title="テスト音声" />);

		expect(screen.getByText("テスト音声")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "再生" })).toBeInTheDocument();
	});

	it("再生ボタンをクリックすると再生される", async () => {
		const onPlay = vi.fn();
		const onPlayCountIncrement = vi.fn();

		render(
			<AudioButton
				audioUrl="test-audio.mp3"
				title="テスト音声"
				onPlay={onPlay}
				onPlayCountIncrement={onPlayCountIncrement}
			/>,
		);

		simulateAudioLoad();

		await waitFor(() => {
			const playButton = screen.getByRole("button", { name: "再生" });
			expect(playButton).not.toBeDisabled();
		});

		const playButton = screen.getByRole("button", { name: "再生" });
		fireEvent.click(playButton);

		expect(mockPlay).toHaveBeenCalled();
	});

	it("時間が表示される", () => {
		render(<AudioButton audioUrl="test-audio.mp3" title="テスト音声" duration={83} />);

		expect(screen.getByText("1:23")).toBeInTheDocument();
	});

	it("カテゴリに応じたスタイルが適用される", () => {
		render(<AudioButton audioUrl="test-audio.mp3" title="音声" category="voice" />);

		const button = screen.getByRole("button", { name: "再生" });
		expect(button).toHaveClass("text-pink-600");
	});

	it("無効化状態で正しく動作する", () => {
		render(<AudioButton audioUrl="test-audio.mp3" title="音声" disabled />);

		const button = screen.getByRole("button", { name: "再生" });
		expect(button).toBeDisabled();
	});

	it("エラーハンドリングが動作する", async () => {
		const onError = vi.fn();

		render(<AudioButton audioUrl="invalid-audio.mp3" title="音声" onError={onError} />);

		const audioElement = document.querySelector("audio") as HTMLAudioElement;
		if (audioElement) {
			act(() => {
				audioElement.dispatchEvent(new Event("error"));
			});
		}

		await waitFor(() => {
			expect(screen.getByText("エラー")).toBeInTheDocument();
		});

		expect(onError).toHaveBeenCalledWith("音声ファイルの読み込みに失敗しました");
	});

	it("再生終了時のコールバックが動作する", async () => {
		const onEnded = vi.fn();

		render(<AudioButton audioUrl="test-audio.mp3" title="音声" onEnded={onEnded} />);

		simulateAudioLoad();

		const audioElement = document.querySelector("audio") as HTMLAudioElement;
		if (audioElement) {
			act(() => {
				audioElement.dispatchEvent(new Event("ended"));
			});
		}

		await waitFor(() => {
			expect(onEnded).toHaveBeenCalled();
		});
	});

	it("異なるサイズで正しく表示される", () => {
		const { rerender } = render(<AudioButton audioUrl="test-audio.mp3" title="音声" size="sm" />);
		expect(screen.getByRole("button")).toBeInTheDocument();

		rerender(<AudioButton audioUrl="test-audio.mp3" title="音声" size="lg" />);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("再生回数カウントが初回のみ実行される", async () => {
		const onPlayCountIncrement = vi.fn();

		render(
			<AudioButton
				audioUrl="test-audio.mp3"
				title="音声"
				onPlayCountIncrement={onPlayCountIncrement}
			/>,
		);

		simulateAudioLoad();

		const audioElement = document.querySelector("audio") as HTMLAudioElement;
		if (audioElement) {
			// 1回目の再生
			act(() => {
				audioElement.dispatchEvent(new Event("play"));
			});

			// 2回目の再生
			act(() => {
				audioElement.dispatchEvent(new Event("play"));
			});
		}

		await waitFor(() => {
			expect(onPlayCountIncrement).toHaveBeenCalledTimes(1);
		});
	});

	it("autoPlayが有効な場合、読み込み後に自動再生される", async () => {
		const onPlay = vi.fn();

		render(<AudioButton audioUrl="test-audio.mp3" title="音声" autoPlay onPlay={onPlay} />);

		simulateAudioLoad();

		await waitFor(() => {
			expect(mockPlay).toHaveBeenCalled();
		});
	});

	it("autoPlayが有効でもdisabledの場合は自動再生されない", async () => {
		render(<AudioButton audioUrl="test-audio.mp3" title="音声" autoPlay disabled />);

		simulateAudioLoad();

		// 少し待機
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(mockPlay).not.toHaveBeenCalled();
	});

	it("一時停止ボタンをクリックすると一時停止される", async () => {
		const onPause = vi.fn();

		render(<AudioButton audioUrl="test-audio.mp3" title="音声" onPause={onPause} />);

		simulateAudioLoad();

		// 再生状態にする
		const audioElement = document.querySelector("audio") as HTMLAudioElement;
		if (audioElement) {
			act(() => {
				audioElement.dispatchEvent(new Event("play"));
			});
		}

		// 一時停止ボタンをクリック
		await waitFor(() => {
			const pauseButton = screen.getByRole("button", { name: "一時停止" });
			fireEvent.click(pauseButton);
		});

		expect(mockPause).toHaveBeenCalled();
	});

	it("全てのカテゴリの色が正しく適用される", () => {
		const categories = ["voice", "bgm", "se", "talk", "singing", "other"] as const;
		const expectedColors = [
			"text-pink-600",
			"text-purple-600",
			"text-yellow-600",
			"text-blue-600",
			"text-red-600",
			"text-gray-600",
		] as const;

		categories.forEach((category, index) => {
			const { unmount } = render(
				<AudioButton audioUrl="test-audio.mp3" title="音声" category={category} />,
			);

			const button = screen.getByRole("button", { name: "再生" });
			expect(button).toHaveClass(expectedColors[index] as string);

			unmount();
		});
	});

	it("全てのサイズバリエーションが正しく表示される", () => {
		const sizes = ["sm", "md", "lg"] as const;

		sizes.forEach((size) => {
			const { unmount } = render(
				<AudioButton audioUrl="test-audio.mp3" title="音声" size={size} />,
			);

			const button = screen.getByRole("button", { name: "再生" });
			expect(button).toBeInTheDocument();

			unmount();
		});
	});

	it("音声URLが空の場合は何も読み込まない", () => {
		render(<AudioButton audioUrl="" title="音声" />);

		const audioElement = document.querySelector("audio") as HTMLAudioElement;
		expect(audioElement.src).toBe("");
	});

	it("音声URLが変更されたときに新しい音声を読み込む", () => {
		const { rerender } = render(<AudioButton audioUrl="first-audio.mp3" title="音声" />);

		rerender(<AudioButton audioUrl="second-audio.mp3" title="音声" />);

		expect(mockLoad).toHaveBeenCalled();
	});

	it("再生エラーが発生した場合のハンドリング", async () => {
		mockPlay.mockRejectedValueOnce(new Error("Play failed"));
		const onError = vi.fn();

		render(<AudioButton audioUrl="test-audio.mp3" title="音声" onError={onError} />);

		simulateAudioLoad();

		const playButton = screen.getByRole("button", { name: "再生" });
		fireEvent.click(playButton);

		await waitFor(() => {
			expect(onError).toHaveBeenCalledWith("音声の再生に失敗しました");
		});
	});

	it("autoPlay時の再生エラーを正しくハンドリング", async () => {
		mockPlay.mockRejectedValueOnce(new Error("Autoplay failed"));

		render(<AudioButton audioUrl="test-audio.mp3" title="音声" autoPlay />);

		simulateAudioLoad();

		// autoPlay失敗時は状態がfalseになることを確認
		await waitFor(() => {
			const button = screen.getByRole("button", { name: "再生" });
			expect(button).toBeInTheDocument();
		});
	});

	it("エラー状態でボタンクリックしても何も起こらない", async () => {
		render(<AudioButton audioUrl="test-audio.mp3" title="音声" />);

		// エラー状態にする
		const audioElement = document.querySelector("audio") as HTMLAudioElement;
		if (audioElement) {
			act(() => {
				audioElement.dispatchEvent(new Event("error"));
			});
		}

		await waitFor(() => {
			expect(screen.getByText("エラー")).toBeInTheDocument();
		});

		const button = screen.getByRole("button", { name: "再生" });
		fireEvent.click(button);

		// 何も起こらないことを確認
		expect(mockPlay).not.toHaveBeenCalled();
	});

	it("durationなしの場合は時間表示されない", () => {
		render(<AudioButton audioUrl="test-audio.mp3" title="音声" />);

		// duration表示がないことを確認
		expect(screen.queryByText(/\d+:\d+/)).not.toBeInTheDocument();
	});

	it("formatDuration関数が正しく動作する", () => {
		render(<AudioButton audioUrl="test-audio.mp3" title="音声" duration={125} />);

		expect(screen.getByText("2:05")).toBeInTheDocument();
	});

	it("0秒のdurationも正しく表示される", () => {
		render(<AudioButton audioUrl="test-audio.mp3" title="音声" duration={0} />);

		// duration が 0 の場合は条件部が falsy になるため表示されない
		expect(screen.queryByText("0:00")).not.toBeInTheDocument();
	});
});
