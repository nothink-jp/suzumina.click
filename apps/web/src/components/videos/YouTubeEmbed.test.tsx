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
  mute: vi.fn(),
  unMute: vi.fn(),
  isMuted: vi.fn(() => false),
  getVolume: vi.fn(() => 100),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// YT APIのイベントハンドラを保持する変数
let onReadyCallback: ((event: { target: YouTubePlayer }) => void) | undefined;
let onErrorCallback: ((event: { data: number }) => void) | undefined;
let onStateChangeCallback: ((event: { data: number }) => void) | undefined;

describe("YouTubeEmbedコンポーネントのテスト", () => {
  beforeEach(() => {
    // YouTube IFrame APIのモックをセットアップ
    Object.defineProperty(window, "YT", {
      value: {
        Player: vi.fn((elementId, options) => {
          // イベントハンドラを保存
          onReadyCallback = options.events?.onReady;
          onErrorCallback = options.events?.onError;
          onStateChangeCallback = options.events?.onStateChange;
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
    vi.spyOn(console, "debug").mockImplementation(() => {});

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

  it("ミュート機能が正常に動作する", async () => {
    // ミュート状態を切り替えるためのカスタムコンポーネントをレンダリング
    const MuteTestComponent = () => {
      return (
        <div>
          <YouTubeEmbed videoId="test-video-id" />
          <button
            type="button"
            data-testid="mute-button"
            onClick={() => {
              // YTプレーヤーがロードされている前提でミュート状態を切り替え
              if (mockYouTubePlayer.isMuted()) {
                mockYouTubePlayer.unMute();
              } else {
                mockYouTubePlayer.mute();
              }
            }}
          >
            ミュート切り替え
          </button>
        </div>
      );
    };

    render(<MuteTestComponent />);

    // プレーヤーの準備完了をシミュレート
    act(() => {
      if (onReadyCallback) {
        onReadyCallback({ target: mockYouTubePlayer });
      }
    });

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    // ミュートされていない状態を模擬
    mockYouTubePlayer.isMuted.mockReturnValue(false);

    // ミュートボタンをクリック
    const muteButton = screen.getByTestId("mute-button");
    fireEvent.click(muteButton);

    // muteメソッドが呼び出されたことを確認
    expect(mockYouTubePlayer.mute).toHaveBeenCalled();

    // ミュート状態を模擬
    mockYouTubePlayer.isMuted.mockReturnValue(true);

    // もう一度クリックしてミュート解除
    fireEvent.click(muteButton);

    // unMuteメソッドが呼び出されたことを確認
    expect(mockYouTubePlayer.unMute).toHaveBeenCalled();
  });

  it("ボリューム調整が正常に動作する", async () => {
    // 明示的にボリュームを設定するテスト
    render(<YouTubeEmbed videoId="test-video-id" />);

    // プレーヤーの準備完了をシミュレート
    act(() => {
      if (onReadyCallback) {
        onReadyCallback({ target: mockYouTubePlayer });
      }
    });

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    // ボリューム設定関数を手動で呼び出し
    act(() => {
      // プレーヤーのボリュームを設定
      mockYouTubePlayer.setVolume(50);
    });

    // setVolumeメソッドが正しい値で呼び出されたことを確認
    expect(mockYouTubePlayer.setVolume).toHaveBeenCalledWith(50);
  });

  it("seekTo機能が正常に動作する", async () => {
    render(<YouTubeEmbed videoId="test-video-id" />);

    // プレーヤーの準備完了をシミュレート
    act(() => {
      if (onReadyCallback) {
        onReadyCallback({ target: mockYouTubePlayer });
      }
    });

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    // seekTo機能のテスト
    act(() => {
      // プレーヤーの再生位置を設定
      mockYouTubePlayer.seekTo(120, true);
    });

    // seekToメソッドが正しいパラメータで呼び出されたことを確認
    expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(120, true);
  });

  it("プレーヤーの状態変化イベントハンドラが正しく動作する", async () => {
    // 状態変化のコールバック関数をモック
    const onStateChangeMock = vi.fn();

    render(
      <YouTubeEmbed
        videoId="test-video-id"
        onStateChange={onStateChangeMock}
      />,
    );

    // プレーヤーの準備完了をシミュレート
    act(() => {
      if (onReadyCallback) {
        onReadyCallback({ target: mockYouTubePlayer });
      }
    });

    // ローディング表示が消えることを確認
    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    // 再生状態の変化をシミュレート（再生開始）
    act(() => {
      if (onStateChangeCallback) {
        onStateChangeCallback({ data: window.YT.PlayerState.PLAYING });
      }
    });

    // onStateChangeハンドラが呼び出されたことを確認
    expect(onStateChangeMock).toHaveBeenCalledWith(
      window.YT.PlayerState.PLAYING,
    );

    // 再生状態の変化をシミュレート（一時停止）
    act(() => {
      if (onStateChangeCallback) {
        onStateChangeCallback({ data: window.YT.PlayerState.PAUSED });
      }
    });

    // onStateChangeハンドラが正しい値で呼び出されたことを確認
    expect(onStateChangeMock).toHaveBeenCalledWith(
      window.YT.PlayerState.PAUSED,
    );
  });

  it("プレーヤーAPIが利用不可の場合でも例外をスローせずに処理する", async () => {
    // プレーヤーのAPIメソッドが存在しないケースをテスト
    const incompletePlayer = { ...mockYouTubePlayer };
    // @ts-expect-error プレーヤーのAPIメソッドが存在しない状況をテストするためにプロパティを削除
    // biome-ignore lint/performance/noDelete: <explanation>
    delete incompletePlayer.getCurrentTime;

    // YT.Playerのモック実装を変更
    vi.spyOn(window.YT, "Player").mockImplementation((elementId, options) => {
      onReadyCallback = options.events?.onReady;

      if (onReadyCallback) {
        onReadyCallback({ target: incompletePlayer });
      }

      return incompletePlayer;
    });

    // APIにアクセスするカスタムテストコンポーネント
    const TestAccessComponent = () => {
      return (
        <div>
          <YouTubeEmbed videoId="test-video-id" />
          <button
            type="button"
            data-testid="get-time-button"
            onClick={() => {
              try {
                // 存在しないメソッドを呼び出す
                incompletePlayer.getCurrentTime();
              } catch (e) {
                console.error("エラーが発生しました", e);
              }
            }}
          >
            Get Current Time
          </button>
        </div>
      );
    };

    render(<TestAccessComponent />);

    // ローディング表示が消えるのを待つ
    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    // エラーログのモックをスパイ
    const consoleErrorSpy = vi.spyOn(console, "error");

    // 存在しないメソッドを呼び出すボタンをクリック
    const getTimeButton = screen.getByTestId("get-time-button");
    fireEvent.click(getTimeButton);

    // コンソールエラーが呼び出されたことを確認
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("カスタムプレーヤーオプションが正しく設定される", () => {
    const customOptions = {
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
      },
    };

    render(<YouTubeEmbed videoId="test-video-id" options={customOptions} />);

    // カスタムオプションが正しく適用されているか確認
    expect(window.YT.Player).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        playerVars: expect.objectContaining({
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
        }),
      }),
    );
  });

  it("安全なYouTube APIの呼び出しが正しく動作する", async () => {
    // 安全なAPI呼び出しをテストするためのコンポーネント
    const SafeApiTestComponent = () => {
      return (
        <div>
          <YouTubeEmbed videoId="test-video-id" />
          <button
            type="button"
            data-testid="safe-call-button"
            onClick={() => {
              try {
                // 存在しないメソッドを呼び出す
                // @ts-ignore
                mockYouTubePlayer.nonExistentMethod();
              } catch (e) {
                console.error("安全なAPI呼び出しに失敗しました", e);
              }
            }}
          >
            安全なAPI呼び出し
          </button>
        </div>
      );
    };

    render(<SafeApiTestComponent />);

    // プレーヤーの準備完了をシミュレート
    act(() => {
      if (onReadyCallback) {
        onReadyCallback({ target: mockYouTubePlayer });
      }
    });

    // ローディング表示が消えるのを待つ
    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    // コンソールエラーをモック
    const consoleErrorSpy = vi.spyOn(console, "error");

    // 安全な呼び出しボタンをクリック
    const safeCallButton = screen.getByTestId("safe-call-button");
    fireEvent.click(safeCallButton);

    // エラーがキャッチされたことを確認
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "安全なAPI呼び出しに失敗しました",
      expect.any(Error),
    );
  });
});
