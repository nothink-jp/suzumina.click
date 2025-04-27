"use client";

import { useEffect, useRef } from "react";

interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
}

/**
 * YouTube動画埋め込みコンポーネント
 * レスポンシブ対応のiframeでYouTube動画を表示する
 */
export default function YouTubeEmbed({ videoId, title }: YouTubeEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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
    <div ref={containerRef} className="w-full bg-gray-100 relative">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title || "YouTube video player"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute top-0 left-0 w-full h-full"
      />
    </div>
  );
}