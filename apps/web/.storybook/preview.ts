import type { Preview } from "@storybook/react";
import "../src/app/globals.css"; // グローバルCSSをインポート
import { createMockFn, initNextJsNavigationMock, initVideoListApiMock } from "./mock"; // モック関数をインポート
import type { Video } from "../src/lib/videos/types";

// モックデータ
const mockVideos: Video[] = [
  { 
    id: "1", 
    title: "【歌ってみた】シャルル / バルーン covered by 涼花みなせ",
    description: "バルーンさんの「シャルル」を歌わせていただきました。素敵な楽曲をありがとうございます。",
    publishedAt: new Date("2025-04-01"),
    publishedAtISO: "2025-04-01T00:00:00.000Z",
    thumbnailUrl: "https://i.ytimg.com/vi/sample1/maxresdefault.jpg",
    channelId: "UCxxxxxxxxxxxxxxxxxxxxxx",
    channelTitle: "涼花みなせ / Suzuhana Minase",
    lastFetchedAt: new Date("2025-04-20")
  },
  { 
    id: "2", 
    title: "【歌ってみた】ハルジオン / YOASOBI covered by 涼花みなせ",
    description: "YOASOBIさんの「ハルジオン」を歌わせていただきました。素敵な楽曲をありがとうございます。",
    publishedAt: new Date("2025-04-02"),
    publishedAtISO: "2025-04-02T00:00:00.000Z",
    thumbnailUrl: "https://i.ytimg.com/vi/sample2/maxresdefault.jpg",
    channelId: "UCxxxxxxxxxxxxxxxxxxxxxx",
    channelTitle: "涼花みなせ / Suzuhana Minase",
    lastFetchedAt: new Date("2025-04-20")
  },
];

// Storybookのプレビュー設定
const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // Next.js App Routerのモックを設定
    nextjs: {
      appDirectory: true,
      navigation: {
        push: createMockFn<string, void>(),
        replace: createMockFn<string, void>(),
        prefetch: createMockFn<string, void>(),
        back: createMockFn<void, void>(),
        forward: createMockFn<void, void>(),
        refresh: createMockFn<void, void>(),
      },
    },
    // デフォルトのモックデータ
    mockData: {
      videos: mockVideos,
      hasMore: true,
    },
  },
  decorators: [
    (Story, context) => {
      // VideoListコンポーネントのAPIモックを設定
      if (typeof window !== 'undefined') {
        // モックデータを取得
        const mockData = context.parameters.mockData || {};
        
        // APIモックを初期化
        initVideoListApiMock(mockData);
      }
      
      return Story();
    },
  ],
};

// Next.jsのナビゲーションモックを初期化
initNextJsNavigationMock();

export default preview;
