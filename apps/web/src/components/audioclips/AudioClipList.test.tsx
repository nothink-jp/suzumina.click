import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

// モジュールのモック化 - Vitestのホイスティング問題を解消するために
// インライン関数内で直接vi.fn()を使用
vi.mock("../../lib/firebase/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

// AudioClipButtonとAudioClipPlayerコンポーネントをモック
vi.mock("./AudioClipButton", () => ({
  default: vi.fn(
    ({
      clip,
      onPlay,
      isFavorite,
      onFavoriteChange,
      incrementPlayCountAction,
      toggleFavoriteAction,
    }) => (
      <div data-testid={`audio-clip-${clip.id}`} className="audio-clip-button">
        <span>{clip.title}</span>
        <button
          type="button"
          onClick={() => {
            // ここでincrementPlayCountActionを呼び出してから、onPlayを呼び出す
            incrementPlayCountAction(clip.id)
              .then(() => onPlay(clip))
              .catch((error) =>
                console.error("再生回数の更新に失敗しました:", error),
              );
          }}
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
    ),
  ),
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

import { useAuth } from "../../lib/firebase/AuthProvider";
// モック化したモジュールをインポート（モックファクトリの後に配置）
import AudioClipList from "./AudioClipList";

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

  // Server Actionsのモック
  const mockGetAudioClips = vi.fn().mockResolvedValue({
    clips: [],
    hasMore: false,
    lastClip: null,
  });
  const mockCheckFavoriteStatus = vi.fn().mockResolvedValue({});
  const mockIncrementPlayCount = vi
    .fn()
    .mockResolvedValue({ id: "clip-1", message: "再生回数を更新しました" });
  const mockToggleFavorite = vi.fn().mockResolvedValue({ isFavorite: true });

  // プロップスのデフォルト値
  const defaultProps = {
    videoId: "video-123",
    initialClips: mockClips,
    hasMore: false,
    lastClip: mockClips[mockClips.length - 1],
    getAudioClipsAction: mockGetAudioClips,
    checkFavoriteStatusAction: mockCheckFavoriteStatus,
    incrementPlayCountAction: mockIncrementPlayCount,
    toggleFavoriteAction: mockToggleFavorite,
  };

  const mockUseAuth = vi.mocked(useAuth);

  beforeEach(() => {
    vi.clearAllMocks();
    // ログイン状態のモックをリセット
    mockUseAuth.mockReturnValue({ user: null, loading: false });
  });

  it("クリップリストが正しく表示される", () => {
    // 描画
    render(<AudioClipList {...defaultProps} />);

    // ヘッダー部分の確認
    expect(screen.getByText("音声クリップ")).toBeInTheDocument();
    expect(screen.getByText(`${mockClips.length}件`)).toBeInTheDocument();

    // 各クリップが表示されていることを確認
    for (const clip of mockClips) {
      expect(screen.getByTestId(`audio-clip-${clip.id}`)).toBeInTheDocument();
      expect(screen.getByText(clip.title)).toBeInTheDocument();
    }

    // ログインしていない場合、お気に入りボタンは機能するが、
    // 内部的にはログイン確認が行われるため、実際の操作は行われない
  });

  it("クリップ再生時にプレイヤーが表示される", async () => {
    // 描画
    render(<AudioClipList {...defaultProps} />);

    // 初期状態ではプレイヤーは非表示
    expect(screen.queryByTestId("audio-clip-player")).not.toBeInTheDocument();

    // 最初のクリップの再生ボタンをクリック
    const firstClipId = mockClips[0].id;
    const playButton = screen.getByTestId(`play-button-${firstClipId}`);

    await act(async () => {
      fireEvent.click(playButton);
    });

    // Server Actionが呼ばれたことを確認
    expect(mockIncrementPlayCount).toHaveBeenCalledWith(firstClipId);

    // プレイヤーが表示されていることを確認
    expect(screen.getByTestId("audio-clip-player")).toBeInTheDocument();
    expect(
      screen.getByText(`${mockClips[0].title}を再生中`),
    ).toBeInTheDocument();

    // プレイヤーを閉じる
    const closeButton = screen.getByTestId("close-player-button");

    await act(async () => {
      fireEvent.click(closeButton);
    });

    // プレイヤーが非表示になっていることを確認
    expect(screen.queryByTestId("audio-clip-player")).not.toBeInTheDocument();
  });

  it("ログイン時にお気に入り状態が取得される", async () => {
    // ログイン状態をモック
    mockUseAuth.mockReturnValue({ user: { uid: "test-user" }, loading: false });

    // モックのお気に入りデータ
    const mockFavoriteStatus = {
      "clip-1": true,
      "clip-2": false,
    };
    mockCheckFavoriteStatus.mockResolvedValueOnce(mockFavoriteStatus);

    // 描画
    render(<AudioClipList {...defaultProps} initialFavorites={{}} />);

    // お気に入り状態の取得が呼ばれたことを確認
    await waitFor(() => {
      expect(mockCheckFavoriteStatus).toHaveBeenCalled();
      const clipIds = mockClips.map((clip) => clip.id);
      expect(mockCheckFavoriteStatus).toHaveBeenCalledWith(clipIds);
    });
  });

  it("無限スクロールで追加クリップが読み込まれる", async () => {
    // IntersectionObserverのモック
    const mockIntersectionObserver = vi.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    });
    window.IntersectionObserver = mockIntersectionObserver;

    // 追加のクリップデータ
    const additionalClips = [
      {
        id: "clip-3",
        videoId: "video-123",
        title: "追加クリップ1",
        phrase: "追加フレーズ1",
        startTime: 150,
        endTime: 180,
        createdAt: new Date("2025-03-29").toISOString(),
        userId: "user-3",
        userName: "テストユーザー3",
        isPublic: true,
        tags: [],
        playCount: 50,
        favoriteCount: 20,
      },
    ];

    // hasMoreをtrueに設定
    const props = { ...defaultProps, hasMore: true };

    // 追加データの返却をモック
    mockGetAudioClips.mockResolvedValueOnce({
      clips: additionalClips,
      hasMore: false,
      lastClip: additionalClips[additionalClips.length - 1],
    });

    // 描画
    render(<AudioClipList {...props} />);

    // IntersectionObserver コールバックを手動で呼び出す
    const [observerCallback] = mockIntersectionObserver.mock.calls[0];

    await act(async () => {
      observerCallback([{ isIntersecting: true }]);
    });

    // getAudioClipsActionが適切なパラメータで呼ばれたことを確認
    await waitFor(() => {
      expect(mockGetAudioClips).toHaveBeenCalledWith({
        videoId: "video-123",
        limit: 10,
        startAfter: expect.any(Date),
      });
    });
  });
});
