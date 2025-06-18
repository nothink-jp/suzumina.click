import { render, screen } from "@testing-library/react";
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
    duration: 0,
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
    const onFileProcessed = vi.fn();
    render(<AudioUploader onFileProcessed={onFileProcessed} />);

    expect(screen.getByText("ファイルを選択")).toBeInTheDocument();
  });

  it("ファイル選択ボタンをクリックするとファイル入力が開かれる", async () => {
    const user = userEvent.setup();
    const onFileProcessed = vi.fn();

    render(<AudioUploader onFileProcessed={onFileProcessed} />);

    const fileButton = screen.getByText("ファイルを選択");
    await user.click(fileButton);

    // ファイル入力要素が存在することを確認
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument();
  });

  it("コンポーネントが正常にレンダリングされる", () => {
    const onFileProcessed = vi.fn();
    render(<AudioUploader onFileProcessed={onFileProcessed} />);

    // 基本的な要素の存在確認
    expect(screen.getByText("ファイルを選択")).toBeInTheDocument();
  });

  it("disabledプロパティが設定されている場合はファイル選択ができない", () => {
    const onFileProcessed = vi.fn();
    render(<AudioUploader onFileProcessed={onFileProcessed} disabled />);

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(fileInput).toBeDisabled();
  });
});
