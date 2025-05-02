import type { Video } from "@/lib/videos/types";
import { formatDate } from "@/utils/date-format";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CollapsibleVideoInfo from "./CollapsibleVideoInfo";

describe("CollapsibleVideoInfoコンポーネントのテスト", () => {
  // テスト用のモックデータ
  const mockVideo: Video = {
    id: "test-video-123",
    title: "テスト用動画タイトル",
    description: "これはテスト用の説明文です。\n改行も含まれています。",
    publishedAt: new Date("2025-04-15T12:00:00Z"),
    publishedAtISO: "2025-04-15T12:00:00Z",
    thumbnailUrl: "https://example.com/thumbnail.jpg",
    channelId: "test-channel-123",
    channelTitle: "テストチャンネル",
    lastFetchedAt: new Date("2025-05-01T10:00:00Z"),
    lastFetchedAtISO: "2025-05-01T10:00:00Z",
  };

  it("動画のタイトルが表示される", () => {
    render(<CollapsibleVideoInfo video={mockVideo} />);

    expect(screen.getByText(mockVideo.title)).toBeInTheDocument();
  });

  it("公開日とチャンネル名が表示される", () => {
    render(<CollapsibleVideoInfo video={mockVideo} />);

    const formattedDate = formatDate(mockVideo.publishedAt);
    expect(screen.getByText(formattedDate)).toBeInTheDocument();
    expect(screen.getByText(mockVideo.channelTitle)).toBeInTheDocument();
  });

  it("初期状態では説明文が表示されていない", () => {
    render(<CollapsibleVideoInfo video={mockVideo} />);

    // 説明文のパネルを取得して非表示であることを確認
    // data-headlessui-state属性を利用して非表示のパネルを見つける
    const panel = screen.queryByRole("region", { hidden: true });
    expect(panel).not.toBeInTheDocument();
  });

  it("「動画の説明」ボタンをクリックすると説明文が表示される", () => {
    render(<CollapsibleVideoInfo video={mockVideo} />);

    // 「動画の説明」ボタンをクリック
    const descriptionButton = screen.getByRole("button", {
      name: /動画の説明/,
    });
    fireEvent.click(descriptionButton);

    // 説明文が表示されていることを確認
    // whitespace-pre-lineクラスを持つ要素内に説明文が含まれていることを確認
    const descriptionElement = screen.getByText(/これはテスト用の説明文です。/);
    expect(descriptionElement).toBeInTheDocument();
    expect(
      descriptionElement.closest(".whitespace-pre-line"),
    ).toBeInTheDocument();
  });

  it("説明文を開いて再度ボタンをクリックすると説明文が非表示になる", () => {
    render(<CollapsibleVideoInfo video={mockVideo} />);

    // 「動画の説明」ボタンをクリック（開く）
    const descriptionButton = screen.getByRole("button", {
      name: /動画の説明/,
    });
    fireEvent.click(descriptionButton);

    // 説明文が表示されていることを確認
    const descriptionElement = screen.getByText(/これはテスト用の説明文です。/);
    expect(descriptionElement).toBeInTheDocument();

    // もう一度「動画の説明」ボタンをクリック（閉じる）
    fireEvent.click(descriptionButton);

    // 説明文パネルが閉じていることを確認（属性の変化をチェック）
    // ボタンの状態で確認する
    expect(descriptionButton).toHaveAttribute("aria-expanded", "false");
  });

  it("説明文に改行が含まれている場合、適切に表示される", () => {
    const videoWithMultilineDescription: Video = {
      ...mockVideo,
      description: "1行目\n2行目\n3行目",
    };

    render(<CollapsibleVideoInfo video={videoWithMultilineDescription} />);

    // 「動画の説明」ボタンをクリック
    const descriptionButton = screen.getByRole("button", {
      name: /動画の説明/,
    });
    fireEvent.click(descriptionButton);

    // whitespace-pre-lineクラスを持つ要素を見つける
    const preLineElement = document.querySelector(".whitespace-pre-line");
    expect(preLineElement).toBeInTheDocument();

    // その要素内に説明文が含まれていることを確認
    expect(preLineElement).toHaveTextContent("1行目");
    expect(preLineElement).toHaveTextContent("2行目");
    expect(preLineElement).toHaveTextContent("3行目");
  });
});
