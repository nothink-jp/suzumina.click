"use client";

import { getVideoTimeRangesAction } from "@/actions/audioclips/get-timeranges";
import type { TimeRange } from "@/lib/audioclips/types";
import { formatTime } from "@/lib/audioclips/validation";
import { useCallback, useEffect, useRef, useState } from "react";

interface TimelineVisualizationProps {
  videoId: string;
  videoDuration: number; // 動画の総再生時間（秒）
  currentTime?: number; // 現在の再生位置（秒）
  onRangeSelect?: (start: number, end: number) => void;
  onClipClick?: (clipId: string) => void;
  className?: string; // 追加のCSSクラス
  // オプションのサーバーアクション - propsで渡されない場合はデフォルトでgetVideoTimeRangesActionを使用
  getTimeRangesAction?: (videoId: string) => Promise<TimeRange[]>;
}

/**
 * タイムライン可視化コンポーネント
 *
 * 動画のタイムライン上に既存の音声クリップの範囲を可視化し、
 * ドラッグ操作による時間範囲の選択をサポートするコンポーネント
 */
export default function TimelineVisualization({
  videoId,
  videoDuration,
  currentTime,
  onRangeSelect,
  onClipClick,
  className = "",
  getTimeRangesAction,
}: TimelineVisualizationProps) {
  // 状態管理
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{
    start: number;
    end: number;
  } | null>(null);

  // 参照
  const timelineRef = useRef<HTMLDivElement>(null);
  const dragStartPosRef = useRef<number | null>(null);

  // 時間範囲データの取得
  useEffect(() => {
    async function fetchTimeRanges() {
      if (!videoId || videoDuration <= 0) return;

      setIsLoading(true);
      try {
        // propsでアクションが渡されていればそれを使用、なければデフォルトのアクションを使用
        const getTimeRanges = getTimeRangesAction || getVideoTimeRangesAction;
        const ranges = await getTimeRanges(videoId);
        setTimeRanges(ranges);
      } catch (error) {
        console.error("[エラー] 時間範囲の取得に失敗しました:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTimeRanges();
  }, [videoId, videoDuration, getTimeRangesAction]);

  // タイムライン上のピクセル位置を時間（秒）に変換
  const pixelToSeconds = useCallback(
    (pixelPos: number): number => {
      if (!timelineRef.current) return 0;

      const { left, width } = timelineRef.current.getBoundingClientRect();
      const relativePos = Math.max(0, Math.min(pixelPos - left, width));
      return (relativePos / width) * videoDuration;
    },
    [videoDuration],
  );

  // 秒数をタイムライン上の位置（パーセント）に変換
  const secondsToPercent = useCallback(
    (seconds: number): number => {
      if (videoDuration <= 0) return 0;
      return (Math.min(seconds, videoDuration) / videoDuration) * 100;
    },
    [videoDuration],
  );

  // マウスダウン時の処理
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (videoDuration <= 0) return;

      const startPos = pixelToSeconds(e.clientX);
      dragStartPosRef.current = startPos;
      setIsDragging(true);
      setSelectedRange({ start: startPos, end: startPos });
    },
    [pixelToSeconds, videoDuration],
  );

  // マウス移動時の処理
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || dragStartPosRef.current === null) return;

      const currentPos = pixelToSeconds(e.clientX);
      const startPos = dragStartPosRef.current;

      // 選択範囲の開始点と終了点を正規化（開始 <= 終了）
      const start = Math.min(startPos, currentPos);
      const end = Math.max(startPos, currentPos);

      setSelectedRange({ start, end });
    },
    [isDragging, pixelToSeconds],
  );

  // マウスアップ時の処理
  const handleMouseUp = useCallback(() => {
    if (isDragging && selectedRange && onRangeSelect) {
      // 範囲が実際に選択されていれば（開始点と終了点が異なる場合）
      if (Math.abs(selectedRange.end - selectedRange.start) > 0.5) {
        // 選択範囲を親コンポーネントに通知
        onRangeSelect(selectedRange.start, selectedRange.end);
      }
    }

    // ドラッグ状態をリセット
    setIsDragging(false);
    dragStartPosRef.current = null;
  }, [isDragging, selectedRange, onRangeSelect]);

  // クリップ範囲がクリックまたはキーボード操作されたときの処理
  const handleClipClick = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent, clipId: string) => {
      e.stopPropagation(); // タイムラインのイベントを発火させない
      if (onClipClick) {
        onClipClick(clipId);
      }
    },
    [onClipClick],
  );

  // マウスアップ時のイベントをドキュメント全体で監視
  useEffect(() => {
    function handleGlobalMouseUp() {
      if (isDragging) {
        handleMouseUp();
      }
    }

    document.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging, handleMouseUp]);

  // 異なるクリップ範囲に異なる色を割り当てる
  const getClipColor = useCallback((index: number): string => {
    const colors = [
      "rgba(59, 130, 246, 0.5)", // 青
      "rgba(16, 185, 129, 0.5)", // 緑
      "rgba(249, 115, 22, 0.5)", // オレンジ
      "rgba(139, 92, 246, 0.5)", // 紫
      "rgba(236, 72, 153, 0.5)", // ピンク
    ];
    return colors[index % colors.length];
  }, []);

  // タイムマーカーの間隔を決定（動画の長さに基づいて調整）
  const getMarkerInterval = useCallback((): number => {
    if (videoDuration <= 60) return 5; // 1分以下：5秒ごと
    if (videoDuration <= 300) return 30; // 5分以下：30秒ごと
    if (videoDuration <= 900) return 60; // 15分以下：1分ごと
    if (videoDuration <= 3600) return 300; // 1時間以下：5分ごと
    return 600; // 1時間超：10分ごと
  }, [videoDuration]);

  // 選択範囲のスタイル
  const getSelectedRangeStyle = useCallback(() => {
    if (!selectedRange) return {};

    return {
      left: `${secondsToPercent(selectedRange.start)}%`,
      width: `${secondsToPercent(selectedRange.end - selectedRange.start)}%`,
    };
  }, [selectedRange, secondsToPercent]);

  // マーカー間隔
  const markerInterval = getMarkerInterval();

  return (
    <div className={`w-full ${className}`}>
      <h3 className="text-sm font-medium mb-1">タイムライン</h3>

      <section
        ref={timelineRef}
        aria-label="タイムライン"
        className={`relative h-8 bg-gray-200 rounded w-full cursor-pointer ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        {/* 現在再生位置マーカー */}
        {currentTime !== undefined && videoDuration > 0 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-red-500 z-30"
            style={{ left: `${secondsToPercent(currentTime)}%` }}
            title={`現在位置: ${formatTime(currentTime)}`}
          />
        )}

        {/* 既存の音声クリップ範囲の表示 */}
        {timeRanges.map((range, index) => (
          <div
            key={range.clipId}
            className="absolute h-full rounded-sm transition-opacity hover:opacity-80 border-none bg-transparent p-0 m-0 cursor-pointer"
            style={{
              left: `${secondsToPercent(range.start)}%`,
              width: `${secondsToPercent(range.end - range.start)}%`,
              backgroundColor: range.color || getClipColor(index),
              zIndex: 10,
            }}
            title={`${range.title} (${formatTime(range.start)} - ${formatTime(range.end)})`}
            onClick={(e) => handleClipClick(e, range.clipId)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleClipClick(e, range.clipId);
              }
            }}
            tabIndex={0}
            // biome-ignore lint/a11y/useSemanticElements: <explanation>
            role="button"
            aria-label={`${range.title} (${formatTime(range.start)} - ${formatTime(range.end)})`}
          >
            {/* 幅が広い場合はクリップタイトルを表示 */}
            {range.end - range.start > videoDuration * 0.05 && (
              <span className="text-xs truncate px-1 leading-8 text-gray-800">
                {range.title}
              </span>
            )}
          </div>
        ))}

        {/* 選択中の範囲 */}
        {isDragging && selectedRange && (
          <div
            className="absolute h-full z-20 bg-yellow-300 bg-opacity-30 border border-yellow-500"
            style={getSelectedRangeStyle()}
          />
        )}

        {/* 時間マーカー */}
        {videoDuration > 0 &&
          Array.from({
            length: Math.floor(videoDuration / markerInterval),
          }).map((_, i) => (
            <div
              key={`marker-time-${(i + 1) * markerInterval}`}
              className="absolute bottom-0 h-2 w-px bg-gray-400 z-5"
              style={{ left: `${secondsToPercent((i + 1) * markerInterval)}%` }}
            />
          ))}
      </section>

      {/* 時間表示（開始・中間・終了） */}
      <div className="flex justify-between text-xs mt-1 text-gray-600">
        <span>0:00</span>
        {videoDuration > 0 && (
          <>
            <span>{formatTime(videoDuration / 2)}</span>
            <span>{formatTime(videoDuration)}</span>
          </>
        )}
      </div>

      {isLoading && (
        <p className="text-sm text-gray-500 mt-1">
          タイムラインデータを読み込み中...
        </p>
      )}
    </div>
  );
}
