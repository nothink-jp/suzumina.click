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
  const [isExpanded, setIsExpanded] = useState(false);

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
      setIsExpanded(false);

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

  // フォームの展開/折りたたみを切り替え
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6 overflow-hidden">
      {/* ヘッダー部分（常に表示） */}
      <div
        className="w-full p-4 bg-blue-50 flex justify-between items-center cursor-pointer text-left"
        onClick={toggleExpand}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            toggleExpand();
          }
        }}
        tabIndex={0}
        // biome-ignore lint/a11y/useSemanticElements: <explanation>
        role="button"
        aria-expanded={isExpanded}
      >
        <h3 className="text-lg font-semibold text-blue-800">
          音声クリップを作成
        </h3>
        <span className="text-blue-500" aria-hidden="true">
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
            className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
          >
            <title>{isExpanded ? "閉じるアイコン" : "開くアイコン"}</title>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>

      {/* フォーム部分（展開時のみ表示） */}
      {isExpanded && (
        <div className="p-4">
          {!user && (
            <div className="bg-yellow-100 p-3 rounded mb-4">
              <p className="text-yellow-800">
                音声クリップを作成するにはログインが必要です
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-100 p-3 rounded mb-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="clip-title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              タイトル
            </label>
            <input
              id="clip-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`「${videoTitle}」からのクリップ`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={!user || isCreating}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="clip-phrase"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              フレーズ（オプション）
            </label>
            <textarea
              id="clip-phrase"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="クリップ内の発言内容など"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              disabled={!user || isCreating}
            />
          </div>

          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <div
                className="block text-sm font-medium text-gray-700 mb-1"
                id="start-time-label"
              >
                開始時間
              </div>
              <div
                className="flex items-center"
                aria-labelledby="start-time-label"
              >
                <span className="bg-gray-100 px-3 py-2 rounded-l-md border border-r-0 border-gray-300">
                  {formatTime(startTime)}
                </span>
                <button
                  type="button"
                  onClick={handleSetStartTime}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-r-md transition-colors"
                  disabled={!user || isCreating || !youtubePlayerRef?.current}
                >
                  現在位置を設定
                </button>
              </div>
            </div>

            <div>
              <div
                className="block text-sm font-medium text-gray-700 mb-1"
                id="end-time-label"
              >
                終了時間
              </div>
              <div
                className="flex items-center"
                aria-labelledby="end-time-label"
              >
                <span className="bg-gray-100 px-3 py-2 rounded-l-md border border-r-0 border-gray-300">
                  {formatTime(endTime)}
                </span>
                <button
                  type="button"
                  onClick={handleSetEndTime}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-r-md transition-colors"
                  disabled={!user || isCreating || !youtubePlayerRef?.current}
                >
                  現在位置を設定
                </button>
              </div>
            </div>

            <div>
              <div
                className="block text-sm font-medium text-gray-700 mb-1"
                id="preview-label"
              >
                プレビュー
              </div>
              <button
                aria-labelledby="preview-label"
                type="button"
                onClick={handlePreview}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors"
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

          <div className="mb-4">
            <label
              htmlFor="clip-tags"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              タグ（オプション）
            </label>
            <div className="flex">
              <input
                id="clip-tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="タグを入力（Enterで追加）"
                className="flex-grow px-3 py-2 border border-r-0 border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={!user || isCreating}
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-r-md transition-colors"
                disabled={!user || isCreating || !tagInput.trim()}
              >
                追加
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-blue-500 hover:text-blue-700"
                      aria-label={`${tag}タグを削除`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={!user || isCreating}
              />
              <span className="ml-2 text-sm text-gray-700">
                公開する（全員が視聴可能）
              </span>
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? "作成中..." : "クリップを作成"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
