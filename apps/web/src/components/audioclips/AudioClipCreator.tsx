"use client";

import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { useRef, useState } from "react";
import type { YouTubePlayer } from "../../components/videos/YouTubeEmbed";
import type { AudioClipCreateData } from "../../lib/audioclips/types";
import { useAuth } from "../../lib/firebase/AuthProvider";

interface AudioClipCreatorProps {
  videoId: string;
  videoTitle: string;
  onClipCreated: () => void;
  youtubePlayerRef?: React.RefObject<YouTubePlayer>;
}

/**
 * 音声クリップ作成コンポーネント
 *
 * 動画から特定の区間を選択して音声クリップを作成するフォーム
 */
export default function AudioClipCreator({
  videoId,
  videoTitle,
  onClipCreated,
  youtubePlayerRef,
}: AudioClipCreatorProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [phrase, setPhrase] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 現在の再生位置を取得
  const getCurrentTime = (): number => {
    if (youtubePlayerRef?.current) {
      return youtubePlayerRef.current.getCurrentTime();
    }
    return 0;
  };

  // 開始時間を設定
  const handleSetStartTime = () => {
    const currentTime = getCurrentTime();
    setStartTime(currentTime);

    // 終了時間が設定されていない、または開始時間より前の場合は更新
    if (endTime === null || endTime <= currentTime) {
      setEndTime(currentTime + 5); // デフォルトで5秒後を終了時間に
    }
  };

  // 終了時間を設定
  const handleSetEndTime = () => {
    const currentTime = getCurrentTime();

    // 開始時間が設定されていない場合は、現在時刻の5秒前を開始時間に
    if (startTime === null) {
      setStartTime(Math.max(0, currentTime - 5));
    }

    // 開始時間より後の場合のみ設定
    if (startTime !== null && currentTime > startTime) {
      setEndTime(currentTime);
    } else {
      setError("終了時間は開始時間より後に設定してください");
    }
  };

  // クリップをプレビュー
  const handlePreview = () => {
    if (youtubePlayerRef?.current && startTime !== null) {
      youtubePlayerRef.current.seekTo(startTime, true);
      youtubePlayerRef.current.playVideo();

      // 終了時間になったら一時停止
      if (endTime !== null) {
        const duration = endTime - startTime;
        setTimeout(() => {
          youtubePlayerRef.current?.pauseVideo();
        }, duration * 1000);
      }
    }
  };

  // タグを追加
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  // タグを削除
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // タグ入力でEnterキーを押した時の処理
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  // クリップを作成
  const handleCreateClip = async () => {
    if (!user) {
      setError("ログインが必要です");
      return;
    }

    if (!title) {
      setError("タイトルを入力してください");
      return;
    }

    if (startTime === null || endTime === null) {
      setError("開始時間と終了時間を設定してください");
      return;
    }

    if (endTime <= startTime) {
      setError("終了時間は開始時間より後に設定してください");
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const clipData: AudioClipCreateData = {
        videoId,
        title,
        phrase,
        startTime,
        endTime,
        userId: user.uid,
        userName: user.displayName || "名無しユーザー",
        userPhotoURL: user.photoURL || undefined,
        isPublic,
        tags,
      };

      // 直接Firestoreへアクセスする代わりにAPIエンドポイントを使用
      const response = await fetch("/api/audioclips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clipData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "音声クリップの作成に失敗しました");
      }

      // フォームをリセット
      setTitle("");
      setPhrase("");
      setStartTime(null);
      setEndTime(null);
      setTags([]);

      // 親コンポーネントに通知
      onClipCreated();
    } catch (error) {
      console.error("音声クリップの作成に失敗しました:", error);
      setError("音声クリップの作成に失敗しました");
    } finally {
      setIsCreating(false);
    }
  };

  // 時間を「分:秒」形式でフォーマット
  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="card bg-base-100 shadow-sm overflow-hidden w-full">
      <Disclosure>
        {({ open }) => (
          <>
            {/* ヘッダー部分（常に表示） */}
            <DisclosureButton className="w-full p-4 bg-primary bg-opacity-10 flex justify-between items-center text-left">
              <h3 className="text-lg font-semibold text-primary">
                音声クリップを作成
              </h3>
              <span className="text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={`transition-transform ${open ? "rotate-180" : ""}`}
                >
                  <title>{open ? "閉じるアイコン" : "開くアイコン"}</title>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </DisclosureButton>

            {/* フォーム部分（展開時のみ表示） */}
            <DisclosurePanel className="card-body">
              {!user && (
                <div className="alert alert-warning shadow-sm mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span>音声クリップを作成するにはログインが必要です</span>
                </div>
              )}

              {error && (
                <div className="alert alert-error shadow-sm mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div className="form-control mb-4">
                <label className="label" htmlFor="clip-title">
                  <span className="label-text">タイトル</span>
                </label>
                <input
                  id="clip-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`「${videoTitle}」からのクリップ`}
                  className="input input-bordered w-full"
                  disabled={!user || isCreating}
                />
              </div>

              <div className="form-control mb-4">
                <label className="label" htmlFor="clip-phrase">
                  <span className="label-text">フレーズ（オプション）</span>
                </label>
                <textarea
                  id="clip-phrase"
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  placeholder="クリップ内の発言内容など"
                  className="textarea textarea-bordered w-full"
                  rows={2}
                  disabled={!user || isCreating}
                />
              </div>

              <div className="flex flex-wrap gap-4 mb-4">
                <div>
                  <label
                    className="label"
                    id="start-time-label"
                    htmlFor="start-time"
                  >
                    <span className="label-text">開始時間</span>
                  </label>
                  <div className="join" aria-labelledby="start-time-label">
                    <span
                      id="start-time"
                      className="join-item px-3 py-2 bg-base-200 border border-base-300"
                    >
                      {formatTime(startTime)}
                    </span>
                    <button
                      type="button"
                      onClick={handleSetStartTime}
                      className="join-item btn btn-primary"
                      disabled={
                        !user || isCreating || !youtubePlayerRef?.current
                      }
                    >
                      現在位置を設定
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    className="label"
                    id="end-time-label"
                    htmlFor="end-time"
                  >
                    <span className="label-text">終了時間</span>
                  </label>
                  <div className="join" aria-labelledby="end-time-label">
                    <span
                      id="end-time"
                      className="join-item px-3 py-2 bg-base-200 border border-base-300"
                    >
                      {formatTime(endTime)}
                    </span>
                    <button
                      type="button"
                      onClick={handleSetEndTime}
                      className="join-item btn btn-primary"
                      disabled={
                        !user || isCreating || !youtubePlayerRef?.current
                      }
                    >
                      現在位置を設定
                    </button>
                  </div>
                </div>

                <div>
                  <div className="label">
                    <span className="label-text" id="preview-label">プレビュー</span>
                  </div>
                  <button
                    aria-labelledby="preview-label"
                    type="button"
                    onClick={handlePreview}
                    className="btn btn-success"
                    disabled={
                      !user ||
                      isCreating ||
                      startTime === null ||
                      !youtubePlayerRef?.current
                    }
                  >
                    選択範囲を再生
                  </button>
                </div>
              </div>

              <div className="form-control mb-4">
                <label className="label" htmlFor="clip-tags">
                  <span className="label-text">タグ（オプション）</span>
                </label>
                <div className="join w-full">
                  <input
                    id="clip-tags"
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="タグを入力（Enterで追加）"
                    className="join-item input input-bordered flex-grow"
                    disabled={!user || isCreating}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="join-item btn btn-neutral"
                    disabled={!user || isCreating || !tagInput.trim()}
                  >
                    追加
                  </button>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <div key={tag} className="badge badge-primary gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="btn btn-xs btn-circle btn-ghost"
                          aria-label={`${tag}タグを削除`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-control mb-4">
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="checkbox checkbox-primary"
                    disabled={!user || isCreating}
                  />
                  <span className="label-text">公開する（全員が視聴可能）</span>
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCreateClip}
                  disabled={
                    !user ||
                    isCreating ||
                    !title ||
                    startTime === null ||
                    endTime === null
                  }
                  className={`btn btn-primary ${isCreating ? "loading" : ""}`}
                >
                  {isCreating ? "作成中..." : "クリップを作成"}
                </button>
              </div>
            </DisclosurePanel>
          </>
        )}
      </Disclosure>
    </div>
  );
}
