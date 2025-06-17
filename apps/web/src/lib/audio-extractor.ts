/**
 * Web Audio API を使用したブラウザベースの音声処理ライブラリ
 * 音声ファイルの読み込み、形式変換、切り抜きなどの機能を提供
 */

import type {
  AudioFileUploadInfo,
  AudioFormat,
} from "@suzumina.click/shared-types";

/**
 * 音声処理のエラー型
 */
export class AudioExtractionError extends Error {
  constructor(
    message: string,
    public code:
      | "BROWSER_NOT_SUPPORTED"
      | "FILE_TOO_LARGE"
      | "INVALID_FORMAT"
      | "PROCESSING_FAILED"
      | "AUDIO_CONTEXT_FAILED",
  ) {
    super(message);
    this.name = "AudioExtractionError";
  }
}

/**
 * 音声切り抜き設定
 */
export interface AudioExtractionOptions {
  startTime?: number; // 開始時刻（秒）
  endTime?: number; // 終了時刻（秒）
  outputFormat?: AudioFormat; // 出力形式
  bitrate?: number; // ビットレート（kbps）
}

/**
 * 音声処理結果
 */
export interface AudioExtractionResult {
  audioBlob: Blob;
  duration: number;
  fileSize: number;
  format: AudioFormat;
  sampleRate: number;
}

/**
 * 音声メタデータ
 */
export interface AudioMetadata {
  duration: number;
  sampleRate: number;
  channels: number;
  fileSize: number;
  mimeType: string;
}

/**
 * ブラウザの Web Audio API サポートチェック
 */
export function checkAudioAPISupport(): {
  supported: boolean;
  mediaRecorder: boolean;
  audioContext: boolean;
  webAudio: boolean;
} {
  const mediaRecorder = typeof MediaRecorder !== "undefined";
  const audioContext =
    typeof AudioContext !== "undefined" ||
    typeof (window as any).webkitAudioContext !== "undefined";
  const webAudio = typeof OfflineAudioContext !== "undefined";

  return {
    supported: mediaRecorder && audioContext && webAudio,
    mediaRecorder,
    audioContext,
    webAudio,
  };
}

/**
 * 音声ファイルからメタデータを抽出
 */
export async function extractAudioMetadata(file: File): Promise<AudioMetadata> {
  const support = checkAudioAPISupport();
  if (!support.supported) {
    throw new AudioExtractionError(
      "ブラウザがWeb Audio APIをサポートしていません",
      "BROWSER_NOT_SUPPORTED",
    );
  }

  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);

    audio.addEventListener("loadedmetadata", () => {
      const metadata: AudioMetadata = {
        duration: audio.duration,
        sampleRate: 44100, // デフォルト値（実際のサンプルレートは AudioContext で取得）
        channels: 2, // デフォルト値
        fileSize: file.size,
        mimeType: file.type,
      };

      URL.revokeObjectURL(url);
      resolve(metadata);
    });

    audio.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(
        new AudioExtractionError(
          "音声ファイルのメタデータを読み取れませんでした",
          "PROCESSING_FAILED",
        ),
      );
    });

    audio.src = url;
  });
}

/**
 * 音声ファイルを ArrayBuffer に変換
 */
