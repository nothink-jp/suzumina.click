import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";
import * as favoriteActions from "../../app/actions/audioclipFavorites";
import * as audioClipsActions from "../../app/actions/audioclips";
import { useAuth } from "../../lib/firebase/AuthProvider";
import AudioClipList from "./AudioClipList";

// モックの設定
vi.mock("../../app/actions/audioclips", () => ({
  getAudioClips: vi.fn(),
}));

vi.mock("../../app/actions/audioclipFavorites", () => ({
  checkFavoriteStatus: vi.fn(),
  setFavoriteStatus: vi.fn(),
}));

vi.mock("../../lib/firebase/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

// AudioClipButtonとAudioClipPlayerコンポーネントをモック
vi.mock("./AudioClipButton", () => ({
  default: vi.fn(({ clip, onPlay, isFavorite, onFavoriteChange }) => (
    <div data-testid={`audio-clip-${clip.id}`} className="audio-clip-button">
      <span>{clip.title}</span>
      <button
        type="button"
        onClick={() => onPlay(clip)}
        data-testid={`play-button-${clip.id}`}
      >
        再生
      </button>
      <button
        type="button"
        onClick={() => onFavoriteChange(!isFavorite)}
        data-testid={`favorite-button-${clip.id}`}
      >
        {isFavorite ? "お気に入り済み" : "お気に入り登録"}
      </button>
    </div>
  )),
}));

vi.mock("./AudioClipPlayer", () => ({
  default: vi.fn(({ clip, onClose }) =>
    clip ? (
      <div data-testid="audio-clip-player">
        {clip.title}を再生中
        <button
          type="button"
          onClick={onClose}
          data-testid="close-player-button"
        >
          閉じる
        </button>
      </div>
    ) : null,
  ),
}));

describe("AudioClipListコンポーネント", () => {
  // モックのクリップデータ
  const mockClips = [
    {
      id: "clip-1",
      videoId: "video-123",
      title: "テストクリップ1",
      phrase: "テストフレーズ1",
      startTime: 30,
      endTime: 60,
      createdAt: new Date("2025-04-01").toISOString(),
      userId: "user-1",
      userName: "テストユーザー1",
      isPublic: true,
      tags: ["タグ1", "タグ2"],
      playCount: 100,
      favoriteCount: 50,
    },
    {
      id: "clip-2",
      videoId: "video-123",
      title: "テストクリップ2",
      phrase: "テストフレーズ2",
      startTime: 90,
      endTime: 120,
      createdAt: new Date("2025-03-30").toISOString(),
      userId: "user-2",
      userName: "テストユーザー2",
      isPublic: true,
      tags: ["タグ3"],
      playCount: 200,
      favoriteCount: 80,
    },
  ];

  // プロップスのデフォルト値
  const defaultProps = {
    videoId: "video-123",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // ログイン状態のデフォルト設定
    (useAuth as Mock).mockReturnValue({
      user: {
        uid: "test-user",
        displayName: "テストユーザー",
      },
    });

    // getAudioClipsのモック設定
    (audioClipsActions.getAudioClips as Mock).mockResolvedValue({
      clips: mockClips,
      hasMore: false,
      lastClip: mockClips[mockClips.length - 1],
    });

    // checkFavoriteStatusのモック設定
    (favoriteActions.checkFavoriteStatus as Mock).mockImplementation(
      (clipId) => {
        return Promise.resolve({
          isFavorite: clipId === "clip-1", // clip-1のみお気に入り登録済みとする
        });
      },
    );
  });

  // 基本的なレンダリングテスト
  it("クリップ一覧が正しくレンダリングされること", async () => {
    // コンポーネントをレンダリング
    render(<AudioClipList {...defaultProps} />);

    // データ取得が完了するのを待機
    await waitFor(() => {
      expect(audioClipsActions.getAudioClips).toHaveBeenCalledWith({
        videoId: "video-123",
        limit: 10,
        startAfter: null,
      });
    });

    // クリップ表示を確認
    await waitFor(() => {
      expect(screen.getByText("テストクリップ1")).toBeInTheDocument();
      expect(screen.getByText("テストクリップ2")).toBeInTheDocument();
    });
  });

  // クリップ再生機能テスト
  it("クリップの再生ボタンをクリックするとプレーヤーが表示されること", async () => {
    // コンポーネントをレンダリング
    render(<AudioClipList {...defaultProps} />);

    // データ取得完了を待機
    await waitFor(() => {
      expect(screen.getByText("テストクリップ1")).toBeInTheDocument();
    });

    // 最初のクリップの再生ボタンをクリック
    fireEvent.click(screen.getByTestId("play-button-clip-1"));

    // プレーヤーが表示されることを確認
    await waitFor(() => {
      expect(screen.getByTestId("audio-clip-player")).toBeInTheDocument();
      expect(screen.getByText("テストクリップ1を再生中")).toBeInTheDocument();
    });

    // プレーヤーを閉じる
    fireEvent.click(screen.getByTestId("close-player-button"));

    // プレーヤーが閉じることを確認
    await waitFor(() => {
      expect(screen.queryByTestId("audio-clip-player")).not.toBeInTheDocument();
    });
  });

  // エラー表示テスト
  it("クリップ取得でエラーが発生した場合にエラーメッセージが表示されること", async () => {
    // エラーを返すようにモックを設定
    (audioClipsActions.getAudioClips as Mock).mockRejectedValue(
      new Error("データ取得エラー"),
    );

    // コンポーネントをレンダリング
    render(<AudioClipList {...defaultProps} />);

    // エラーメッセージが表示されることを確認
    await waitFor(() => {
      expect(
        screen.getByText("音声クリップの取得に失敗しました"),
      ).toBeInTheDocument();
    });
  });

  // データ空の場合のテスト
  it("クリップが存在しない場合に適切なメッセージが表示されること", async () => {
    // 空の配列を返すようにモックを設定
    (audioClipsActions.getAudioClips as Mock).mockResolvedValue({
      clips: [],
      hasMore: false,
      lastClip: null,
    });

    // コンポーネントをレンダリング
    render(<AudioClipList {...defaultProps} />);

    // メッセージが表示されることを確認
    await waitFor(() => {
      expect(
        screen.getByText("この動画の音声クリップはまだありません"),
      ).toBeInTheDocument();
    });
  });

  // もっと見る機能テスト
  it("「もっと見る」ボタンをクリックすると追加のクリップが読み込まれること", async () => {
    // 最初のレスポンスでhasMoreをtrueに設定
    (audioClipsActions.getAudioClips as Mock)
      .mockResolvedValueOnce({
        clips: mockClips.slice(0, 1), // 最初は1件目のみ
        hasMore: true,
        lastClip: mockClips[0],
      })
      .mockResolvedValueOnce({
        clips: mockClips.slice(1), // 2回目は2件目
        hasMore: false,
        lastClip: mockClips[1],
      });

    // コンポーネントをレンダリング
    render(<AudioClipList {...defaultProps} />);

    // 1件目のデータ取得完了を待機
    await waitFor(() => {
      expect(screen.getByText("テストクリップ1")).toBeInTheDocument();
      expect(screen.queryByText("テストクリップ2")).not.toBeInTheDocument();
    });

    // 「もっと見る」ボタンが表示されることを確認
    const loadMoreButton = screen.getByText("もっと見る");
    expect(loadMoreButton).toBeInTheDocument();

    // 「もっと見る」ボタンをクリック
    fireEvent.click(loadMoreButton);

    // 2回目のデータ取得完了後、両方のクリップが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText("テストクリップ1")).toBeInTheDocument();
      expect(screen.getByText("テストクリップ2")).toBeInTheDocument();
    });

    // 両方のクリップが取得されたので「もっと見る」ボタンは表示されないはず
    expect(screen.queryByText("もっと見る")).not.toBeInTheDocument();
  });

  // お気に入り状態変更テスト
  it("お気に入りボタンをクリックするとお気に入り状態が切り替わること", async () => {
    // お気に入り切り替え関数のモック設定
    (favoriteActions.setFavoriteStatus as Mock).mockResolvedValue({
      success: true,
      isFavorite: true,
    });

    // コンポーネントをレンダリング
    render(<AudioClipList {...defaultProps} />);

    // データ取得完了を待機
    await waitFor(() => {
      expect(screen.getByText("テストクリップ1")).toBeInTheDocument();
      expect(screen.getByText("テストクリップ2")).toBeInTheDocument();
    });

    // お気に入り状態の初期値を確認
    await waitFor(() => {
      expect(screen.getByTestId("favorite-button-clip-1")).toHaveTextContent(
        "お気に入り済み",
      );
      expect(screen.getByTestId("favorite-button-clip-2")).toHaveTextContent(
        "お気に入り登録",
      );
    });

    // 2つ目のクリップのお気に入りボタンをクリック
    fireEvent.click(screen.getByTestId("favorite-button-clip-2"));

    // お気に入り状態が変更されることを確認
    await waitFor(() => {
      expect(screen.getByTestId("favorite-button-clip-2")).toHaveTextContent(
        "お気に入り済み",
      );
    });
  });

  // 未ログイン状態のテスト
  it("未ログイン状態でもクリップ一覧が表示されること", async () => {
    // 未ログイン状態に設定
    (useAuth as Mock).mockReturnValue({
      user: null,
    });

    // コンポーネントをレンダリング
    render(<AudioClipList {...defaultProps} />);

    // データ取得完了を待機し、クリップが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText("テストクリップ1")).toBeInTheDocument();
      expect(screen.getByText("テストクリップ2")).toBeInTheDocument();
    });

    // お気に入りチェックは実行されないはず
    expect(favoriteActions.checkFavoriteStatus).not.toHaveBeenCalled();
  });

  // 読み込み中の表示テスト
  it("「もっと見る」ボタンをクリック中は読み込み中表示になること", async () => {
    // 非同期処理を制御するためのPromiseを作成
    let resolvePromise: (value: unknown) => void;
    const loadingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    // 最初のレスポンスでhasMoreをtrueに設定
    (audioClipsActions.getAudioClips as Mock)
      .mockResolvedValueOnce({
        clips: mockClips.slice(0, 1), // 最初は1件目のみ
        hasMore: true,
        lastClip: mockClips[0],
      })
      .mockImplementationOnce(() => {
        // 2回目の呼び出しでは、明示的に待機させる
        return loadingPromise.then(() => ({
          clips: mockClips.slice(1),
          hasMore: false,
          lastClip: mockClips[1],
        }));
      });

    // コンポーネントをレンダリング
    render(<AudioClipList {...defaultProps} />);

    // 1件目のデータ取得完了を待機
    await waitFor(() => {
      expect(screen.getByText("テストクリップ1")).toBeInTheDocument();
    });

    // 「もっと見る」ボタンをクリック
    fireEvent.click(screen.getByText("もっと見る"));

    // 読み込み中表示になることを確認
    await waitFor(() => {
      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    });

    // 読み込み完了
    act(() => {
      if (resolvePromise) {
        resolvePromise({}); // Promiseを解決
      }
    });

    // 読み込みが完了し、両方のクリップが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText("テストクリップ1")).toBeInTheDocument();
      expect(screen.getByText("テストクリップ2")).toBeInTheDocument();
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });
  });
});
