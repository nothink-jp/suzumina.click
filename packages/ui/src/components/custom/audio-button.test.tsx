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
});
