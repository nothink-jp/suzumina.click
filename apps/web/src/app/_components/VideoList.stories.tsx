import type { Video } from "@/lib/videos/types";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import VideoList from "./VideoList";

// モックデータ
const mockVideos: Video[] = [
  {
    id: "1",
    title: "【歌ってみた】シャルル / バルーン covered by 涼花みなせ",
    description:
      "バルーンさんの「シャルル」を歌わせていただきました。素敵な楽曲をありがとうございます。",
    publishedAt: new Date("2025-04-01"),
    publishedAtISO: "2025-04-01T00:00:00.000Z",
    thumbnailUrl: "https://i.ytimg.com/vi/sample1/maxresdefault.jpg",
    channelId: "UCxxxxxxxxxxxxxxxxxxxxxx",
    channelTitle: "涼花みなせ / Suzuhana Minase",
    lastFetchedAt: new Date("2025-04-20"),
  },
  {
    id: "2",
    title: "【歌ってみた】ハルジオン / YOASOBI covered by 涼花みなせ",
    description:
      "YOASOBIさんの「ハルジオン」を歌わせていただきました。素敵な楽曲をありがとうございます。",
    publishedAt: new Date("2025-04-02"),
    publishedAtISO: "2025-04-02T00:00:00.000Z",
    thumbnailUrl: "https://i.ytimg.com/vi/sample2/maxresdefault.jpg",
    channelId: "UCxxxxxxxxxxxxxxxxxxxxxx",
    channelTitle: "涼花みなせ / Suzuhana Minase",
    lastFetchedAt: new Date("2025-04-20"),
  },
  {
    id: "3",
    title: "【歌ってみた】群青 / YOASOBI covered by 涼花みなせ",
    description:
      "YOASOBIさんの「群青」を歌わせていただきました。素敵な楽曲をありがとうございます。",
    publishedAt: new Date("2025-04-03"),
    publishedAtISO: "2025-04-03T00:00:00.000Z",
    thumbnailUrl: "https://i.ytimg.com/vi/sample3/maxresdefault.jpg",
    channelId: "UCxxxxxxxxxxxxxxxxxxxxxx",
    channelTitle: "涼花みなせ / Suzuhana Minase",
    lastFetchedAt: new Date("2025-04-20"),
  },
  {
    id: "4",
    title: "【歌ってみた】アイドル / YOASOBI covered by 涼花みなせ",
    description:
      "YOASOBIさんの「アイドル」を歌わせていただきました。素敵な楽曲をありがとうございます。",
    publishedAt: new Date("2025-04-04"),
    publishedAtISO: "2025-04-04T00:00:00.000Z",
    thumbnailUrl: "https://i.ytimg.com/vi/sample4/maxresdefault.jpg",
    channelId: "UCxxxxxxxxxxxxxxxxxxxxxx",
    channelTitle: "涼花みなせ / Suzuhana Minase",
    lastFetchedAt: new Date("2025-04-20"),
  },
  {
    id: "5",
    title: "【歌ってみた】夜に駆ける / YOASOBI covered by 涼花みなせ",
    description:
      "YOASOBIさんの「夜に駆ける」を歌わせていただきました。素敵な楽曲をありがとうございます。",
    publishedAt: new Date("2025-04-05"),
    publishedAtISO: "2025-04-05T00:00:00.000Z",
    thumbnailUrl: "https://i.ytimg.com/vi/sample5/maxresdefault.jpg",
    channelId: "UCxxxxxxxxxxxxxxxxxxxxxx",
    channelTitle: "涼花みなせ / Suzuhana Minase",
    lastFetchedAt: new Date("2025-04-20"),
  },
  {
    id: "6",
    title: "【歌ってみた】ロウワー / 優里 covered by 涼花みなせ",
    description:
      "優里さんの「ロウワー」を歌わせていただきました。素敵な楽曲をありがとうございます。",
    publishedAt: new Date("2025-04-06"),
    publishedAtISO: "2025-04-06T00:00:00.000Z",
    thumbnailUrl: "https://i.ytimg.com/vi/sample6/maxresdefault.jpg",
    channelId: "UCxxxxxxxxxxxxxxxxxxxxxx",
    channelTitle: "涼花みなせ / Suzuhana Minase",
    lastFetchedAt: new Date("2025-04-20"),
  },
];

// fetchのモック
const originalFetch = global.fetch;

// Storybook設定
const meta = {
  title: "Components/VideoList",
  component: VideoList,
  parameters: {
    layout: "padded",
    mockData: {
      videos: mockVideos,
      hasMore: true,
    },
  },
  tags: ["autodocs"],
  argTypes: {
    limit: {
      control: { type: "number" },
      description: "表示する動画の最大数",
    },
    showViewAllLink: {
      control: { type: "boolean" },
      description:
        "「もっと見る」ボタンの代わりに全一覧ページへのリンクを表示するかどうか",
    },
    pageSize: {
      control: { type: "number" },
      description: "一度に読み込む動画数",
    },
  },
  decorators: [
    (Story, context) => {
      // fetchをモック
      global.fetch = async (url) => {
        // モックデータを取得
        const mockData = context.parameters.mockData || {};

        if (url.toString().includes("/api/videos")) {
          // APIレスポンスをモック
          return {
            ok: true,
            json: async () => ({
              videos: mockData.videos || [],
              hasMore: mockData.hasMore || false,
              lastVideo:
                mockData.videos && mockData.videos.length > 0
                  ? mockData.videos[mockData.videos.length - 1]
                  : undefined,
            }),
          } as Response;
        }

        // その他のリクエストは元のfetchを使用
        return originalFetch(url);
      };

      // Storyをレンダリング
      const result = Story();

      // 元に戻す
      global.fetch = originalFetch;

      return result;
    },
  ],
} satisfies Meta<typeof VideoList>;

export default meta;
type Story = StoryObj<typeof meta>;

// デフォルト表示（全件表示）
export const Default: Story = {
  args: {},
};

// 最新4件のみ表示
export const LimitedToFour: Story = {
  args: {
    limit: 4,
  },
};

// 「もっと見る」リンク表示
export const WithViewAllLink: Story = {
  args: {
    limit: 4,
    showViewAllLink: true,
  },
};

// ローディング状態
export const Loading: Story = {
  parameters: {
    mockData: {
      loading: true,
      videos: [],
    },
  },
  decorators: [
    (Story) => {
      // fetchをモック（ローディング状態を維持）
      global.fetch = async () => {
        // ローディング状態をシミュレート
        return new Promise(() => {});
      };

      return Story();
    },
  ],
  args: {},
};

// データなし
export const NoData: Story = {
  parameters: {
    mockData: {
      videos: [],
      hasMore: false,
    },
  },
  args: {},
};
