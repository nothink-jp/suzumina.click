import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioClip } from "../../lib/audioclips/types";

// 認証コンテキストのモック
vi.mock("../../lib/firebase/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

// TagDisplayコンポーネントをモック
vi.mock("./TagDisplay", () => ({
  default: vi.fn(({ tags }) => (
    <div data-testid="tag-display">
      {tags.slice(0, 3).map((tag: string) => (
        <span key={tag} className="tag">
          {tag}
        </span>
      ))}
    </div>
  )),
}));

import { useAuth } from "../../lib/firebase/AuthProvider";
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
    createdAt: new Date("2025-04-20T10:00:00Z").toISOString(),
    updatedAt: new Date("2025-04-20T10:00:00Z").toISOString(),
    userId: "user-123",
    userName: "テストユーザー",
    userPhotoURL: "https://example.com/photo.jpg",
    playCount: 42,
    isPublic: true,
    favoriteCount: 10,
    tags: ["タグ1", "タグ2"],
  };

  // モック関数のセットアップ
  const mockOnPlay = vi.fn();
  const mockOnFavoriteChange = vi.fn();

  // Server Actionsのモック
  const mockIncrementPlayCount = vi.fn().mockResolvedValue({
    id: mockClip.id,
    message: "再生回数を更新しました",
  });
  const mockToggleFavorite = vi.fn().mockResolvedValue({
    isFavorite: true,
  });

  const defaultProps = {
    clip: mockClip,
    onPlay: mockOnPlay,
    // Server Actionsをprops経由で渡す
    incrementPlayCountAction: mockIncrementPlayCount,
    toggleFavoriteAction: mockToggleFavorite,
  };

  beforeEach(() => {
    // 各テストの前にモックをリセット
    vi.clearAllMocks();

    // useAuthをデフォルト値にリセット
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { uid: "test-user-123" }, // デフォルトでログイン状態
    });
  });

  it("音声クリップの情報が正しく表示される", () => {
    render(<AudioClipButton {...defaultProps} />);

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
    render(<AudioClipButton {...defaultProps} />);

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

    render(<AudioClipButton {...defaultProps} clip={clipWithoutPhoto} />);

    expect(screen.getByText(mockClip.userName)).toBeInTheDocument();
  });

  it("再生ボタンをクリックするとincrementPlayCountActionが呼ばれ、onPlay関数を呼び出す", async () => {
    render(<AudioClipButton {...defaultProps} />);

    // 再生ボタンを取得してクリック
    const playButton = screen.getByLabelText(`${mockClip.title}を再生`);
    await fireEvent.click(playButton);

    // incrementPlayCountActionが呼ばれたか確認
    expect(mockIncrementPlayCount).toHaveBeenCalledWith(mockClip.id);

    // onPlayが正しいクリップで呼び出されたか確認
    expect(mockOnPlay).toHaveBeenCalledWith(mockClip);
  });

  it("お気に入りボタンをクリックするとtoggleFavoriteActionが呼ばれ、お気に入り状態が切り替わる", async () => {
    render(
      <AudioClipButton
        {...defaultProps}
        isFavorite={false}
        onFavoriteChange={mockOnFavoriteChange}
      />,
    );

    // お気に入りボタンを取得してクリック
    const favoriteButton = screen.getByLabelText("お気に入りに追加");
    await fireEvent.click(favoriteButton);

    // toggleFavoriteActionが正しく呼ばれたか確認
    expect(mockToggleFavorite).toHaveBeenCalledWith(mockClip.id);

    // onFavoriteChangeが呼び出されたか確認
    expect(mockOnFavoriteChange).toHaveBeenCalledWith(true);
  });

  it("初期状態でお気に入り設定されている場合は削除ボタンが表示される", () => {
    render(<AudioClipButton {...defaultProps} isFavorite={true} />);

    expect(screen.getByLabelText("お気に入りから削除")).toBeInTheDocument();
  });

  it("未ログイン状態ではお気に入りボタンが表示されない", () => {
    // 未ログイン状態をモック
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
    });

    render(<AudioClipButton {...defaultProps} />);

    // お気に入りボタンがないことを確認
    expect(screen.queryByLabelText("お気に入りに追加")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("お気に入りから削除"),
    ).not.toBeInTheDocument();
  });
});