export async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target?.result instanceof ArrayBuffer) {
        resolve(event.target.result);
      } else {
        reject(
          new AudioExtractionError(
            "ファイルの読み込みに失敗しました",
            "PROCESSING_FAILED",
          ),
        );
      }
    };

    reader.onerror = () => {
      reject(
        new AudioExtractionError(
          "ファイルの読み込みに失敗しました",
          "PROCESSING_FAILED",
        ),
      );
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * AudioContext を使用して音声データをデコード
 */
export async function decodeAudioData(
  arrayBuffer: ArrayBuffer,
): Promise<AudioBuffer> {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  const audioContext = new AudioContextClass();

  try {
    return await audioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    throw new AudioExtractionError(
      "音声データのデコードに失敗しました",
      "PROCESSING_FAILED",
    );
  } finally {
    await audioContext.close();
  }
}

/**
 * 音声の切り抜き処理
 */
export async function extractAudioSegment(
  audioBuffer: AudioBuffer,
  options: AudioExtractionOptions = {},
): Promise<AudioBuffer> {
  const { startTime = 0, endTime = audioBuffer.duration } = options;

  // 時間の検証
  if (startTime < 0 || endTime > audioBuffer.duration || startTime >= endTime) {
    throw new AudioExtractionError(
      "無効な時間範囲が指定されました",
      "PROCESSING_FAILED",
    );
  }

  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.floor(startTime * sampleRate);
  const endSample = Math.floor(endTime * sampleRate);
  const frameCount = endSample - startSample;

  // OfflineAudioContext を使用して切り抜き
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    frameCount,
    sampleRate,
  );

  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start(0, startTime, endTime - startTime);

  try {
    return await offlineContext.startRendering();
  } catch (error) {
    throw new AudioExtractionError(
      "音声の切り抜きに失敗しました",
      "PROCESSING_FAILED",
    );
  }
}

/**
 * AudioBuffer を WAV 形式の Blob に変換
 */
export function audioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const length = audioBuffer.length * audioBuffer.numberOfChannels * 2;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;

  // WAV ヘッダーを書き込み
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + length, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, length, true);

  // 音声データを書き込み
  let offset = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < channels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const sample = Math.max(-1, Math.min(1, channelData[i] || 0));
      view.setInt16(offset, sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * MediaRecorder を使用して AudioBuffer を指定形式に変換
 */
export async function convertAudioFormat(
  audioBuffer: AudioBuffer,
  format: AudioFormat,
  bitrate = 128,
): Promise<Blob> {
  // MediaRecorder でサポートされる MIME タイプを取得
  const mimeTypeMap: Record<AudioFormat, string[]> = {
    opus: ["audio/webm;codecs=opus"],
    aac: ["audio/mp4;codecs=mp4a.40.2", "audio/aac"],
    mp3: ["audio/mpeg"],
    wav: ["audio/wav"],
    flac: ["audio/flac"],
  };

  const possibleMimeTypes = mimeTypeMap[format];
  let mimeType = "";

  // サポートされている MIME タイプを検索
  for (const type of possibleMimeTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      mimeType = type;
      break;
    }
  }

  // WAV は MediaRecorder を使わずに直接変換
  if (format === "wav" || !mimeType) {
    return audioBufferToWav(audioBuffer);
  }

  // MediaRecorder を使用して変換
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  const audioContext = new AudioContextClass();

  try {
    // AudioBuffer を再生用のソースに変換
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    // MediaStreamDestination を作成
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);

    // MediaRecorder を設定
    const mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType,
      audioBitsPerSecond: bitrate * 1000,
    });

    return new Promise((resolve, reject) => {
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: mimeType });
        resolve(finalBlob);
      };

      mediaRecorder.onerror = () => {
        reject(
          new AudioExtractionError(
            "音声変換に失敗しました",
            "PROCESSING_FAILED",
          ),
        );
      };

      // 録音開始
      mediaRecorder.start();
      source.start();

      // 音声の長さに応じて録音停止
      setTimeout(() => {
        mediaRecorder.stop();
        source.stop();
      }, audioBuffer.duration * 1000);
    });
  } finally {
    await audioContext.close();
  }
}

/**
 * ファイルの検証
 */
export function validateAudioFile(file: File): AudioFileUploadInfo {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedMimeTypes = [
    "audio/opus",
    "audio/aac",
    "audio/mpeg",
    "audio/wav",
    "audio/flac",
    "audio/webm",
    "audio/mp4",
  ];

  if (file.size > maxSize) {
    throw new AudioExtractionError(
      "ファイルサイズが10MBを超えています",
      "FILE_TOO_LARGE",
    );
  }

  if (!allowedMimeTypes.includes(file.type)) {
    throw new AudioExtractionError(
      "サポートされていないファイル形式です",
      "INVALID_FORMAT",
    );
  }

  // 仮の duration（実際の値は extractAudioMetadata で取得）
  return {
    fileName: file.name,
    fileSize: file.size,
    mimeType: (file.type === "audio/mp3" ? "audio/mpeg" : file.type) as
      | "audio/opus"
      | "audio/aac"
      | "audio/mpeg"
      | "audio/wav"
      | "audio/flac",
    duration: 0, // extractAudioMetadata で更新される
  };
}

