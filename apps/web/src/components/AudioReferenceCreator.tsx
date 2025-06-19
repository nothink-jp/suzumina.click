'use client';

import { createAudioReference } from '@/app/buttons/actions';
import { AudioReferenceCard } from '@/components/AudioReferenceCard';
import { YouTubePlayer, useYouTubePlayer } from '@/components/YouTubePlayer';
import type {
  AudioReferenceCategory,
  CreateAudioReferenceInput,
} from '@suzumina.click/shared-types';
import { Button } from '@suzumina.click/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@suzumina.click/ui/components/card';
import { Input } from '@suzumina.click/ui/components/input';
import { Label } from '@suzumina.click/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@suzumina.click/ui/components/select';
import { Slider } from '@suzumina.click/ui/components/slider';
import { Textarea } from '@suzumina.click/ui/components/textarea';
import {
  Clock,
  Loader2,
  MapPin,
  Play,
  Plus,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface AudioReferenceCreatorProps {
  videoId?: string;
  videoTitle?: string;
  videoDuration?: number;
  initialStartTime?: number;
}

// タグ入力コンポーネント
function TagInput({
  tags,
  onChange,
  placeholder = 'タグを入力...',
  maxTags = 10,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}) {
  const [inputValue, setInputValue] = useState('');

  const addTag = useCallback((tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < maxTags) {
      onChange([...tags, trimmedTag]);
    }
    setInputValue('');
  }, [tags, onChange, maxTags]);

  const removeTag = useCallback((tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  }, [tags, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    }
  }, [addTag, inputValue]);

  return (
    <div className="space-y-2">
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(inputValue)}
        placeholder={placeholder}
        disabled={tags.length >= maxTags}
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-sm rounded-md"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-primary/70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {tags.length}/{maxTags} タグ（Enterまたはカンマで追加）
      </p>
    </div>
  );
}

