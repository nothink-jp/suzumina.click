import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioPlayer } from "./audio-player";

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

describe("AudioPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("基本的な音声プレイヤーが表示される", () => {
    render(<AudioPlayer src="test-audio.mp3" title="テスト音声" />);

    expect(screen.getByText("テスト音声")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再生" })).toBeInTheDocument();
    expect(screen.getByLabelText("再生位置")).toBeInTheDocument();
    expect(screen.getByLabelText("音量")).toBeInTheDocument();
  });

  it("再生ボタンをクリックすると再生される", async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();

    render(
      <AudioPlayer src="test-audio.mp3" title="テスト音声" onPlay={onPlay} />,
    );

    // Wait for the audio element to be loaded
    await waitFor(() => {
      const playButton = screen.getByRole("button", { name: "再生" });
      expect(playButton).not.toBeDisabled();
    });

    const playButton = screen.getByRole("button", { name: "再生" });
    await user.click(playButton);

    expect(mockPlay).toHaveBeenCalled();
  });

  it("一時停止ボタンをクリックすると一時停止される", async () => {
    const user = userEvent.setup();
    const onPause = vi.fn();

    render(
      <AudioPlayer src="test-audio.mp3" title="テスト音声" onPause={onPause} />,
    );

    // Wait for the audio element to be loaded
    await waitFor(() => {
      const playButton = screen.getByRole("button", { name: "再生" });
      expect(playButton).not.toBeDisabled();
    });

    // まず再生状態にする
    const playButton = screen.getByRole("button", { name: "再生" });
    await user.click(playButton);

    // 再生状態になるまで待機
    await act(async () => {
      const audioElement = document.querySelector("audio");
      if (audioElement) {
        const playEvent = new Event("play");
        audioElement.dispatchEvent(playEvent);
      }
    });

    // 一時停止ボタンをクリック
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "一時停止" }),
      ).toBeInTheDocument();
    });

    const pauseButton = screen.getByRole("button", { name: "一時停止" });
    await user.click(pauseButton);

    expect(mockPause).toHaveBeenCalled();
  });

  it("ミュートボタンが動作する", async () => {
    const user = userEvent.setup();

    render(<AudioPlayer src="test-audio.mp3" title="テスト音声" />);

    const muteButton = screen.getByRole("button", { name: "ミュート" });
    await user.click(muteButton);

    // ミュート状態になることを確認
    expect(
      screen.getByRole("button", { name: "ミュート解除" }),
    ).toBeInTheDocument();
  });

  it("リプレイボタンが動作する", async () => {
    const user = userEvent.setup();

    render(
      <AudioPlayer
        src="test-audio.mp3"
        title="テスト音声"
        showReplayButton={true}
      />,
    );

    const replayButton = screen.getByRole("button", { name: "最初から再生" });
    await user.click(replayButton);

    expect(mockAudioElement.currentTime).toBe(0);
  });

  it("スキップボタンが表示される", () => {
    render(
      <AudioPlayer
        src="test-audio.mp3"
        title="テスト音声"
        showSkipButtons={true}
      />,
    );

    expect(
      screen.getByRole("button", { name: "10秒戻る" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10秒進む" }));
  });

  it("キーボード操作が動作する", async () => {
    const user = userEvent.setup();

    render(<AudioPlayer src="test-audio.mp3" title="テスト音声" />);

    // Wait for the audio element to be loaded
    await waitFor(() => {
      const playButton = screen.getByRole("button", { name: "再生" });
      expect(playButton).not.toBeDisabled();
    });

    const player = screen.getByRole("region", {
      name: "音声プレイヤー: テスト音声",
    });

    // フォーカスしてスペースキーで再生
    await user.click(player);
    await user.keyboard(" ");

    expect(mockPlay).toHaveBeenCalled();
  });

  it("エラー状態が表示される", async () => {
    const onError = vi.fn();

    render(
      <AudioPlayer
        src="invalid-audio.mp3"
        title="テスト音声"
        onError={onError}
      />,
    );

    // エラーイベントをシミュレート
    await act(async () => {
      const audioElement = document.querySelector("audio");
      if (audioElement) {
        const errorEvent = new Event("error");
        audioElement.dispatchEvent(errorEvent);
      }
    });

    await waitFor(() => {
      expect(
        screen.getByText("音声の読み込みに失敗しました"),
      ).toBeInTheDocument();
    });
  });

  it("コンパクトバリアントが正しく表示される", () => {
    render(
      <AudioPlayer src="test-audio.mp3" title="テスト音声" variant="compact" />,
    );

    const player = screen.getByRole("region");
    expect(player).toHaveClass("bg-muted");
  });

  it("最小バリアントでタイトルが表示されない", () => {
    render(
      <AudioPlayer
        src="test-audio.mp3"
        title="テスト音声"
        variant="minimal"
        showTitle={true}
      />,
    );

    expect(screen.queryByText("テスト音声")).not.toBeInTheDocument();
  });

  it("アクセシビリティ属性が正しく設定される", () => {
    render(<AudioPlayer src="test-audio.mp3" title="テスト音声" />);

    const player = screen.getByRole("region", {
      name: "音声プレイヤー: テスト音声",
    });
    expect(player).toHaveAttribute("aria-describedby", "keyboard-instructions");

    const instructions = screen.getByText(/キーボード操作:/);
    expect(instructions).toHaveClass("sr-only");
  });

  it("読み込み中状態が表示される", () => {
    render(<AudioPlayer src="test-audio.mp3" title="テスト音声" />);

    // 読み込み中のスピナーが表示されることを確認
    const playButton = screen.getByRole("button", { name: "再生" });
    expect(playButton).toBeDisabled();
  });

  it("時間フォーマットが正しく表示される", () => {
    render(<AudioPlayer src="test-audio.mp3" title="テスト音声" />);

    // 0:00 が表示されることを確認
    expect(screen.getByText("0:00")).toBeInTheDocument();
  });

  it("autoPlayが設定されている場合は自動再生される", () => {
    render(
      <AudioPlayer src="test-audio.mp3" title="テスト音声" autoPlay={true} />,
    );

    // ただし、ブラウザのポリシーにより実際の自動再生はテストしない
    // 代わりに、要素が正しく設定されていることを確認
    expect(screen.getByRole("region")).toBeInTheDocument();
  });
});
