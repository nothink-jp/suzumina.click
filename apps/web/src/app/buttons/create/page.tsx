"use client";

import type { AudioExtractionResult } from "@/lib/audio-extractor";
import dynamic from "next/dynamic";

// AudioUploaderを動的読み込み（遅延読み込み）
const AudioUploader = dynamic(
  () =>
    import("@/components/AudioUploader").then((mod) => ({
      default: mod.AudioUploader,
    })),
  {
    loading: () => (
      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center animate-pulse">
        <div className="space-y-4">
          <div className="h-12 w-12 mx-auto bg-muted rounded-full" />
          <div className="h-4 bg-muted rounded w-48 mx-auto" />
          <div className="h-3 bg-muted rounded w-32 mx-auto" />
        </div>
      </div>
    ),
    ssr: false, // クライアントサイドでのみ読み込み
  },
);
import type {
  AudioButtonCategory,
  AudioFileUploadInfo,
  CreateAudioButtonInput,
} from "@suzumina.click/shared-types";
import { Alert, AlertDescription } from "@suzumina.click/ui/components/alert";
import { Badge } from "@suzumina.click/ui/components/badge";
import { Button } from "@suzumina.click/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@suzumina.click/ui/components/card";
import { Input } from "@suzumina.click/ui/components/input";
import { Label } from "@suzumina.click/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@suzumina.click/ui/components/select";
import { Textarea } from "@suzumina.click/ui/components/textarea";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Save,
  Tag,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useState } from "react";
import { createAudioButton, uploadAudioFile } from "../actions";

const CATEGORIES: { value: AudioButtonCategory; label: string }[] = [
  { value: "voice", label: "ボイス" },
  { value: "bgm", label: "BGM・音楽" },
  { value: "se", label: "効果音" },
  { value: "talk", label: "トーク・会話" },
  { value: "singing", label: "歌唱" },
  { value: "other", label: "その他" },
];

const SUGGESTED_TAGS = [
  "挨拶",
  "感謝",
  "お礼",
  "応援",
  "励まし",
  "慰め",
  "優しさ",
  "朝",
  "夜",
  "おやすみ",
  "お疲れ様",
  "がんばって",
  "大丈夫",
  "かわいい",
  "おもしろい",
  "癒し",
  "元気",
  "笑い",
  "驚き",
];

interface FormData {
  title: string;
  description: string;
  category: AudioButtonCategory | "";
  tags: string[];
  sourceVideoId: string;
  startTime: number | undefined;
  endTime: number | undefined;
  isPublic: boolean;
}

interface ProcessedAudio {
  result: AudioExtractionResult;
  uploadInfo: AudioFileUploadInfo;
}

function CreateAudioButtonForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoId = searchParams.get("video_id");

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    category: "",
    tags: [],
    sourceVideoId: videoId || "",
    startTime: undefined,
    endTime: undefined,
    isPublic: true,
  });

  const [newTag, setNewTag] = useState("");
  const [processedAudio, setProcessedAudio] = useState<ProcessedAudio | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // フォーム更新
  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // タグ追加
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (
      trimmedTag &&
      !formData.tags.includes(trimmedTag) &&
      formData.tags.length < 10
    ) {
      updateFormData({ tags: [...formData.tags, trimmedTag] });
    }
  };

  // タグ削除
  const removeTag = (tagToRemove: string) => {
    updateFormData({
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  // 新しいタグ追加
  const handleAddNewTag = () => {
    if (newTag.trim()) {
      addTag(newTag);
      setNewTag("");
    }
  };

  // 音声ファイル処理完了時
  const handleAudioProcessed = (
    result: AudioExtractionResult & { uploadInfo: AudioFileUploadInfo },
  ) => {
    setProcessedAudio({
      result,
      uploadInfo: result.uploadInfo,
    });
    setSubmitStatus({ type: null, message: "" });
  };

  // 音声処理エラー時
  const handleAudioError = (error: string) => {
    setSubmitStatus({ type: "error", message: error });
    setProcessedAudio(null);
  };

  // フォーム送信
  const handleSubmit = async () => {
    if (!processedAudio || !formData.category) return;

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      // 1. 音声ファイルをアップロード
      const formDataForUpload = new FormData();
      formDataForUpload.append("audioFile", processedAudio.result.audioBlob);

      const uploadResult = await uploadAudioFile(
        formDataForUpload,
        processedAudio.uploadInfo,
      );

      if (!uploadResult.success || !uploadResult.data) {
        throw new Error(
          uploadResult.error || "音声ファイルのアップロードに失敗しました",
        );
      }

      // 2. 音声ボタンを作成
      const createInput: CreateAudioButtonInput = {
        title: formData.title,
        description: formData.description || undefined,
        category: formData.category as AudioButtonCategory,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        sourceVideoId: formData.sourceVideoId || undefined,
        startTime: formData.startTime,
        endTime: formData.endTime,
        isPublic: formData.isPublic,
      };

      const createResult = await createAudioButton(createInput, {
        audioUrl: uploadResult.data.audioUrl,
        duration: uploadResult.data.duration,
        fileSize: processedAudio.result.fileSize,
        format: processedAudio.result.format,
      });

      if (!createResult.success || !createResult.data) {
        throw new Error(createResult.error || "音声ボタンの作成に失敗しました");
      }

      setSubmitStatus({
        type: "success",
        message: "音声ボタンが正常に作成されました！",
      });

      // 3秒後に音声ボタン詳細ページに遷移
      setTimeout(() => {
        router.push(`/buttons/${createResult.data?.id}`);
      }, 3000);
    } catch (error) {
      console.error("音声ボタン作成エラー:", error);
      setSubmitStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "音声ボタンの作成に失敗しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 送信可能かどうかの判定
  const canSubmit =
    processedAudio &&
    formData.title.trim() &&
    formData.category &&
    !isSubmitting &&
    submitStatus.type !== "success";

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* ページヘッダー */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/buttons" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              音声ボタン一覧に戻る
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          音声ボタンを作成
        </h1>
        <p className="text-muted-foreground">
          音声ファイルをアップロードして、新しい音声ボタンを作成しましょう
        </p>
      </div>

      {/* ステータス表示 */}
      {submitStatus.type && (
        <Alert
          className={`mb-6 ${
            submitStatus.type === "success"
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          {submitStatus.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription
            className={
              submitStatus.type === "success"
                ? "text-green-800"
                : "text-red-800"
            }
          >
            {submitStatus.message}
            {submitStatus.type === "success" && (
              <p className="mt-1 text-sm">
                音声ボタン詳細ページに移動します...
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左側: 音声アップロード */}
        <div className="space-y-6">
          <AudioUploader
            onFileProcessed={handleAudioProcessed}
            onError={handleAudioError}
            maxFileSize={10 * 1024 * 1024} // 10MB
            maxDuration={300} // 5分
            extractionOptions={{
              outputFormat: "opus",
              bitrate: 128,
            }}
            disabled={isSubmitting || submitStatus.type === "success"}
          />
        </div>

        {/* 右側: フォーム */}
        <div className="space-y-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
              <CardDescription>
                音声ボタンの基本的な情報を入力してください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* タイトル */}
              <div>
                <Label htmlFor="title">タイトル *</Label>
                <Input
                  id="title"
                  placeholder="例: おはよう！"
                  value={formData.title}
                  onChange={(e) => updateFormData({ title: e.target.value })}
                  maxLength={100}
                  disabled={isSubmitting || submitStatus.type === "success"}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.title.length}/100 文字
                </p>
              </div>

              {/* カテゴリ */}
              <div>
                <Label htmlFor="category">カテゴリ *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    updateFormData({ category: value as AudioButtonCategory })
                  }
                  disabled={isSubmitting || submitStatus.type === "success"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="カテゴリを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 説明 */}
              <div>
                <Label htmlFor="description">説明（任意）</Label>
                <Textarea
                  id="description"
                  placeholder="この音声ボタンについての説明..."
                  value={formData.description}
                  onChange={(e) =>
                    updateFormData({ description: e.target.value })
                  }
                  rows={3}
                  maxLength={500}
                  disabled={isSubmitting || submitStatus.type === "success"}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.description.length}/500 文字
                </p>
              </div>
            </CardContent>
          </Card>

          {/* タグ */}
          <Card>
            <CardHeader>
              <CardTitle>タグ</CardTitle>
              <CardDescription>
                音声ボタンを見つけやすくするためのタグを追加してください（最大10個）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 新しいタグ追加 */}
              <div className="flex gap-2">
                <Input
                  placeholder="タグを入力"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddNewTag()}
                  maxLength={20}
                  disabled={
                    formData.tags.length >= 10 ||
                    isSubmitting ||
                    submitStatus.type === "success"
                  }
                />
                <Button
                  onClick={handleAddNewTag}
                  variant="outline"
                  size="sm"
                  disabled={
                    !newTag.trim() ||
                    formData.tags.length >= 10 ||
                    isSubmitting ||
                    submitStatus.type === "success"
                  }
                >
                  追加
                </Button>
              </div>

              {/* 追加済みタグ */}
              {formData.tags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">追加済みタグ:</p>
                  <div className="flex flex-wrap gap-1">
                    {formData.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-red-500"
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 推奨タグ */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">推奨タグ:</p>
                <div className="flex flex-wrap gap-1">
                  {SUGGESTED_TAGS.filter((tag) => !formData.tags.includes(tag))
                    .slice(0, 10)
                    .map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => addTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 元動画情報（オプション） */}
          {videoId && (
            <Card>
              <CardHeader>
                <CardTitle>元動画情報</CardTitle>
                <CardDescription>
                  この音声ボタンの元となった動画の情報
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="sourceVideoId">動画ID</Label>
                  <Input
                    id="sourceVideoId"
                    value={formData.sourceVideoId}
                    onChange={(e) =>
                      updateFormData({ sourceVideoId: e.target.value })
                    }
                    placeholder="YouTube動画ID"
                    disabled={isSubmitting || submitStatus.type === "success"}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">開始時間（秒）</Label>
                    <Input
                      id="startTime"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.startTime || ""}
                      onChange={(e) =>
                        updateFormData({
                          startTime: e.target.value
                            ? Number.parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                      placeholder="0"
                      disabled={isSubmitting || submitStatus.type === "success"}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">終了時間（秒）</Label>
                    <Input
                      id="endTime"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.endTime || ""}
                      onChange={(e) =>
                        updateFormData({
                          endTime: e.target.value
                            ? Number.parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                      placeholder="5"
                      disabled={isSubmitting || submitStatus.type === "success"}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 作成ボタン */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1"
              asChild
              disabled={isSubmitting || submitStatus.type === "success"}
            >
              <Link href="/buttons">キャンセル</Link>
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {isSubmitting ? (
                <>処理中...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  音声ボタンを作成
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateAudioButtonPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="mt-2 text-muted-foreground">読み込み中...</p>
          </div>
        </div>
      }
    >
      <CreateAudioButtonForm />
    </Suspense>
  );
}
