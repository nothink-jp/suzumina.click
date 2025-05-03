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

  // 追加テストケース: 長いタイトルが適切に表示される
  it("長いタイトルが適切に表示される", () => {
    const longTitleVideo = {
      ...mockVideo,
      title:
        "これは非常に長いタイトルです。このタイトルは100文字以上あり、表示の際にレイアウトが崩れないことを確認するためのテストケースです。実際の動画タイトルにも長いものがあるため、このようなケースにも対応する必要があります。",
    };

    render(<VideoInfo video={longTitleVideo} />);

    expect(screen.getByText(longTitleVideo.title)).toBeInTheDocument();
    // h1タグ内に表示されていることを確認
    const titleElement = screen.getByText(longTitleVideo.title);
    expect(titleElement.tagName).toBe("H1");
  });

  // 追加テストケース: 説明文が空の場合
  it("説明文が空の場合も正しく表示される", () => {
    const noDescriptionVideo = { ...mockVideo, description: "" };

    render(<VideoInfo video={noDescriptionVideo} />);

    // 説明の見出しは表示される
    expect(screen.getByText("説明")).toBeInTheDocument();

    // 説明文が空のため、内容は空文字列
    const descriptionContainer = screen.getByText("説明").parentElement;
    if (descriptionContainer) {
      const descriptionParagraph = descriptionContainer.querySelector("p");
      expect(descriptionParagraph).toBeInTheDocument();
      expect(descriptionParagraph?.textContent).toBe("");
    }
  });

  // 追加テストケース: 特殊文字を含む説明文
  it("特殊文字を含む説明文が正しく表示される", () => {
    const specialCharsVideo = {
      ...mockVideo,
      description:
        "特殊文字: & < > \" ' を含む説明文\nURLも含む: https://example.com",
    };

    render(<VideoInfo video={specialCharsVideo} />);

    // 特殊文字を含む説明文が表示される
    const descriptionRegex =
      /特殊文字: & < > " ' を含む説明文[\s\n]*URLも含む: https:\/\/example\.com/;
    expect(screen.getByText(descriptionRegex)).toBeInTheDocument();
  });

  // 追加テストケース: チャンネル名が長い場合
  it("チャンネル名が長い場合も正しく表示される", () => {
    const longChannelNameVideo = {
      ...mockVideo,
      channelTitle:
        "非常に長いチャンネル名のテストケース（50文字以上の長さがある場合でも適切に表示されるか）",
    };

    render(<VideoInfo video={longChannelNameVideo} />);

    expect(
      screen.getByText(longChannelNameVideo.channelTitle),
    ).toBeInTheDocument();
  });

  // 追加テストケース: 公開日のフォーマット
  it("公開日が正しいフォーマットで表示される", () => {
    // 日本語環境でのフォーマット
    const formattedDate = formatDate(mockVideo.publishedAt);

    render(<VideoInfo video={mockVideo} />);

    expect(screen.getByText(formattedDate)).toBeInTheDocument();
    // フォーマットが「YYYY年MM月DD日」形式になっているか確認
    expect(formattedDate).toMatch(/^\d{4}年\d{1,2}月\d{1,2}日$/);
  });
});
