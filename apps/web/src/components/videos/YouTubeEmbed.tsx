"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// YouTubePlayer型の定義
export interface YouTubePlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number; // 動画の総再生時間（秒）を取得するメソッド
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
  onStateChange?: (state: number) => void;
  options?: {
    playerVars?: {
      autoplay?: 0 | 1;
      controls?: 0 | 1;
      disablekb?: 0 | 1;
      fs?: 0 | 1;
      modestbranding?: 0 | 1;
      rel?: 0 | 1;
      showinfo?: 0 | 1;
      start?: number;
      end?: number;
      [key: string]: string | number | boolean | undefined;
    };
  };
}

/**
 * YouTube動画埋め込みコンポーネント
 * YouTube IFrame APIを使用して動画を表示し、プレーヤーの制御を可能にする
 */
export default function YouTubeEmbed({
  videoId,
  title,
  onReady,
  onStateChange,
  options,
}: YouTubeEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const playerElementId = `youtube-player-${videoId}`;
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const timeoutDuration = 10000; // 10秒にタイムアウトを延長

  // 環境情報を記録
  const isCloudRun =
    typeof window !== "undefined" &&
    window.location.hostname.includes("run.app");
  useEffect(() => {
    console.log("[デバッグ] YouTubeEmbed マウント - 環境情報:", {
      isCloudRun,
      hostname:
        typeof window !== "undefined" ? window.location.hostname : "unknown",
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    });
  }, [isCloudRun]);

  // YouTube IFrame APIのロード
  useEffect(() => {
    // エラー状態をリセット
    setLoadError(null);

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
    script.onerror = () => {
      // スクリプトロード失敗時の処理
      setLoadError(
        "YouTube APIの読み込みに失敗しました。ネットワーク接続を確認してください。",
      );
    };
    document.body.appendChild(script);

    return () => {
      // クリーンアップ時にコールバックをリセット
      window.onYouTubeIframeAPIReady = () => {};
    };
  }, []);

  // 再試行機能を含むプレーヤーの初期化
  const loadYouTubeAPI = useCallback(() => {
    // 再試行回数をリセット
    retryCountRef.current = 0;

    // エラー状態をリセット
    setLoadError(null);

    // APIスクリプトをリロード
    const existingScript = document.getElementById("youtube-iframe-api");
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.id = "youtube-iframe-api";
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // プレーヤーの初期化
  useEffect(() => {
    // APIがロードされていない、またはコンテナが存在しない場合はスキップ
    if (!isApiLoaded || !containerRef.current) return;

    // プレーヤー要素が既に存在するか確認
    const existingPlayerElement = document.getElementById(playerElementId);
    if (!existingPlayerElement) {
      // プレーヤー要素が存在しない場合は、新しく作成
      const playerElement = document.createElement("div");
      playerElement.id = playerElementId;
      playerElement.className = "absolute top-0 left-0 w-full h-full";
      if (title) {
        playerElement.setAttribute("title", title);
      } else {
        playerElement.setAttribute("title", "YouTube video player");
      }

      // コンテナに追加
      containerRef.current.appendChild(playerElement);
    }

    // YTオブジェクトが正しく初期化されているか確認
    if (!window.YT || !window.YT.Player) {
      // YTオブジェクトがまだ利用できない場合は、少し待ってからリトライする
      const checkYTInterval = setInterval(() => {
        if (window.YT?.Player) {
          clearInterval(checkYTInterval);
          initializePlayer();
        }
      }, 100);

      // タイムアウト設定（10秒に延長）
      setTimeout(() => {
        clearInterval(checkYTInterval);
        if (!window.YT?.Player) {
          console.error("YouTube IFrame APIのロードに失敗しました");
          setLoadError(
            "YouTube動画プレーヤーの読み込みに失敗しました。再試行してください。",
          );

          // 再試行回数が上限に達していなければ再試行
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            console.log(
              `YouTube API読み込み再試行中... (${retryCountRef.current}/${maxRetries})`,
            );
            loadYouTubeAPI();
          }
        }
      }, timeoutDuration);

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
          // コンソールにデバッグ情報を出力
          console.log("[デバッグ] YouTubeプレーヤー破棄処理を実行");
          playerRef.current.destroy();
        } catch (error) {
          console.error("プレーヤーの破棄に失敗しました:", error);
        } finally {
          // 確実にプレーヤー参照をクリア
          playerRef.current = null;
        }
      }
    };

    // プレーヤー初期化処理を関数化
    function initializePlayer() {
      try {
        setIsLoading(true);
        setLoadError(null);

        // すでにプレーヤーが存在する場合は破棄
        if (playerRef.current) {
          try {
            console.log("[デバッグ] 既存プレーヤーの破棄処理を実行");
            playerRef.current.destroy();
          } catch (error) {
            console.error("既存プレーヤーの破棄に失敗しました:", error);
          }
          playerRef.current = null;
        }

        // プレーヤー要素が存在することを確認
        const playerElement = document.getElementById(playerElementId);
        if (!playerElement) {
          console.error("プレーヤー要素が見つかりません:", playerElementId);
          setIsLoading(false);
          setLoadError(
            "プレーヤー要素が見つかりませんでした。ページを再読み込みしてください。",
          );
          return;
        }

        console.log("[デバッグ] YouTubeプレーヤー初期化開始:", playerElementId);
        playerRef.current = new window.YT.Player(playerElementId, {
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            enablejsapi: 1,
            rel: 0,
            fs: 1,
            ...options?.playerVars,
          },
          events: {
            onReady: (event) => {
              console.log("[デバッグ] YouTubeプレーヤー準備完了");
              setIsLoading(false);
              if (onReady) {
                onReady(event.target);
              }
            },
            onStateChange: (event) => {
              if (onStateChange) {
                onStateChange(event.data);
              }
            },
            onError: (event) => {
              console.error("YouTubeプレーヤーエラー:", event);
              setIsLoading(false);
              setLoadError(
                "動画の読み込みに失敗しました。動画IDが正しいか確認してください。",
              );
            },
          },
        });
      } catch (error) {
        console.error("YouTubeプレーヤーの初期化に失敗しました:", error);
        setIsLoading(false);
        setLoadError(
          "YouTubeプレーヤーの初期化に失敗しました。ブラウザを更新して再試行してください。",
        );
      }
    }
  }, [
    isApiLoaded,
    videoId,
    onReady,
    onStateChange,
    playerElementId,
    title,
    options,
    loadYouTubeAPI,
  ]);

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
    <div className="relative w-full">
      <div
        ref={containerRef}
        className="w-full bg-base-200 relative rounded-lg overflow-hidden"
      >
        {/* ロード中の表示 */}
        {isLoading && !loadError && (
          <output
            className="absolute inset-0 flex items-center justify-center"
            style={{ zIndex: 1 }}
            aria-live="polite"
            aria-label="動画読み込み中"
          >
            <span className="loading loading-spinner loading-lg text-primary" />
          </output>
        )}

        {/* エラー表示 */}
        {loadError && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-base-100 bg-opacity-90"
            style={{ zIndex: 2 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-error mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>エラーアイコン</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-error font-bold mb-2">{loadError}</p>
            <button
              type="button"
              className="btn btn-primary mt-2"
              onClick={loadYouTubeAPI}
            >
              再試行する
            </button>
          </div>
        )}

        {/* 
          プレーヤー要素はJavaScriptで動的に生成するため、
          ここでは空のdivを用意しておく
        */}
        <div id={`${playerElementId}-container`} className="w-full h-full" />
      </div>
    </div>
  );
}
