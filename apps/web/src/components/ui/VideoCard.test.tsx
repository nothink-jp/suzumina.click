import { formatDate } from "@/utils/date-format";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VideoCard from "./VideoCard";

// Next.js の Image コンポーネントをモック
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

describe("VideoCardコンポーネントのテスト", () => {
  // テスト用のモックデータ
  const mockVideo = {
    id: "test-video-123",
    title: "テスト動画タイトル",
    description: "これはテスト用の説明文です。",
    publishedAt: new Date("2025-04-25T10:30:00"),
    thumbnailUrl: "https://example.com/thumbnail.jpg",
    channelId: "test-channel",
    channelTitle: "テストチャンネル",
    lastFetchedAt: new Date("2025-05-01T15:00:00"),
  };

  it("動画情報が正しく表示される", () => {
    render(<VideoCard video={mockVideo} />);

    // 要素が存在するか確認
    expect(screen.getByText(mockVideo.title)).toBeInTheDocument();
    expect(
      screen.getByText(formatDate(mockVideo.publishedAt)),
    ).toBeInTheDocument();

    // サムネイル画像が正しく表示されるか確認
    const image = screen.getByAltText(mockVideo.title) as HTMLImageElement;
    expect(image).toHaveAttribute("src", mockVideo.thumbnailUrl);
  });

  it("動画詳細ページへのリンクが正しく設定されている", () => {
    render(<VideoCard video={mockVideo} />);

    // リンク要素を取得
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", `/videos/${mockVideo.id}`);
  });
});
