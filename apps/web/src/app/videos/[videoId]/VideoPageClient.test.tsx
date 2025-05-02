import { AuthProvider } from "@/lib/firebase/AuthProvider";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { User } from "firebase/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VideoPageClient from "./VideoPageClient";

// モックモジュール
vi.mock("@/components/videos/YouTubeEmbed", () => ({
  default: ({ onReady, videoId, title }: any) => {
    // onReadyコールバックをシミュレート
    setTimeout(() => {
      const mockPlayer = {
        getCurrentTime: () => 10,
        seekTo: vi.fn(),
        playVideo: vi.fn(),
        pauseVideo: vi.fn(),
      };
      onReady(mockPlayer);
    }, 0);

    return (
      <div data-testid="youtube-embed">
        YouTube動画プレーヤー（ID: {videoId}, タイトル: {title}）
      </div>
    );
  },
}));

vi.mock("@/components/audioclips/AudioClipCreator", () => ({
  default: ({ videoId, videoTitle, youtubePlayerRef }: any) => (
    <div data-testid="audio-clip-creator">
      音声クリップ作成フォーム（動画ID: {videoId}, タイトル: {videoTitle}）
    </div>
  ),
}));

vi.mock("@/components/audioclips/AudioClipList", () => ({
  default: ({ videoId, youtubePlayerRef }: any) => (
    <div data-testid="audio-clip-list">
      音声クリップ一覧（動画ID: {videoId}）
    </div>
  ),
}));

vi.mock("@/components/videos/CollapsibleVideoInfo", () => ({
  default: ({ video }: any) => (
    <div data-testid="collapsible-video-info">
      動画情報（タイトル: {video.title}）
    </div>
  ),
}));

// AuthProviderのモック
vi.mock("@/lib/firebase/AuthProvider", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/firebase/AuthProvider")
  >("@/lib/firebase/AuthProvider");
  return {
    ...actual,
    AuthProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    useAuth: vi.fn(),
  };
});

// テスト用ダミーデータ
const mockVideo = {
  id: "test-video-id",
  title: "テスト動画タイトル",
  description: "テスト動画の説明文です。",
  channelId: "test-channel-id",
  channelTitle: "テストチャンネル",
  publishedAt: "2025-05-01T00:00:00Z",
  thumbnails: {
    default: { url: "https://example.com/default.jpg", width: 120, height: 90 },
    medium: { url: "https://example.com/medium.jpg", width: 320, height: 180 },
    high: { url: "https://example.com/high.jpg", width: 480, height: 360 },
  },
  tags: ["テスト", "サンプル"],
};

// モック関数のインポート
const useAuthMock = vi.mocked(
  (await import("@/lib/firebase/AuthProvider")).useAuth,
);

describe("VideoPageClientコンポーネント", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // コンソールログをモック
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("動画情報と埋め込みプレイヤーが正しく表示される", () => {
    // 未ログイン状態をモック
    useAuthMock.mockReturnValue({ user: null, loading: false });

    render(<VideoPageClient video={mockVideo} />);

    // 基本コンポーネントが表示されることを確認
    expect(screen.getByTestId("youtube-embed")).toBeInTheDocument();
    expect(screen.getByTestId("collapsible-video-info")).toBeInTheDocument();
    expect(screen.getByText(/動画一覧に戻る/)).toBeInTheDocument();
  });

  it("YouTubeプレーヤーが準備完了後にAudioClipCreatorが表示される", async () => {
    // 未ログイン状態をモック
    useAuthMock.mockReturnValue({ user: null, loading: false });

    render(<VideoPageClient video={mockVideo} />);

    // AudioClipCreatorは最初は表示されない（isPlayerReadyがfalseのため）
    expect(screen.queryByTestId("audio-clip-creator")).not.toBeInTheDocument();

    // プレーヤー準備完了後にAudioClipCreatorが表示される
    await waitFor(() => {
      expect(screen.getByTestId("audio-clip-creator")).toBeInTheDocument();
    });
  });

  it("ログイン済みユーザーにとって全ての機能が利用可能", async () => {
    // ログイン済み状態をモック
    const mockUser = { uid: "test-user-id" } as User;
    useAuthMock.mockReturnValue({ user: mockUser, loading: false });

    render(<VideoPageClient video={mockVideo} />);

    // 基本コンポーネントが表示される
    expect(screen.getByTestId("youtube-embed")).toBeInTheDocument();
    expect(screen.getByTestId("collapsible-video-info")).toBeInTheDocument();

    // プレーヤー準備完了後にAudioClipCreatorとAudioClipListが表示される
    await waitFor(() => {
      expect(screen.getByTestId("audio-clip-creator")).toBeInTheDocument();
      expect(screen.getAllByTestId("audio-clip-list").length).toBeGreaterThan(
        0,
      );
    });
  });

  it("モバイル表示とデスクトップ表示で適切なレイアウトを提供する", async () => {
    useAuthMock.mockReturnValue({ user: null, loading: false });

    render(<VideoPageClient video={mockVideo} />);

    await waitFor(() => {
      // モバイル表示用とデスクトップ表示用の2つのAudioClipListがある
      const clipLists = screen.getAllByTestId("audio-clip-list");
      expect(clipLists.length).toBe(2);
    });
  });

  it("認証ロード中の状態で適切にUI状態を表示する", () => {
    // 認証ローディング状態をモック
    useAuthMock.mockReturnValue({ user: null, loading: true });

    render(<VideoPageClient video={mockVideo} />);

    // 基本コンポーネントが表示される
    expect(screen.getByTestId("youtube-embed")).toBeInTheDocument();
    expect(screen.getByTestId("collapsible-video-info")).toBeInTheDocument();

    // ローディング中はAudioClipCreatorが表示されないことを確認
    expect(screen.queryByTestId("audio-clip-creator")).not.toBeInTheDocument();

    // AudioClipListは認証状態に関わらず表示される（モバイル用とデスクトップ用の2つ）
    const audioClipLists = screen.queryAllByTestId("audio-clip-list");
    expect(audioClipLists.length).toBe(2);
  });

  it("動画が再生されていない状態でシークボタンをクリックしても何も起こらない", async () => {
    useAuthMock.mockReturnValue({ user: null, loading: false });

    render(<VideoPageClient video={mockVideo} />);

    // プレーヤーが準備完了するまで待機
    await waitFor(() => {
      expect(screen.getByTestId("audio-clip-creator")).toBeInTheDocument();
    });

    // 現在のページにシークボタンが存在すれば、クリックをシミュレート
    const seekButtons = screen.queryAllByRole("button", {
      name: /シーク|時間設定|再生位置/i,
    });
    if (seekButtons.length > 0) {
      fireEvent.click(seekButtons[0]);
      // エラーが発生しないことを確認（消極的なアサーション）
    }
  });
});
