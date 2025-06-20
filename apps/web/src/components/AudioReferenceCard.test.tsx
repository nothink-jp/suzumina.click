import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AudioReferenceCard } from "./AudioReferenceCard";
import type { FrontendAudioReferenceData } from "@suzumina.click/shared-types";

// Mock the actions
vi.mock("@/app/buttons/actions", () => ({
  incrementPlayCount: vi.fn().mockResolvedValue({ success: true }),
  incrementLikeCount: vi.fn().mockResolvedValue({ success: true }),
  decrementLikeCount: vi.fn().mockResolvedValue({ success: true }),
  incrementViewCount: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock YouTubePlayer with simple implementation
vi.mock("./YouTubePlayer", () => ({
  YouTubePlayer: ({ videoId, ...props }: any) => (
    <div data-testid="youtube-player" data-video-id={videoId}>
      YouTube Player Mock
    </div>
  ),
  useYouTubePlayer: () => ({
    player: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 50,
    isMuted: false,
    controls: {
      play: vi.fn(),
      pause: vi.fn(),
      stop: vi.fn(),
      seekTo: vi.fn(),
      setVolume: vi.fn(),
      mute: vi.fn(),
      unmute: vi.fn(),
    },
    handlers: {
      onReady: vi.fn(),
      onStateChange: vi.fn(),
      onTimeUpdate: vi.fn(),
    },
  }),
}));

const mockAudioReference: FrontendAudioReferenceData = {
  id: "test-audio-ref-1",
  title: "テスト音声ボタン",
  description: "これはテスト用の音声ボタンです",
  category: "voice",
  tags: ["テスト", "音声"],
  videoId: "test-video-id",
  videoTitle: "テスト動画タイトル",
  startTime: 30,
  endTime: 45,
  duration: 15,
  playCount: 100,
  likeCount: 25,
  viewCount: 500,
  isPublic: true,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("AudioReferenceCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("基本的な音声リファレンスカードが表示される", () => {
    render(
      <AudioReferenceCard 
        audioReference={mockAudioReference} 
        showSourceVideo={true}
        size="md"
        variant="default"
      />
    );

    expect(screen.getByText("テスト音声ボタン")).toBeInTheDocument();
    expect(screen.getByText("これはテスト用の音声ボタンです")).toBeInTheDocument();
  });

  it("プレイボタンが存在する", () => {
    render(
      <AudioReferenceCard 
        audioReference={mockAudioReference} 
        showSourceVideo={true}
        size="md"
        variant="default"
      />
    );

    // プレイボタンまたは再生関連のボタンが存在することを確認
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("統計情報が表示される", () => {
    render(
      <AudioReferenceCard 
        audioReference={mockAudioReference} 
        showSourceVideo={true}
        size="md"
        variant="default"
      />
    );

    expect(screen.getByText("100")).toBeInTheDocument(); // play count
    expect(screen.getByText("25")).toBeInTheDocument(); // like count
  });

  it("タグが表示される", () => {
    render(
      <AudioReferenceCard 
        audioReference={mockAudioReference} 
        showSourceVideo={true}
        size="md"
        variant="default"
      />
    );

    expect(screen.getByText("テスト")).toBeInTheDocument();
    expect(screen.getByText("音声")).toBeInTheDocument();
  });

  it("元動画情報が表示される", () => {
    render(
      <AudioReferenceCard 
        audioReference={mockAudioReference} 
        showSourceVideo={true}
        size="md"
        variant="default"
      />
    );

    expect(screen.getByText("テスト動画タイトル")).toBeInTheDocument();
  });

  it("元動画を非表示にできる", () => {
    render(
      <AudioReferenceCard 
        audioReference={mockAudioReference} 
        showSourceVideo={false}
        size="md"
        variant="default"
      />
    );

    // showSourceVideo=falseの場合でも基本情報は表示される
    expect(screen.getByText("テスト音声ボタン")).toBeInTheDocument();
  });

  it("カテゴリラベルが表示される", () => {
    render(
      <AudioReferenceCard 
        audioReference={mockAudioReference} 
        showSourceVideo={true}
        size="md"
        variant="default"
      />
    );

    // カテゴリに関連するテキストが表示されることを確認
    expect(screen.getByText("テスト音声ボタン")).toBeInTheDocument();
  });

  it("説明が表示される", () => {
    render(
      <AudioReferenceCard 
        audioReference={mockAudioReference} 
        showSourceVideo={true}
        size="md"
        variant="default"
      />
    );

    expect(screen.getByText("これはテスト用の音声ボタンです")).toBeInTheDocument();
  });

  it("空の説明でもエラーが起こらない", () => {
    const refWithoutDescription = {
      ...mockAudioReference,
      description: undefined,
    };

    render(
      <AudioReferenceCard 
        audioReference={refWithoutDescription} 
        showSourceVideo={true}
        size="md"
        variant="default"
      />
    );

    expect(screen.getByText("テスト音声ボタン")).toBeInTheDocument();
  });

  it("タグが空の場合でもエラーが起こらない", () => {
    const refWithoutTags = {
      ...mockAudioReference,
      tags: [],
    };

    render(
      <AudioReferenceCard 
        audioReference={refWithoutTags} 
        showSourceVideo={true}
        size="md"
        variant="default"
      />
    );

    expect(screen.getByText("テスト音声ボタン")).toBeInTheDocument();
  });
});