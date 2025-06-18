"use client";

import {
  AudioExtractionError,
  type AudioExtractionOptions,
  type AudioExtractionResult,
  extractAudio,
  extractAudioMetadata,
  formatAudioDuration,
  formatFileSize,
  validateAudioFile,
} from "@/lib/audio-extractor";
import type {
  AudioFileUploadInfo,
  AudioFormat,
} from "@suzumina.click/shared-types";
import { Alert, AlertDescription } from "@suzumina.click/ui/components/alert";
import { Button } from "@suzumina.click/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@suzumina.click/ui/components/card";
import { Progress } from "@suzumina.click/ui/components/progress";
import {
  AlertTriangle,
  CheckCircle,
  FileAudio,
  Pause,
  Play,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface AudioUploaderProps {
  onFileProcessed?: (
    result: AudioExtractionResult & { uploadInfo: AudioFileUploadInfo },
  ) => void;
  onError?: (error: string) => void;
  maxFileSize?: number; // バイト数（デフォルト: 10MB）
  maxDuration?: number; // 秒数（デフォルト: 300秒）
  acceptedFormats?: AudioFormat[];
  extractionOptions?: AudioExtractionOptions;
  disabled?: boolean;
}

interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  stage: "upload" | "validation" | "extraction" | "complete" | "error";
  message: string;
}

interface AudioPreview {
  file: File;
  metadata: {
    duration: number;
    fileSize: number;
    mimeType: string;
  };
  audioUrl: string;
  isPlaying: boolean;
}

