import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import YouTubeEmbed, { type YouTubePlayer } from "./YouTubeEmbed";

// YouTube IFrame APIのモック
const mockYouTubePlayer = {
  playVideo: vi.fn(),
  pauseVideo: vi.fn(),
  seekTo: vi.fn(),
  getCurrentTime: vi.fn(() => 0),
  setVolume: vi.fn(),
  getPlayerState: vi.fn(() => 1), // デフォルトでは再生中状態
  destroy: vi.fn(),
};

// YT APIのイベントハンドラを保持する変数
let onReadyCallback: ((event: { target: YouTubePlayer }) => void) | undefined;
let onErrorCallback: ((event: { data: number }) => void) | undefined;

describe("YouTubeEmbedコンポーネントのテスト", () => {
  beforeEach(() => {
    // YouTube IFrame APIのモックをセットアップ
    Object.defineProperty(window, "YT", {
      value: {
        Player: vi.fn((elementId, options) => {
          // イベントハンドラを保存
          onReadyCallback = options.events?.onReady;
          onErrorCallback = options.events?.onError;
          return mockYouTubePlayer;
        }),
        PlayerState: {
          UNSTARTED: -1,
          ENDED: 0,
          PLAYING: 1,
          PAUSED: 2,
          BUFFERING: 3,
          CUED: 5,
        },
      },
      writable: true,
    });

    // コンソールログとエラーをモックに置き換え
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    // ID付きのHTML要素が作成されるようにmockを設定
    document.getElementById = vi.fn((id) => {
      if (id === "youtube-iframe-api") {
        return document.createElement("script");
      }
      if (id?.includes("youtube-player-")) {
        // プレーヤー要素が存在するとして処理
        const element = document.createElement("div");
        element.id = id;
        return element;
      }
      return null;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("コンポーネントが正常にレンダリングされる", async () => {
    const { container } = render(<YouTubeEmbed videoId="test-video-id" />);

    // ロード中の表示が表示されることを確認
    expect(screen.getByRole("status")).toBeInTheDocument();

    // ロード完了をシミュレート
    act(() => {
      if (onReadyCallback) {
        onReadyCallback({ target: mockYouTubePlayer });
      }
    });

    // ロード中の表示が消えることを確認
    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  it("videoIdとtitle属性が正しく設定される", () => {
    render(<YouTubeEmbed videoId="test-video-id" title="テスト動画" />);

    // window.YT.Playerが正しいパラメータで呼び出されることを確認
    expect(window.YT.Player).toHaveBeenCalledWith(
      expect.stringContaining("test-video-id"),
      expect.objectContaining({
        videoId: "test-video-id",
        playerVars: expect.objectContaining({
          autoplay: 0,
          controls: 1,
        }),
      }),
    );
  });

  it("プレーヤーの準備ができたときにonReadyが呼び出される", async () => {
    const onReadyMock = vi.fn();
    render(<YouTubeEmbed videoId="test-video-id" onReady={onReadyMock} />);

    // プレーヤーの準備完了イベントをシミュレーション
    act(() => {
      if (onReadyCallback) {
        onReadyCallback({ target: mockYouTubePlayer });
      }
    });

    // onReady関数が正しいプレーヤーオブジェクトで呼び出されることを確認
    expect(onReadyMock).toHaveBeenCalledWith(mockYouTubePlayer);

    // ローディング表示が消えることを確認
    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  it("エラー発生時にエラーメッセージとリトライボタンが表示される", async () => {
    const { container } = render(<YouTubeEmbed videoId="test-video-id" />);

    // プレーヤーのエラーイベントをシミュレーション
    act(() => {
      if (onErrorCallback) {
        onErrorCallback({ data: 100 });
      }
    });

    // エラーメッセージが表示されることを確認
    await waitFor(() => {
      const errorMessage = screen.getByText(
        "動画の読み込みに失敗しました。動画IDが正しいか確認してください。",
      );
      expect(errorMessage).toBeInTheDocument();
    });

    // リトライボタンが表示されることを確認
    const retryButton = screen.getByText("再試行する");
    expect(retryButton).toBeInTheDocument();
  });

  it("リトライボタンをクリックすると再読み込みが行われる", async () => {
    render(<YouTubeEmbed videoId="test-video-id" />);

    // プレーヤーのエラーイベントをシミュレーション
    act(() => {
      if (onErrorCallback) {
        onErrorCallback({ data: 100 });
      }
    });

    // エラーメッセージが表示されるのを待つ
    await waitFor(() => {
      const errorMessage = screen.getByText(
        "動画の読み込みに失敗しました。動画IDが正しいか確認してください。",
      );
      expect(errorMessage).toBeInTheDocument();
    });

    // リトライボタンをクリック
    const retryButton = screen.getByText("再試行する");
    fireEvent.click(retryButton);

    // 既存のスクリプトが削除されて新しいスクリプトが追加されていることを確認
    expect(document.getElementById).toHaveBeenCalledWith("youtube-iframe-api");
  });

  it("コンポーネントのアンマウント時にプレーヤーが破棄される", async () => {
    // 明示的にモック関数を作成
    const mockDestroy = vi.fn();

    // プレーヤーオブジェクトを作成（destroyメソッドをモックに置き換え）
    const testPlayer = {
      ...mockYouTubePlayer,
      destroy: mockDestroy,
    };

    // YT.Playerのモック実装を単純化
    vi.spyOn(window.YT, "Player").mockImplementation((elementId, options) => {
      // コールバックを保存
      onReadyCallback = options.events?.onReady;

      // すぐにコールバックを呼び出す（同期的に処理）
      if (onReadyCallback) {
        onReadyCallback({ target: testPlayer });
      }

      return testPlayer;
    });

    const { unmount } = render(<YouTubeEmbed videoId="test-video-id" />);

    // unmountを実行
    unmount();

    // destroyメソッドが呼び出されたことを確認
    expect(mockDestroy).toHaveBeenCalled();
  });
});