/**
 * 音声処理のメインクラス
 */
export class AudioExtractor {
  private audioContext: AudioContext | null = null;

  constructor() {
    const support = checkAudioAPISupport();
    if (!support.supported) {
      throw new AudioExtractionError(
        "ブラウザがWeb Audio APIをサポートしていません",
        "BROWSER_NOT_SUPPORTED",
      );
    }
  }

  /**
   * 音声ファイルを処理して指定した形式で出力
   */
  async processAudioFile(
    file: File,
    options: AudioExtractionOptions = {},
  ): Promise<AudioExtractionResult> {
    // ファイル検証
    validateAudioFile(file);

    try {
      // ファイルを ArrayBuffer に変換
      const arrayBuffer = await fileToArrayBuffer(file);

      // 音声データをデコード
      const audioBuffer = await decodeAudioData(arrayBuffer);

      // 必要に応じて切り抜き
      const processedBuffer =
        options.startTime !== undefined || options.endTime !== undefined
          ? await extractAudioSegment(audioBuffer, options)
          : audioBuffer;

      // 指定形式に変換
      const outputFormat = options.outputFormat || "opus";
      const audioBlob = await convertAudioFormat(
        processedBuffer,
        outputFormat,
        options.bitrate,
      );

      return {
        audioBlob,
        duration: processedBuffer.duration,
        fileSize: audioBlob.size,
        format: outputFormat,
        sampleRate: processedBuffer.sampleRate,
      };
    } catch (error) {
      if (error instanceof AudioExtractionError) {
        throw error;
      }
      throw new AudioExtractionError(
        "音声処理中にエラーが発生しました",
        "PROCESSING_FAILED",
      );
    }
  }

  /**
   * 複数の音声形式で同時出力（Opus + AAC）
   */
  async processAudioFileMultiFormat(
    file: File,
    options: Omit<AudioExtractionOptions, "outputFormat"> = {},
  ): Promise<{
    opus: AudioExtractionResult;
    aac: AudioExtractionResult;
  }> {
    // 共通の AudioBuffer を作成
    validateAudioFile(file);
    const arrayBuffer = await fileToArrayBuffer(file);
    const audioBuffer = await decodeAudioData(arrayBuffer);

    const processedBuffer =
      options.startTime !== undefined || options.endTime !== undefined
        ? await extractAudioSegment(audioBuffer, options)
        : audioBuffer;

    // 並列で複数形式に変換
    const [opusBlob, aacBlob] = await Promise.all([
      convertAudioFormat(processedBuffer, "opus", options.bitrate),
      convertAudioFormat(processedBuffer, "aac", options.bitrate),
    ]);

    return {
      opus: {
        audioBlob: opusBlob,
        duration: processedBuffer.duration,
        fileSize: opusBlob.size,
        format: "opus",
        sampleRate: processedBuffer.sampleRate,
      },
      aac: {
        audioBlob: aacBlob,
        duration: processedBuffer.duration,
        fileSize: aacBlob.size,
        format: "aac",
        sampleRate: processedBuffer.sampleRate,
      },
    };
  }

  /**
   * リソースのクリーンアップ
   */
  async cleanup(): Promise<void> {
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }
}

/**
 * 音声処理のヘルパー関数（シンプルなAPIを提供）
 */
export async function extractAudio(
  file: File,
  options: AudioExtractionOptions = {},
): Promise<AudioExtractionResult> {
  const extractor = new AudioExtractor();
  try {
    return await extractor.processAudioFile(file, options);
  } finally {
    await extractor.cleanup();
  }
}

/**
 * 音声時間をフォーマット（秒 → mm:ss 形式）
 */
export function formatAudioDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * ファイルサイズをフォーマット
 */
export function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(1)}MB`;
  }
  const kb = bytes / 1024;
  return `${kb.toFixed(1)}KB`;
}