export function AudioUploader({
  onFileProcessed,
  onError,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  maxDuration = 300, // 5分
  acceptedFormats = ["opus", "aac", "mp3", "wav", "flac"],
  extractionOptions = { outputFormat: "opus", bitrate: 128 },
  disabled = false,
}: AudioUploaderProps) {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    stage: "upload",
    message: "",
  });
  const [audioPreview, setAudioPreview] = useState<AudioPreview | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [processedResult, setProcessedResult] = useState<
    (AudioExtractionResult & { uploadInfo: AudioFileUploadInfo }) | null
  >(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // ファイル処理のメイン関数
  const processAudioFile = useCallback(
    async (file: File) => {
      setProcessingState({
        isProcessing: true,
        progress: 0,
        stage: "validation",
        message: "ファイルを検証しています...",
      });

      try {
        // 1. ファイル検証
        const uploadInfo = validateAudioFile(file);

        // サイズ制限チェック
        if (file.size > maxFileSize) {
          throw new AudioExtractionError(
            `ファイルサイズが制限を超えています（最大: ${formatFileSize(maxFileSize)}）`,
            "FILE_TOO_LARGE",
          );
        }

        setProcessingState((prev) => ({
          ...prev,
          progress: 20,
          message: "音声メタデータを抽出しています...",
        }));

        // 2. 音声メタデータ抽出
        const metadata = await extractAudioMetadata(file);

        // 時間制限チェック
        if (metadata.duration > maxDuration) {
          throw new AudioExtractionError(
            `音声の長さが制限を超えています（最大: ${formatAudioDuration(maxDuration)}）`,
            "PROCESSING_FAILED",
          );
        }

        // uploadInfoを実際のメタデータで更新
        const updatedUploadInfo: AudioFileUploadInfo = {
          ...uploadInfo,
          duration: metadata.duration,
        };

        setProcessingState((prev) => ({
          ...prev,
          progress: 40,
          stage: "extraction",
          message: "音声を処理しています...",
        }));

        // 3. プレビュー用のURL生成
        const audioUrl = URL.createObjectURL(file);
        setAudioPreview({
          file,
          metadata: {
            duration: metadata.duration,
            fileSize: file.size,
            mimeType: file.type,
          },
          audioUrl,
          isPlaying: false,
        });

        setProcessingState((prev) => ({
          ...prev,
          progress: 60,
          message: "音声形式を変換しています...",
        }));

        // 4. 音声処理（必要に応じて形式変換）
        const result = await extractAudio(file, extractionOptions);

        setProcessingState((prev) => ({
          ...prev,
          progress: 90,
          message: "処理を完了しています...",
        }));

        const finalResult = {
          ...result,
          uploadInfo: updatedUploadInfo,
        };

        setProcessedResult(finalResult);

        setProcessingState({
          isProcessing: false,
          progress: 100,
          stage: "complete",
          message: "処理が完了しました",
        });

        onFileProcessed?.(finalResult);
      } catch (error) {
        console.error("音声ファイル処理エラー:", error);

        const errorMessage =
          error instanceof AudioExtractionError
            ? error.message
            : "音声ファイルの処理中にエラーが発生しました";

        setProcessingState({
          isProcessing: false,
          progress: 0,
          stage: "error",
          message: errorMessage,
        });

        onError?.(errorMessage);

        // プレビューをクリア
        if (audioPreview?.audioUrl) {
          URL.revokeObjectURL(audioPreview.audioUrl);
        }
        setAudioPreview(null);
      }
    },
    [
      maxFileSize,
      maxDuration,
      extractionOptions,
      onFileProcessed,
      onError,
      audioPreview?.audioUrl,
    ],
  );

  // ドラッグ&ドロップ処理
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setDragOver(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      if (disabled || processingState.isProcessing) return;

      const files = Array.from(e.dataTransfer.files);
      const audioFile = files.find((file) => file.type.startsWith("audio/"));

      if (audioFile) {
        processAudioFile(audioFile);
      } else {
        onError?.("音声ファイルをドロップしてください");
      }
    },
    [disabled, processingState.isProcessing, processAudioFile, onError],
  );

  // ファイル選択処理
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && !disabled && !processingState.isProcessing) {
        processAudioFile(file);
      }
    },
    [disabled, processingState.isProcessing, processAudioFile],
  );

  // 音声プレビュー制御
  const toggleAudioPreview = useCallback(() => {
    if (!audioRef.current || !audioPreview) return;

    if (audioPreview.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }

    setAudioPreview((prev) =>
      prev ? { ...prev, isPlaying: !prev.isPlaying } : null,
    );
  }, [audioPreview]);

  // リセット処理
  const handleReset = useCallback(() => {
    if (audioPreview?.audioUrl) {
      URL.revokeObjectURL(audioPreview.audioUrl);
    }
    setAudioPreview(null);
    setProcessedResult(null);
    setProcessingState({
      isProcessing: false,
      progress: 0,
      stage: "upload",
      message: "",
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [audioPreview?.audioUrl]);

  return (
    <Card className="border-2 border-dashed border-border transition-colors duration-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileAudio className="h-5 w-5" />
          音声ファイルのアップロード
        </CardTitle>
        <CardDescription id="upload-description">
          対応形式: MP3, AAC, Opus, WAV, FLAC（最大{formatFileSize(maxFileSize)}
          、{formatAudioDuration(maxDuration)}以内）
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ドラッグ&ドロップエリア */}
        <button
          type="button"
          className={`
            w-full relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
            ${dragOver ? "border-primary bg-muted" : "border-border"}
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-muted-foreground"}
            ${processingState.isProcessing ? "pointer-events-none" : ""}
          `}
          disabled={disabled || processingState.isProcessing}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() =>
            !disabled &&
            !processingState.isProcessing &&
            fileInputRef.current?.click()
          }
          aria-label="音声ファイルを選択またはドラッグ&ドロップ"
          aria-describedby="upload-description"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || processingState.isProcessing}
          />

          <div className="space-y-4">
            {processingState.stage === "upload" && (
              <>
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium text-foreground">
                    音声ファイルをドロップするか、クリックして選択
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    または下のボタンからファイルを選択してください
                  </p>
                </div>
              </>
            )}

            {processingState.isProcessing && (
              <>
                <FileAudio className="mx-auto h-12 w-12 text-primary animate-pulse" />
                <div>
                  <p className="text-lg font-medium text-foreground">
                    {processingState.message}
                  </p>
                  <Progress
                    value={processingState.progress}
                    className="mt-2"
                    aria-label="処理進行状況"
                  />
                </div>
              </>
            )}

            {processingState.stage === "complete" && (
              <>
                <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
                <output
                  className="text-lg font-medium text-green-700"
                  aria-live="polite"
                >
                  {processingState.message}
                </output>
              </>
            )}

            {processingState.stage === "error" && (
              <>
                <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                <p
                  className="text-lg font-medium text-destructive"
                  role="alert"
                  aria-live="assertive"
                >
                  処理に失敗しました
                </p>
              </>
            )}
          </div>
        </button>

        {/* エラー表示 */}
        {processingState.stage === "error" && (
          <Alert
            className="border-destructive/20 bg-destructive/5"
            role="alert"
          >
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              {processingState.message}
            </AlertDescription>
          </Alert>
        )}

        {/* 音声プレビュー */}
        {audioPreview && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">プレビュー</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {audioPreview.file.name}
                  </p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>
                      時間:{" "}
                      {formatAudioDuration(audioPreview.metadata.duration)}
                    </span>
                    <span>
                      サイズ: {formatFileSize(audioPreview.metadata.fileSize)}
                    </span>
                    <span>形式: {audioPreview.metadata.mimeType}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={toggleAudioPreview}
                    className="h-8 w-8 p-0"
                  >
                    {audioPreview.isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReset}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <audio
                ref={audioRef}
                src={audioPreview.audioUrl}
                onPlay={() =>
                  setAudioPreview((prev) =>
                    prev ? { ...prev, isPlaying: true } : null,
                  )
                }
                onPause={() =>
                  setAudioPreview((prev) =>
                    prev ? { ...prev, isPlaying: false } : null,
                  )
                }
                onEnded={() =>
                  setAudioPreview((prev) =>
                    prev ? { ...prev, isPlaying: false } : null,
                  )
                }
                className="w-full"
                controls
              >
                <track kind="captions" />
              </audio>
            </CardContent>
          </Card>
        )}

        {/* ファイル選択ボタン */}
        {!audioPreview && !processingState.isProcessing && (
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            ファイルを選択
          </Button>
        )}

        {/* 処理結果情報 */}
        {processedResult && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-800">
                処理完了
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-xs text-green-700">
                <div>
                  <span className="font-medium">出力形式:</span>{" "}
                  {processedResult.format.toUpperCase()}
                </div>
                <div>
                  <span className="font-medium">ファイルサイズ:</span>{" "}
                  {formatFileSize(processedResult.fileSize)}
                </div>
                <div>
                  <span className="font-medium">時間:</span>{" "}
                  {formatAudioDuration(processedResult.duration)}
                </div>
                <div>
                  <span className="font-medium">サンプルレート:</span>{" "}
                  {processedResult.sampleRate}Hz
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* リセットボタン */}
        {(audioPreview || processedResult) && (
          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full"
            disabled={disabled || processingState.isProcessing}
          >
            <X className="h-4 w-4 mr-2" />
            リセット
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
