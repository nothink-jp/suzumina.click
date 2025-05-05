import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioClip } from "../../lib/audioclips/types";

// モジュールをモック化 - Vitestのホイスティング問題を解消するために
// インライン関数内で直接vi.fn()を使用
vi.mock("../../actions/audioclips/actions", () => ({
  incrementPlayCount: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("../../app/actions/audioclipFavorites", () => ({
  setFavoriteStatus: vi.fn(() => Promise.resolve(true)),
}));

// 認証コンテキストのモック
vi.mock("../../lib/firebase/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

import { incrementPlayCount } from "../../actions/audioclips/actions";
import { setFavoriteStatus } from "../../app/actions/audioclipFavorites";
import { useAuth } from "../../lib/firebase/AuthProvider";
// モック化したモジュールをインポート（モックファクトリの後に配置）
import AudioClipButton from "./AudioClipButton";

describe("AudioClipButtonコンポーネントのテスト", () => {
  // テスト用の音声クリップデータ
  const mockClip: AudioClip = {
    id: "clip-123",
    title: "テスト音声クリップ",
    phrase: "これはテストです",
    audioUrl: "https://example.com/audio.mp3",
    videoId: "video-123",
    startTime: 60,
    endTime: 65,
    duration: 5,
    formattedDuration: "0:05",
    createdAt: new Date("2025-04-20T10:00:00Z"),
    updatedAt: new Date("2025-04-20T10:00:00Z"),
    userId: "user-123",
    userName: "テストユーザー",
    userPhotoURL: "https://example.com/photo.jpg",
    playCount: 42,
    isPublic: true,
    favoriteCount: 10,
  };

  // モック関数のセットアップ
  const mockOnPlay = vi.fn();
  const mockOnFavoriteChange = vi.fn();

  beforeEach(() => {
    // 各テストの前にモックをリセット
    vi.clearAllMocks();

    // useAuthをデフォルト値にリセット
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { uid: "test-user-123" }, // デフォルトでログイン状態
    });
  });

  it("音声クリップの情報が正しく表示される", () => {
    render(<AudioClipButton clip={mockClip} onPlay={mockOnPlay} />);

    // クリップタイトルが表示されているか
    expect(screen.getByText(mockClip.title)).toBeInTheDocument();

    // フレーズが表示されているか
    expect(screen.getByText(mockClip.phrase)).toBeInTheDocument();

    // 再生時間が表示されているか
    expect(screen.getByText(mockClip.formattedDuration)).toBeInTheDocument();

    // 再生回数が表示されているか
    expect(screen.getByText(`${mockClip.playCount}回`)).toBeInTheDocument();
  });

  it("ユーザー写真がある場合は写真を表示する", () => {
    render(<AudioClipButton clip={mockClip} onPlay={mockOnPlay} />);

    const userPhoto = screen.getByAltText(
      mockClip.userName,
    ) as HTMLImageElement;
    expect(userPhoto).toBeInTheDocument();
    expect(userPhoto.src).toBe(mockClip.userPhotoURL);
  });

  it("ユーザー写真がない場合はユーザー名を表示する", () => {
    // 写真URLなしのクリップを作成
    const clipWithoutPhoto = {
      ...mockClip,
      userPhotoURL: undefined,
    };

    render(<AudioClipButton clip={clipWithoutPhoto} onPlay={mockOnPlay} />);

    expect(screen.getByText(mockClip.userName)).toBeInTheDocument();
  });

  it("再生ボタンをクリックすると再生カウントを増加し、onPlay関数を呼び出す", async () => {
    render(<AudioClipButton clip={mockClip} onPlay={mockOnPlay} />);

    // 再生ボタンを取得してクリック
    const playButton = screen.getByLabelText(`${mockClip.title}を再生`);
    await fireEvent.click(playButton);

    // incrementPlayCountが呼ばれたか確認（実際のファイルパスを使用）
    expect(incrementPlayCount).toHaveBeenCalledWith(mockClip.id);

    // onPlayが正しいクリップで呼び出されたか確認
    expect(mockOnPlay).toHaveBeenCalledWith(mockClip);
  });

  it("お気に入りボタンをクリックするとお気に入り状態が切り替わる", async () => {
    render(
      <AudioClipButton
        clip={mockClip}
        onPlay={mockOnPlay}
        isFavorite={false}
        onFavoriteChange={mockOnFavoriteChange}
      />,
    );

    // お気に入りボタンを取得してクリック
    const favoriteButton = screen.getByLabelText("お気に入りに追加");
    await fireEvent.click(favoriteButton);

    // setFavoriteStatusが正しく呼ばれたか確認
    expect(setFavoriteStatus).toHaveBeenCalledWith(mockClip.id, true);

    // onFavoriteChangeが呼び出されたか確認
    expect(mockOnFavoriteChange).toHaveBeenCalledWith(true);
  });

  it("初期状態でお気に入り設定されている場合は削除ボタンが表示される", () => {
    render(
      <AudioClipButton clip={mockClip} onPlay={mockOnPlay} isFavorite={true} />,
    );

    expect(screen.getByLabelText("お気に入りから削除")).toBeInTheDocument();
  });

  it("未ログイン状態ではお気に入りボタンが表示されない", () => {
    // 未ログイン状態をモック
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      user: null,
    });

    render(<AudioClipButton clip={mockClip} onPlay={mockOnPlay} />);

    // お気に入りボタンがないことを確認
    expect(screen.queryByLabelText("お気に入りに追加")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("お気に入りから削除"),
    ).not.toBeInTheDocument();
  });
});