// 時間フォーマット関数
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export default function AudioReferenceCreator({
  videoId: initialVideoId,
  videoTitle: initialVideoTitle,
  videoDuration: initialVideoDuration,
  initialStartTime = 0,
}: AudioReferenceCreatorProps) {
  const router = useRouter();
  
  // YouTube URL入力用の状態
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoId, setVideoId] = useState(initialVideoId || '');
  const [videoTitle, setVideoTitle] = useState(initialVideoTitle || '');
  const [videoDuration, setVideoDuration] = useState(initialVideoDuration || 0);
  
  // 音声ボタン情報の状態
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialStartTime + 5);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AudioReferenceCategory>('other');
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  
  // UI状態
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  
  // YouTube Playerの参照
  const [playerInstance, setPlayerInstance] = useState<any>(null);

  // YouTube URL からビデオIDを抽出
  const extractVideoId = useCallback((url: string): string | null => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }, []);

  // YouTube URL の処理
  const handleYouTubeUrlSubmit = useCallback(async () => {
    const extractedVideoId = extractVideoId(youtubeUrl);
    if (!extractedVideoId) {
      setError('有効なYouTube URLを入力してください');
      return;
    }
    
    setVideoId(extractedVideoId);
    setError(null);
    // ここで必要に応じてYouTube Data APIから動画情報を取得できます
  }, [youtubeUrl, extractVideoId]);

  // プレイヤーの準備完了時
  const handlePlayerReady = useCallback((player: any) => {
    setPlayerInstance(player);
    
    if (player) {
      const duration = player.getDuration();
      setVideoDuration(duration);
      
      // 動画タイトルの取得（可能な場合）
      try {
        const data = player.getVideoData();
        if (data?.title) {
          setVideoTitle(data.title);
        }
      } catch (e) {
        // エラーは無視（タイトル取得は必須ではない）
      }
    }
  }, []);

  // 時間更新の処理
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  // 現在時間を開始時間に設定
  const setCurrentTimeAsStart = useCallback(() => {
    if (playerInstance) {
      const time = Math.floor(currentTime);
      setStartTime(time);
      setEndTime(Math.min(time + 5, videoDuration));
    }
  }, [playerInstance, currentTime, videoDuration]);

  // 選択範囲をプレビュー再生
  const previewRange = useCallback(() => {
    if (playerInstance && startTime < endTime) {
      playerInstance.seekTo(startTime);
      playerInstance.playVideo();
      
      // 終了時間で停止
      const timeoutId = setTimeout(() => {
        if (playerInstance) {
          playerInstance.pauseVideo();
        }
      }, (endTime - startTime) * 1000);

      // クリーンアップ用にタイムアウトIDを保存（必要に応じて）
      return () => clearTimeout(timeoutId);
    }
  }, [playerInstance, startTime, endTime]);

  // バリデーション
  const isValidInput = useCallback(() => {
    return (
      videoId.trim() !== '' &&
      title.trim() !== '' &&
      startTime < endTime &&
      (endTime - startTime) <= 30 &&
      (endTime - startTime) >= 1
    );
  }, [videoId, title, startTime, endTime]);

  // 音声ボタン作成
  const handleCreate = useCallback(async () => {
    if (!isValidInput()) {
      setError('入力内容を確認してください');
      return;
    }

    setIsCreating(true);
    setError(null);
    
    try {
      const input: CreateAudioReferenceInput = {
        videoId: videoId.trim(),
        title: title.trim(),
        startTime,
        endTime,
        category,
        tags: tags.filter(tag => tag.trim() !== ''),
        description: description.trim() || undefined,
      };

      const result = await createAudioReference(input);
      
      if (result.success) {
        // 成功時は詳細ページまたは一覧ページにリダイレクト
        router.push(`/buttons?created=${result.data.id}`);
      } else {
        setError(result.error || '作成に失敗しました');
      }
    } catch (error) {
      console.error('作成エラー:', error);
      setError('予期しないエラーが発生しました');
    } finally {
      setIsCreating(false);
    }
  }, [isValidInput, videoId, title, startTime, endTime, category, tags, description, router]);

  // 初期化時の処理
  useEffect(() => {
    if (initialVideoId) {
      setYoutubeUrl(`https://www.youtube.com/watch?v=${initialVideoId}`);
    }
  }, [initialVideoId]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ページヘッダー */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">音声ボタンを作成</h1>
        <p className="text-muted-foreground mt-2">
          YouTube動画のタイムスタンプを参照して、新しい音声ボタンを作成しましょう
        </p>
      </div>

      {/* エラー表示 */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* YouTube URL入力 */}
      {!videoId && (
        <Card>
          <CardHeader>
            <CardTitle>YouTube動画を選択</CardTitle>
            <CardDescription>
              音声ボタンを作成したいYouTube動画のURLを入力してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1"
              />
              <Button onClick={handleYouTubeUrlSubmit} disabled={!youtubeUrl}>
                読み込み
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              例: https://www.youtube.com/watch?v=dQw4w9WgXcQ
            </p>
          </CardContent>
        </Card>
      )}

      {/* YouTube Player */}
      {videoId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              対象動画
              {videoTitle && <span className="text-sm font-normal text-muted-foreground">{videoTitle}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <YouTubePlayer
              videoId={videoId}
              onReady={handlePlayerReady}
              onTimeUpdate={handleTimeUpdate}
              width="100%"
              height="400"
              controls
              autoplay={false}
            />
            <div className="mt-2 text-sm text-muted-foreground">
              現在時間: {formatTime(Math.floor(currentTime))} / {formatTime(videoDuration)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* タイムスタンプ選択 */}
      {videoId && videoDuration > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>タイムスタンプ選択</CardTitle>
            <CardDescription>
              音声ボタンにしたい部分の開始・終了時間を指定してください（最大30秒）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 開始時間 */}
            <div>
              <Label className="text-sm font-medium">
                開始時間: {formatTime(startTime)}
              </Label>
              <Slider
                value={[startTime]}
                onValueChange={([value]) => {
                  setStartTime(value);
                  if (value >= endTime) {
                    setEndTime(Math.min(value + 5, videoDuration));
                  }
                }}
                max={videoDuration}
                step={1}
                className="mt-2"
              />
            </div>

            {/* 終了時間 */}
            <div>
              <Label className="text-sm font-medium">
                終了時間: {formatTime(endTime)}
              </Label>
              <Slider
                value={[endTime]}
                onValueChange={([value]) => setEndTime(value)}
                min={startTime + 1}
                max={Math.min(startTime + 30, videoDuration)}
                step={1}
                className="mt-2"
              />
            </div>

            {/* コントロールボタン */}
            <div className="flex gap-3">
              <Button onClick={setCurrentTimeAsStart} variant="outline" size="sm">
                <MapPin className="h-4 w-4 mr-2" />
                現在時間を開始に
              </Button>
              <Button onClick={previewRange} variant="outline" size="sm">
                <Play className="h-4 w-4 mr-2" />
                範囲プレビュー
              </Button>
            </div>

            {/* 情報表示 */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                選択範囲: {formatTime(startTime)} - {formatTime(endTime)} 
                ({endTime - startTime}秒)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* メタデータ入力 */}
      {videoId && (
        <Card>
          <CardHeader>
            <CardTitle>音声ボタン情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* タイトル */}
            <div>
              <Label htmlFor="title">タイトル *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: おはようございます"
                maxLength={50}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {title.length}/50文字
              </p>
            </div>

            {/* カテゴリ */}
            <div>
              <Label>カテゴリ</Label>
              <Select value={category} onValueChange={(value: AudioReferenceCategory) => setCategory(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="voice">ボイス</SelectItem>
                  <SelectItem value="bgm">BGM</SelectItem>
                  <SelectItem value="se">効果音</SelectItem>
                  <SelectItem value="talk">トーク</SelectItem>
                  <SelectItem value="singing">歌唱</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* タグ */}
            <div>
              <Label>タグ</Label>
              <div className="mt-1">
                <TagInput
                  tags={tags}
                  onChange={setTags}
                  placeholder="タグを入力..."
                  maxTags={10}
                />
              </div>
            </div>

            {/* 説明 */}
            <div>
              <Label htmlFor="description">説明（任意）</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="この音声ボタンの説明..."
                maxLength={200}
                rows={3}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {description.length}/200文字
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* プレビュー */}
      {videoId && title && (
        <Card>
          <CardHeader>
            <CardTitle>プレビュー</CardTitle>
          </CardHeader>
          <CardContent>
            <AudioReferenceCard
              audioReference={{
                id: 'preview',
                title: title || '(タイトルなし)',
                videoId,
                videoTitle: videoTitle || '動画タイトル',
                startTime,
                endTime,
                duration: endTime - startTime,
                category,
                tags,
                description,
                createdBy: 'anonymous',
                createdAt: new Date(),
                updatedAt: new Date(),
                playCount: 0,
                likeCount: 0,
                isPublic: true,
              }}
              showSourceVideo={true}
              size="md"
              variant="default"
              isPreview={true}
            />
          </CardContent>
        </Card>
      )}

      {/* 作成ボタン */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/buttons">
            キャンセル
          </Link>
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!isValidInput() || isCreating}
          className="min-w-[200px]"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              作成中...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              音声ボタンを作成
            </>
          )}
        </Button>
      </div>
    </div>
  );
}