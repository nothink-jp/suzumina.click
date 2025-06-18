import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioUploader } from "./AudioUploader";

// Mock the audio extractor module
vi.mock("@/lib/audio-extractor", () => ({
  validateAudioFile: vi.fn(() => ({
    originalName: "test.mp3",
    fileSize: 1024,
    mimeType: "audio/mpeg",
    format: "mp3",
    duration: 0, // Will be updated after metadata extraction
  })),
  extractAudioMetadata: vi.fn(() =>
    Promise.resolve({
      duration: 60,
      sampleRate: 44100,
      channels: 2,
    }),
  ),
  extractAudio: vi.fn(() =>
    Promise.resolve({
      blob: new Blob(["audio data"], { type: "audio/opus" }),
      format: "opus",
      duration: 60,
      fileSize: 512,
      sampleRate: 48000,
      bitrate: 128,
    }),
  ),
  formatFileSize: vi.fn((size) => `${size} bytes`),
  formatAudioDuration: vi.fn((duration) => `${duration}s`),
  AudioExtractionError: class AudioExtractionError extends Error {
    constructor(
      message: string,
      public code: string,
    ) {
      super(message);
      this.name = "AudioExtractionError";
    }
  },
}));

// Mock HTMLAudioElement
global.HTMLAudioElement.prototype.play = vi.fn().mockResolvedValue(undefined);
global.HTMLAudioElement.prototype.pause = vi.fn();

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:test-url");
global.URL.revokeObjectURL = vi.fn();

describe("AudioUploader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("基本的なアップローダーが表示される", () => {
    render(<AudioUploader />);

    expect(screen.getByText("音声ファイルのアップロード")).toBeInTheDocument();
    expect(
      screen.getByText("音声ファイルをドロップするか、クリックして選択"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "ファイルを選択" }),
    ).toBeInTheDocument();
  });

  it("ファイル選択ボタンをクリックするとファイル入力が開かれる", async () => {
    const user = userEvent.setup();
    render(<AudioUploader />);

    const fileInput = screen.getByRole("button", { name: "ファイルを選択" });
    await user.click(fileInput);

    // ファイル入力のクリックイベントがトリガーされることを確認
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument();
  });

  it("ファイルをアップロードすると処理が開始される", async () => {
    const user = userEvent.setup();
    const onFileProcessed = vi.fn();

    render(<AudioUploader onFileProcessed={onFileProcessed} />);

    const file = new File(["audio content"], "test.mp3", {
      type: "audio/mpeg",
    });
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(fileInput, file);

    // 処理開始の確認
    await waitFor(() => {
      expect(
        screen.getByText("ファイルを検証しています..."),
      ).toBeInTheDocument();
    });
  });

  it("ドラッグ&ドロップでファイルをアップロードできる", async () => {
    const onFileProcessed = vi.fn();

    render(<AudioUploader onFileProcessed={onFileProcessed} />);

    const dropArea = screen.getByLabelText(
      "音声ファイルを選択またはドラッグ&ドロップ",
    );
    const file = new File(["audio content"], "test.mp3", {
      type: "audio/mpeg",
    });

    // ドラッグオーバーイベント
    await userEvent.upload(dropArea, file);

    await waitFor(() => {
      expect(
        screen.getByText("ファイルを検証しています..."),
      ).toBeInTheDocument();
    });
  });

  it("処理完了後にプレビューが表示される", async () => {
    const user = userEvent.setup();
    const onFileProcessed = vi.fn();

    render(<AudioUploader onFileProcessed={onFileProcessed} />);

    const file = new File(["audio content"], "test.mp3", {
      type: "audio/mpeg",
    });
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(fileInput, file);

    // 処理完了まで待機
    await waitFor(
      () => {
        expect(screen.getByText("処理が完了しました")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // プレビューセクションの確認
    expect(screen.getByText("プレビュー")).toBeInTheDocument();
    expect(screen.getByText("test.mp3")).toBeInTheDocument();
  });

  it("エラーが発生した場合はエラーメッセージが表示される", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();

    // validateAudioFileがエラーをスローするようにモック
    const { validateAudioFile } = await import("@/lib/audio-extractor");
    vi.mocked(validateAudioFile).mockImplementationOnce(() => {
      throw new Error("Invalid file format");
    });

    render(<AudioUploader onError={onError} />);

    const file = new File(["invalid content"], "test.txt", {
      type: "text/plain",
    });
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText("処理に失敗しました")).toBeInTheDocument();
    });

    expect(onError).toHaveBeenCalled();
  });

  it("音声プレビューの再生・停止ができる", async () => {
    const user = userEvent.setup();
    const onFileProcessed = vi.fn();

    render(<AudioUploader onFileProcessed={onFileProcessed} />);

    const file = new File(["audio content"], "test.mp3", {
      type: "audio/mpeg",
    });
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(fileInput, file);

    // プレビューが表示されるまで待機
    await waitFor(
      () => {
        expect(screen.getByText("プレビュー")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // 再生ボタンをクリック
    const playButton = screen.getByRole("button", { name: "" }); // Play button without text
    await user.click(playButton);

    expect(HTMLAudioElement.prototype.play).toHaveBeenCalled();
  });

  it("リセットボタンでファイルがクリアされる", async () => {
    const user = userEvent.setup();
    const onFileProcessed = vi.fn();

    render(<AudioUploader onFileProcessed={onFileProcessed} />);

    const file = new File(["audio content"], "test.mp3", {
      type: "audio/mpeg",
    });
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(fileInput, file);

    // プレビューが表示されるまで待機
    await waitFor(
      () => {
        expect(screen.getByText("プレビュー")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // リセットボタンをクリック
    const resetButton = screen.getByRole("button", { name: "リセット" });
    await user.click(resetButton);

    // プレビューが消えることを確認
    await waitFor(() => {
      expect(screen.queryByText("プレビュー")).not.toBeInTheDocument();
    });

    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("disabledプロパティが設定されている場合はファイル選択ができない", () => {
    render(<AudioUploader disabled={true} />);

    const fileSelectButton = screen.getByRole("button", {
      name: "ファイルを選択",
    });
    const dropArea = screen.getByLabelText(
      "音声ファイルを選択またはドラッグ&ドロップ",
    );

    expect(fileSelectButton).toBeDisabled();
    expect(dropArea).toBeDisabled();
  });

  it("ファイルサイズ制限を超えた場合はエラーが表示される", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();

    render(<AudioUploader maxFileSize={100} onError={onError} />);

    const file = new File(["large audio content"], "large.mp3", {
      type: "audio/mpeg",
    });
    Object.defineProperty(file, "size", { value: 1000 }); // 1000 bytes > 100 bytes limit

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText("処理に失敗しました")).toBeInTheDocument();
    });
  });

  it("処理中は進行状況が表示される", async () => {
    const user = userEvent.setup();

    render(<AudioUploader />);

    const file = new File(["audio content"], "test.mp3", {
      type: "audio/mpeg",
    });
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(fileInput, file);

    // 進行状況バーが表示されることを確認
    await waitFor(() => {
      expect(screen.getByLabelText("処理進行状況")).toBeInTheDocument();
    });
  });

  it("アクセシビリティ属性が正しく設定される", () => {
    render(<AudioUploader />);

    const dropArea = screen.getByLabelText(
      "音声ファイルを選択またはドラッグ&ドロップ",
    );
    expect(dropArea).toHaveAttribute("aria-describedby", "upload-description");

    const description = screen.getByText(/対応形式:/);
    expect(description).toBeInTheDocument();
  });
});
