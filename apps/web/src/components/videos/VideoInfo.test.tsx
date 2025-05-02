import type { Video } from "@/lib/videos/types";
import { formatDate } from "@/utils/date-format";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import VideoInfo from "./VideoInfo";

describe("VideoInfoコンポーネントのテスト", () => {
  // テスト用のモックデータ
  const mockVideo: Video = {
    id: "test-video-id",
    title: "テスト動画タイトル",
    description:
      "これはテストの説明文です。\n複数行の説明文にも対応しています。",
    publishedAt: new Date("2025-04-30T12:30:00Z"),
    publishedAtISO: "2025-04-30T12:30:00Z",
    thumbnailUrl: "https://example.com/thumbnail.jpg",
    channelId: "channel-123",
    channelTitle: "テストチャンネル",
    lastFetchedAt: new Date("2025-05-01T00:00:00Z"),
    lastFetchedAtISO: "2025-05-01T00:00:00Z",
  };

  it("動画タイトルが正しく表示される", () => {
    render(<VideoInfo video={mockVideo} />);

    expect(screen.getByText(mockVideo.title)).toBeInTheDocument();
  });

  it("公開日とチャンネル名が正しく表示される", () => {
    render(<VideoInfo video={mockVideo} />);

    const formattedDate = formatDate(mockVideo.publishedAt);
    expect(screen.getByText(formattedDate)).toBeInTheDocument();
    expect(screen.getByText(mockVideo.channelTitle)).toBeInTheDocument();
  });

  it("説明文が正しく表示される", () => {
    render(<VideoInfo video={mockVideo} />);

    // 複数行の説明文に対応するため、正規表現を使用
    const descriptionRegex =
      /これはテストの説明文です。[\s\n]*複数行の説明文にも対応しています。/;
    expect(screen.getByText(descriptionRegex)).toBeInTheDocument();
  });

  it("説明文の見出しが表示される", () => {
    render(<VideoInfo video={mockVideo} />);

    expect(screen.getByText("説明")).toBeInTheDocument();
  });

  it("説明文が改行を保持して表示される", () => {
    render(<VideoInfo video={mockVideo} />);

    const descriptionElement = screen.getByText(
      (content) =>
        content.includes("これはテストの説明文です。") &&
        content.includes("複数行の説明文にも対応しています。"),
    );
    expect(descriptionElement.className).toContain("whitespace-pre-line");
  });
});
