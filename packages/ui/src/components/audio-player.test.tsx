import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioPlayer } from "./audio-player.js";

// Mock audio element methods
const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockPause = vi.fn();
const mockLoad = vi.fn();

// Mock HTMLAudioElement with all necessary properties
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

Object.defineProperty(HTMLMediaElement.prototype, "duration", {
	writable: true,
	value: 100,
});

Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
	writable: true,
	value: 0,
});

Object.defineProperty(HTMLMediaElement.prototype, "volume", {
	writable: true,
	value: 1,
});

Object.defineProperty(HTMLMediaElement.prototype, "muted", {
	writable: true,
	value: false,
});

Object.defineProperty(HTMLMediaElement.prototype, "readyState", {
	writable: true,
	value: 4, // HAVE_ENOUGH_DATA
});

// Helper function to simulate audio loading
const simulateAudioLoad = () => {
	const audioElement = document.querySelector("audio") as HTMLAudioElement;
	if (audioElement) {
		act(() => {
			audioElement.dispatchEvent(new Event("loadedmetadata"));
		});
	}
};

describe("AudioPlayer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("基本的な音声プレイヤーが表示される", () => {
		render(<AudioPlayer src="test-audio.mp3" title="テスト音声" />);

		expect(screen.getByText("テスト音声")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "再生" })).toBeInTheDocument();
	});

	it("再生ボタンをクリックすると再生される", async () => {
		const onPlay = vi.fn();

		render(
			<AudioPlayer src="test-audio.mp3" title="テスト音声" onPlay={onPlay} />,
		);

		// Simulate the audio element loading
		simulateAudioLoad();

		// Wait for the audio element to be loaded
		await waitFor(() => {
			const playButton = screen.getByRole("button", { name: "再生" });
			expect(playButton).not.toBeDisabled();
		});

		const playButton = screen.getByRole("button", { name: "再生" });
		fireEvent.click(playButton);

		expect(mockPlay).toHaveBeenCalled();
	});

	it("ミュートボタンが動作する", async () => {
		render(<AudioPlayer src="test-audio.mp3" title="テスト音声" />);

		simulateAudioLoad();

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "ミュート" }),
			).toBeInTheDocument();
		});

		const muteButton = screen.getByRole("button", { name: "ミュート" });
		fireEvent.click(muteButton);

		// ミュート状態になることを確認
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "ミュート解除" }),
			).toBeInTheDocument();
		});
	});

	it("コンポーネントが正常にレンダリングされる", () => {
		render(<AudioPlayer src="test-audio.mp3" title="テスト音声" />);

		expect(screen.getByText("テスト音声")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "再生" })).toBeInTheDocument();
	});
});
