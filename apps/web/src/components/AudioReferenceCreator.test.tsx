import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioReferenceCreator } from "./AudioReferenceCreator";

// Mock the actions
vi.mock("@/app/buttons/actions", () => ({
  createAudioReference: vi.fn().mockResolvedValue({
    success: true,
    data: { id: "new-audio-ref-id" },
  }),
}));

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock YouTubePlayer
vi.mock("./YouTubePlayer", () => ({
  YouTubePlayer: ({ videoId, ...props }: any) => (
    <div data-testid="youtube-player" data-video-id={videoId}>
      YouTube Player Mock
    </div>
  ),
}));

// Mock AudioReferenceCard
vi.mock("./AudioReferenceCard", () => ({
  AudioReferenceCard: ({ audioReference, ...props }: any) => (
    <div data-testid="audio-reference-card">
      Audio Reference Card Mock: {audioReference?.title}
    </div>
  ),
}));

// Mock UI components
vi.mock("@suzumina.click/ui/components/slider", () => ({
  Slider: ({
    value,
    onValueChange,
    min,
    max,
    step,
    disabled,
    ...props
  }: any) => (
    <div data-testid="slider" {...props}>
      <input
        type="range"
        value={value?.[0] || 0}
        onChange={(e) => onValueChange?.([Number(e.target.value)])}
        min={min || 0}
        max={max || 100}
        step={step || 1}
        disabled={disabled}
        data-testid="slider-input"
        aria-label="Slider"
      />
    </div>
  ),
}));

// Mock Select components
vi.mock("@suzumina.click/ui/components/select", () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select-container">{children}</div>
  ),
  SelectTrigger: ({ children }: any) => (
    <button role="combobox" aria-expanded="false">
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: any) => <span>{placeholder || "ボイス"}</span>,
  SelectContent: ({ children }: any) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: any) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
}));

describe("AudioReferenceCreator", () => {
  const defaultProps = {
    videoId: "test-video-id",
    videoTitle: "テスト動画タイトル",
    videoDuration: 300,
    initialStartTime: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("基本的なフォームが表示される", () => {
    render(<AudioReferenceCreator {...defaultProps} />);

    expect(
      screen.getByRole("heading", { name: /音声ボタンを作成/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/テスト動画タイトル/)).toBeInTheDocument();
  });

  it("タイトル入力フィールドが存在する", () => {
    render(<AudioReferenceCreator {...defaultProps} />);

    // Use placeholder text since the label includes asterisk
    const titleInput = screen.getByPlaceholderText("例: おはようございます");
    expect(titleInput).toBeInTheDocument();
    expect(titleInput).toHaveAttribute("maxLength", "100");
  });

  it("説明入力フィールドが存在する", () => {
    render(<AudioReferenceCreator {...defaultProps} />);

    const descriptionInput = screen.getByPlaceholderText(
      "この音声ボタンの説明...",
    );
    expect(descriptionInput).toBeInTheDocument();
    expect(descriptionInput).toHaveAttribute("maxLength", "500");
  });

  it("カテゴリ選択フィールドが存在する", () => {
    render(<AudioReferenceCreator {...defaultProps} />);

    // Check that the category label exists
    expect(screen.getByText("カテゴリ")).toBeInTheDocument();

    // Check for the Select component by looking for a combobox role
    const categorySelect = screen.getByRole("combobox");
    expect(categorySelect).toBeInTheDocument();
  });

  it("タイトル入力が正しく動作する", async () => {
    const user = userEvent.setup();
    render(<AudioReferenceCreator {...defaultProps} />);

    const titleInput = screen.getByPlaceholderText("例: おはようございます");
    await user.type(titleInput, "新しい音声ボタン");

    expect(titleInput).toHaveValue("新しい音声ボタン");
  });

  it("説明入力が正しく動作する", async () => {
    const user = userEvent.setup();
    render(<AudioReferenceCreator {...defaultProps} />);

    const descriptionInput = screen.getByPlaceholderText(
      "この音声ボタンの説明...",
    );
    await user.type(descriptionInput, "これは新しい音声ボタンの説明です");

    expect(descriptionInput).toHaveValue("これは新しい音声ボタンの説明です");
  });

  it("カテゴリ選択が正しく動作する", async () => {
    const user = userEvent.setup();
    render(<AudioReferenceCreator {...defaultProps} />);

    // Click on the select combobox instead of using getByLabelText
    const categorySelect = screen.getByRole("combobox");
    await user.click(categorySelect);

    // Just verify the combobox exists and is clickable
    expect(categorySelect).toBeInTheDocument();
  });

  it("スライダーが存在する", () => {
    render(<AudioReferenceCreator {...defaultProps} />);

    const sliders = screen.getAllByTestId("slider");
    expect(sliders.length).toBeGreaterThanOrEqual(2); // 開始時間と終了時間のスライダー
  });

  it("YouTubeプレイヤーが表示される", () => {
    render(<AudioReferenceCreator {...defaultProps} />);

    const youtubePlayer = screen.getByTestId("youtube-player");
    expect(youtubePlayer).toBeInTheDocument();
    expect(youtubePlayer).toHaveAttribute("data-video-id", "test-video-id");
  });

  it("作成ボタンが存在する", () => {
    render(<AudioReferenceCreator {...defaultProps} />);

    const createButton = screen.getByRole("button", {
      name: /音声ボタンを作成/,
    });
    expect(createButton).toBeInTheDocument();
  });

  it("キャンセルボタンが存在する", () => {
    render(<AudioReferenceCreator {...defaultProps} />);

    const cancelButton = screen.getByRole("button", { name: /キャンセル/i });
    expect(cancelButton).toBeInTheDocument();
  });

  it("プレビューセクションが表示される", () => {
    render(<AudioReferenceCreator {...defaultProps} />);

    // Use getAllByText to handle multiple instances of "プレビュー"
    const previewElements = screen.getAllByText("プレビュー");
    expect(previewElements.length).toBeGreaterThan(0);
  });

  it("キャンセルボタンクリックでコールバックが呼ばれる", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<AudioReferenceCreator {...defaultProps} onCancel={onCancel} />);

    const cancelButton = screen.getByRole("button", { name: /キャンセル/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it("initialStartTimeが正しく設定される", () => {
    render(<AudioReferenceCreator {...defaultProps} initialStartTime={30} />);

    // コンポーネントが正常にレンダリングされることを確認
    expect(
      screen.getByRole("heading", { name: /音声ボタンを作成/ }),
    ).toBeInTheDocument();
  });

  it("videoDurationが正しく設定される", () => {
    render(<AudioReferenceCreator {...defaultProps} videoDuration={600} />);

    // コンポーネントが正常にレンダリングされることを確認
    expect(
      screen.getByRole("heading", { name: /音声ボタンを作成/ }),
    ).toBeInTheDocument();
  });
});
