"use client";

import { useEffect, useRef, useState } from "react";

// YouTubePlayer型の定義
export interface YouTubePlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  setVolume: (volume: number) => void;
  getPlayerState: () => number;
  // destroy()はYouTube IFrame APIに存在するが公式の型定義には含まれていないメソッド
  destroy: () => void;
}

// YouTube IFrame API用のグローバル型定義
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          videoId?: string;
          width?: number | string;
          height?: number | string;
          playerVars?: {
            autoplay?: 0 | 1;
            controls?: 0 | 1;
            enablejsapi?: 0 | 1;
            fs?: 0 | 1;
            rel?: 0 | 1;
            showinfo?: 0 | 1;
            start?: number;
            end?: number;
          };
          events?: {
            onReady?: (event: { target: YouTubePlayer }) => void;
            onStateChange?: (event: { data: number }) => void;
            onError?: (event: { data: number }) => void;
          };
        },
      ) => YouTubePlayer;
      PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
  onReady?: (player: YouTubePlayer) => void;
}

/**
 * YouTube動画埋め込みコンポーネント
 * YouTube IFrame APIを使用して動画を表示し、プレーヤーの制御を可能にする
 */
export default function YouTubeEmbed({
  videoId,
  title,
  onReady,
}: YouTubeEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const playerElementId = `youtube-player-${videoId}`;

  // YouTube IFrame APIのロード
  useEffect(() => {
    // APIがすでにロードされている場合はスキップ
    if (window.YT?.Player) {
      setIsApiLoaded(true);
      return;
    }

    // APIのロード状態を追跡するためのフラグ
    const existingScript = document.getElementById("youtube-iframe-api");
    if (existingScript) {
      setIsApiLoaded(true);
      return;
    }

    // APIのコールバック関数を設定
    window.onYouTubeIframeAPIReady = () => {
      setIsApiLoaded(true);
    };

    // APIスクリプトをロード
    const script = document.createElement("script");
    script.id = "youtube-iframe-api";
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // クリーンアップ時にコールバックをリセット
      window.onYouTubeIframeAPIReady = () => {};
    };
  }, []);

  // プレーヤーの初期化
  useEffect(() => {
    // APIがロードされていない、またはコンテナが存在しない場合はスキップ
    if (!isApiLoaded || !containerRef.current) return;

    // YTオブジェクトが正しく初期化されているか確認
    if (!window.YT || !window.YT.Player) {
      // YTオブジェクトがまだ利用できない場合は、少し待ってからリトライする
      const checkYTInterval = setInterval(() => {
        if (window.YT?.Player) {
          clearInterval(checkYTInterval);
          initializePlayer();
        }
      }, 100);

      // 5秒後にもロードされていなければインターバルをクリア（タイムアウト処理）
      setTimeout(() => {
        clearInterval(checkYTInterval);
        console.error("YouTube IFrame APIのロードに失敗しました");
      }, 5000);

      return () => {
        clearInterval(checkYTInterval);
      };
    }

    // プレーヤーを初期化する関数
    initializePlayer();

    // コンポーネント解除時にプレーヤーをクリーンアップ
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (error) {
          console.error("プレーヤーの破棄に失敗しました:", error);
        }
        playerRef.current = null;
      }
    };

    // プレーヤー初期化処理を関数化
    function initializePlayer() {
      try {
        setIsLoading(true);
        playerRef.current = new window.YT.Player(playerElementId, {
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            enablejsapi: 1,
            rel: 0,
            fs: 1,
          },
          events: {
            onReady: (event) => {
              setIsLoading(false);
              if (onReady) {
                onReady(event.target);
              }
            },
          },
        });
      } catch (error) {
        console.error("YouTubeプレーヤーの初期化に失敗しました:", error);
        setIsLoading(false);
      }
    }
  }, [isApiLoaded, videoId, onReady, playerElementId]);

  // レスポンシブ対応
  useEffect(() => {
    // レスポンシブ対応のためのリサイズ処理
    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = width * 0.5625; // 16:9のアスペクト比
        containerRef.current.style.height = `${height}px`;
      }
    };

    // 初期サイズ設定
    handleResize();

    // リサイズイベントリスナー
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-full bg-base-200 relative rounded-lg overflow-hidden"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        )}
        <div
          id={playerElementId}
          className="absolute top-0 left-0 w-full h-full"
          title={title || "YouTube video player"}
        />
      </div>
    </div>
  );
}
