import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioClip } from "../../lib/audioclips/types";
import type { YouTubePlayer } from "../videos/YouTubeEmbed";
import AudioClipPlayer from "./AudioClipPlayer";

// モックのYouTubeプレーヤー参照
const createMockYouTubePlayerRef = () => {
  const mockPlayer = {
    seekTo: vi.fn(),
    playVideo: vi.fn(),
    pauseVideo: vi.fn(),
    getCurrentTime: vi.fn(),
    setVolume: vi.fn(),
  } as unknown as YouTubePlayer;

  return {
    current: mockPlayer,
  } as React.RefObject<YouTubePlayer>;
};

// テスト用のクリップデータ
const mockClip: AudioClip = {
  id: "test-clip-1",
  videoId: "video-123",
  title: "テスト音声クリップ",
  startTime: 30,
  endTime: 60,
  userId: "user-123",
  isPublic: true,
  playCount: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("AudioClipPlayerコンポーネント", () => {
  // setIntervalのモック
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("クリップが指定されていない場合は何も表示されない", () => {
    const { container } = render(
      <AudioClipPlayer clip={null} onClose={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("クリップのタイトルとフレーズが表示される", () => {
    const clipWithPhrase = {
      ...mockClip,
      phrase: "テストフレーズ",
    };

    render(<AudioClipPlayer clip={clipWithPhrase} onClose={() => {}} />);

    expect(screen.getByText("テスト音声クリップ")).toBeInTheDocument();
    expect(screen.getByText("テストフレーズ")).toBeInTheDocument();
  });

  it("フレーズがない場合はデフォルトテキスト「音声クリップ」が表示される", () => {
    render(<AudioClipPlayer clip={mockClip} onClose={() => {}} />);

    expect(screen.getByText("音声クリップ")).toBeInTheDocument();
  });

  it("再生ボタンをクリックすると再生状態が切り替わる", () => {
    const mockYouTubePlayerRef = createMockYouTubePlayerRef();

    render(
      <AudioClipPlayer
        clip={mockClip}
        onClose={() => {}}
        youtubePlayerRef={mockYouTubePlayerRef}
      />,
    );

    // 初期状態ではボタンが存在することを確認
    const playPauseButton = screen.getByRole("button", {
      name: /一時停止|再生/i,
    });
    expect(playPauseButton).toBeInTheDocument();

    // ボタンをクリックして再生/一時停止を切り替える
    fireEvent.click(playPauseButton);

    // モックの関数が呼ばれたことを確認
    expect(mockYouTubePlayerRef.current.seekTo).toHaveBeenCalledWith(
      mockClip.startTime,
      true,
    );
    expect(mockYouTubePlayerRef.current.playVideo).toHaveBeenCalled();

    // もう一度クリックして一時停止
    const updatedButton = screen.getByRole("button", {
      name: /一時停止|再生/i,
    });
    fireEvent.click(updatedButton);

    // 一時停止関数が呼ばれた
    expect(mockYouTubePlayerRef.current.pauseVideo).toHaveBeenCalled();
  });

  it("音量スライダーを操作すると音量が変更される", () => {
    const mockYouTubePlayerRef = createMockYouTubePlayerRef();

    render(
      <AudioClipPlayer
        clip={mockClip}
        onClose={() => {}}
        youtubePlayerRef={mockYouTubePlayerRef}
      />,
    );

    // 音量スライダーを操作
    // すべてのスライダーを取得して音量スライダーを特定
    const sliders = screen.getAllByRole("slider");
    // 音量スライダーは0-100の範囲を持つ
    const volumeSlider = sliders.find(
      (slider) => (slider as HTMLInputElement).max === "100",
    );

    expect(volumeSlider).toBeDefined();

    if (volumeSlider) {
      fireEvent.change(volumeSlider, { target: { value: "50" } });
      expect(mockYouTubePlayerRef.current.setVolume).toHaveBeenCalledWith(50);
    }
  });

  it("シークバーを操作すると再生位置が変更される", () => {
    const mockYouTubePlayerRef = createMockYouTubePlayerRef();

    render(
      <AudioClipPlayer
        clip={mockClip}
        onClose={() => {}}
        youtubePlayerRef={mockYouTubePlayerRef}
      />,
    );

    // 再生位置スライダーを探す
    const inputs = screen.getAllByRole("slider");
    const seekbar = inputs.find(
      (input) =>
        (input as HTMLInputElement).max ===
        (mockClip.endTime - mockClip.startTime).toString(),
    );

    expect(seekbar).toBeDefined();

    if (seekbar) {
      // シーク位置を10秒に変更
      fireEvent.change(seekbar, { target: { value: "10" } });

      // YouTubeプレイヤーでは絶対時間（クリップの開始時間 + シーク位置）になっていることを確認
      expect(mockYouTubePlayerRef.current.seekTo).toHaveBeenCalledWith(
        mockClip.startTime + 10,
        true,
      );
    }
  });

  it("閉じるボタンをクリックするとonClose関数が呼ばれる", () => {
    const handleClose = vi.fn();

    render(<AudioClipPlayer clip={mockClip} onClose={handleClose} />);

    // 閉じるボタンをクリック
    const closeButton = screen.getByLabelText("プレーヤーを閉じる");
    fireEvent.click(closeButton);

    // onClose関数が呼ばれたことを確認
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("クリップの再生時間が正しくフォーマットされる", () => {
    const longClip: AudioClip = {
      ...mockClip,
      startTime: 60,
      endTime: 180, // 2分間のクリップ
    };

    render(<AudioClipPlayer clip={longClip} onClose={() => {}} />);

    // フォーマットされた再生時間が表示されていることを確認
    expect(screen.getByText("0:00 / 2:00")).toBeInTheDocument();
  });

  it("再生中のタイマーが正しく動作し、現在の再生時間が更新される", async () => {
    const mockYouTubePlayerRef = createMockYouTubePlayerRef();

    // getCurrentTimeの戻り値をモック
    let currentTime = mockClip.startTime;
    mockYouTubePlayerRef.current.getCurrentTime = vi
      .fn()
      .mockImplementation(() => {
        return currentTime;
      });

    // コンポーネントをレンダリング
    render(
      <AudioClipPlayer
        clip={mockClip}
        onClose={() => {}}
        youtubePlayerRef={mockYouTubePlayerRef}
        initialIsPlaying={true} // 最初から再生中状態にする
      />,
    );

    // 初期値の確認（時間表示部分を取得）
    const timeDisplay = screen.getByText(/0:00.*0:30/);
    expect(timeDisplay).toBeInTheDocument();

    // 5秒経過させる
    currentTime = mockClip.startTime + 5;

    // タイマー更新をシミュレート
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // DOMを検査するために関数を使用
    const getFormattedTime = () => {
      const timeElement = screen.getByText(/.*\/.*/);
      return timeElement.textContent;
    };

    // 時間表示が更新されているか確認
    expect(getFormattedTime()).toMatch(/0:05.*0:30/);

    // さらに5秒経過（10秒経過）
    currentTime = mockClip.startTime + 10;

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // 時間表示が10秒に更新されているか確認
    expect(getFormattedTime()).toMatch(/0:10.*0:30/);

    // 終了時間に到達
    currentTime = mockClip.endTime;

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // 一時停止メソッドが呼ばれたことを確認
    expect(mockYouTubePlayerRef.current.pauseVideo).toHaveBeenCalled();
  });
});
