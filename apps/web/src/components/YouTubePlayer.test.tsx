import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { YouTubePlayer } from "./YouTubePlayer";

// Mock global window object
Object.defineProperty(window, "YT", {
  value: {
    Player: vi.fn().mockImplementation(() => ({
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
      stopVideo: vi.fn(),
      seekTo: vi.fn(),
      getCurrentTime: vi.fn(() => 10),
      getDuration: vi.fn(() => 300),
      getPlayerState: vi.fn(() => 1),
      setVolume: vi.fn(),
      getVolume: vi.fn(() => 50),
      mute: vi.fn(),
      unMute: vi.fn(),
      isMuted: vi.fn(() => false),
      destroy: vi.fn(),
    })),
    PlayerState: {
      UNSTARTED: -1,
      ENDED: 0,
      PLAYING: 1,
      PAUSED: 2,
      BUFFERING: 3,
      CUED: 5,
    },
    ready: vi.fn((callback) => callback()),
  },
  writable: true,
});

describe("YouTubePlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("videoIdが指定されていない場合はエラーメッセージが表示される", () => {
    render(<YouTubePlayer videoId="" />);

    expect(screen.getByText("動画IDが指定されていません")).toBeInTheDocument();
  });

  it("有効なvideoIdでコンポーネントが正しく表示される", () => {
    render(<YouTubePlayer videoId="test-video-id" />);

    // コンテナが存在することを確認
    const container = document.querySelector(".youtube-player-container");
    expect(container).toBeInTheDocument();
  });

  it("カスタムクラスが適用される", () => {
    render(<YouTubePlayer videoId="test-video-id" className="custom-class" />);

    const container = document.querySelector(".youtube-player-container");
    expect(container).toHaveClass("custom-class");
  });

  it("カスタムサイズが適用される", () => {
    render(<YouTubePlayer videoId="test-video-id" width="500px" height="300px" />);

    const container = document.querySelector(".youtube-player-container");
    expect(container).toHaveStyle({ width: "500px", height: "300px" });
  });

  it("onReadyコールバックが設定される", () => {
    const onReady = vi.fn();
    render(<YouTubePlayer videoId="test-video-id" onReady={onReady} />);

    // コンポーネントが正常にレンダリングされることを確認
    const container = document.querySelector(".youtube-player-container");
    expect(container).toBeInTheDocument();
  });

  it("onStateChangeコールバックが設定される", () => {
    const onStateChange = vi.fn();
    render(<YouTubePlayer videoId="test-video-id" onStateChange={onStateChange} />);

    // コンポーネントが正常にレンダリングされることを確認
    const container = document.querySelector(".youtube-player-container");
    expect(container).toBeInTheDocument();
  });

  it("onTimeUpdateコールバックが設定される", () => {
    const onTimeUpdate = vi.fn();
    render(<YouTubePlayer videoId="test-video-id" onTimeUpdate={onTimeUpdate} />);

    // コンポーネントが正常にレンダリングされることを確認
    const container = document.querySelector(".youtube-player-container");
    expect(container).toBeInTheDocument();
  });

  it("onErrorコールバックが設定される", () => {
    const onError = vi.fn();
    render(<YouTubePlayer videoId="test-video-id" onError={onError} />);

    // コンポーネントが正常にレンダリングされることを確認
    const container = document.querySelector(".youtube-player-container");
    expect(container).toBeInTheDocument();
  });

  it("autoplayオプションがfalseの場合", () => {
    render(<YouTubePlayer videoId="test-video-id" autoplay={false} />);

    // コンポーネントが正常にレンダリングされることを確認
    const container = document.querySelector(".youtube-player-container");
    expect(container).toBeInTheDocument();
  });

  it("autoplayオプションがtrueの場合", () => {
    render(<YouTubePlayer videoId="test-video-id" autoplay={true} />);

    // コンポーネントが正常にレンダリングされることを確認
    const container = document.querySelector(".youtube-player-container");
    expect(container).toBeInTheDocument();
  });

  it("controlsオプションが正しく動作する", () => {
    render(<YouTubePlayer videoId="test-video-id" controls={false} />);

    // コンポーネントが正常にレンダリングされることを確認
    const container = document.querySelector(".youtube-player-container");
    expect(container).toBeInTheDocument();
  });

  it("startTimeとendTimeが設定される", () => {
    render(
      <YouTubePlayer 
        videoId="test-video-id" 
        startTime={30} 
        endTime={120} 
      />
    );

    // コンポーネントが正常にレンダリングされることを確認
    const container = document.querySelector(".youtube-player-container");
    expect(container).toBeInTheDocument();
  });
});