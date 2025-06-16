import type { Meta, StoryObj } from "@storybook/react";
import type { FrontendVideoData } from "@suzumina.click/shared-types/src/video";
import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
import AdminList from "./AdminList";

// モック動画データ生成関数
const createMockVideo = (index: number): FrontendVideoData => ({
  id: `video${index}`,
  videoId: `video${index}`,
  title: `サンプル動画 ${index + 1} - 涼花みなせの癒しボイス`,
  description: `これはサンプル動画${index + 1}の説明文です。涼花みなせさんによる癒しのコンテンツをお楽しみください。`,
  channelTitle: "涼花みなせ Ch.",
  publishedAt: `2024-01-${String(index + 1).padStart(2, "0")}T19:00:00Z`,
  thumbnailUrl: `https://img.youtube.com/vi/video${index}/mqdefault.jpg`,
  channelId: "UCexample123456",
  lastFetchedAt: `2024-01-${String(index + 1).padStart(2, "0")}T20:00:00Z`,
  thumbnails: {
    default: {
      url: `https://img.youtube.com/vi/video${index}/mqdefault.jpg`,
      width: 120,
      height: 90,
    },
    medium: {
      url: `https://img.youtube.com/vi/video${index}/mqdefault.jpg`,
      width: 320,
      height: 180,
    },
    high: {
      url: `https://img.youtube.com/vi/video${index}/mqdefault.jpg`,
      width: 480,
      height: 360,
    },
  },
  publishedAtISO: `2024-01-${String(index + 1).padStart(2, "0")}T19:00:00Z`,
  lastFetchedAtISO: `2024-01-${String(index + 1).padStart(2, "0")}T20:00:00Z`,
});

// モック作品データ生成関数
const createMockWork = (index: number): FrontendDLsiteWorkData => ({
  id: `RJ${100000 + index}`,
  productId: `RJ${100000 + index}`,
  title: `サンプル作品 ${index + 1} - 涼花みなせの癒しボイス`,
  circle: `サークル${index + 1}`,
  author: ["涼花みなせ"],
  description: `これはサンプル作品${index + 1}の説明文です。涼花みなせさんによる癒しのボイス作品をお楽しみください。`,
  category: index % 2 === 0 ? "SOU" : "ADV",
  workUrl: `https://www.dlsite.com/maniax/work/=/product_id/RJ${100000 + index}.html`,
  thumbnailUrl: `https://img.dlsite.jp/modpub/images2/work/doujin/RJ${100000 + index}/RJ${100000 + index}_img_main.jpg`,
  price: {
    current: 550 + index * 100,
    currency: "JPY",
    ...(index % 3 === 0 && {
      original: 880 + index * 100,
      discount: 20,
    }),
  },
  rating: {
    stars: 4.0 + (index % 5) * 0.2,
    count: 100 + index * 50,
    reviewCount: 20 + index * 10,
    averageDecimal: 4.0 + (index % 5) * 0.2,
  },
  salesCount: 1000 + index * 500,
  ageRating: index % 4 === 0 ? "R-18" : index % 4 === 1 ? "R-15" : "全年齢",
  tags: [`タグ${index + 1}`, "ASMR", "癒し"],
  sampleImages: [],
  isExclusive: index % 5 === 0,
  lastFetchedAt: "2024-01-15T12:00:00Z",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-15T12:00:00Z",
  displayPrice:
    index % 3 === 0
      ? `${550 + index * 100}円（元：${880 + index * 100}円）`
      : `${550 + index * 100}円`,
  discountText: index % 3 === 0 ? "20%OFF" : undefined,
  ratingText: `★${(4.0 + (index % 5) * 0.2).toFixed(1)} (${100 + index * 50}件)`,
  wishlistText: `♡${(1000 + index * 123).toLocaleString()}`,
  downloadText: `DL${(1000 + index * 500).toLocaleString()}`,
  relativeUrl: `/maniax/work/=/product_id/RJ${100000 + index}.html`,
  createdAtISO: "2024-01-01T00:00:00Z",
  lastFetchedAtISO: "2024-01-15T12:00:00Z",
  updatedAtISO: "2024-01-15T12:00:00Z",
});

// サンプルデータセット
const mockVideos = Array.from({ length: 5 }, (_, i) => createMockVideo(i));
const mockWorks = Array.from({ length: 5 }, (_, i) => createMockWork(i));

const meta = {
  title: "Web/AdminList",
  component: AdminList,
  parameters: {
    layout: "padded",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/admin/videos",
        query: { page: "1" },
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    items: {
      control: { type: "object" },
    },
    totalCount: {
      control: { type: "number", min: 0 },
    },
    currentPage: {
      control: { type: "number", min: 1 },
    },
    title: {
      control: { type: "text" },
    },
    type: {
      control: { type: "select" },
      options: ["video", "work"],
    },
    emptyMessage: {
      control: { type: "text" },
    },
  },
} satisfies Meta<typeof AdminList>;

export default meta;
type Story = StoryObj<typeof meta>;

// ストーリーの定義
export const VideoList: Story = {
  args: {
    items: mockVideos,
    totalCount: 156,
    currentPage: 1,
    title: "動画一覧",
    type: "video",
    emptyMessage: "動画が見つかりませんでした",
  },
};

export const WorkList: Story = {
  args: {
    items: mockWorks,
    totalCount: 657,
    currentPage: 1,
    title: "DLsite作品一覧",
    type: "work",
    emptyMessage: "作品が見つかりませんでした",
  },
};

export const EmptyVideoList: Story = {
  args: {
    items: [],
    totalCount: 0,
    currentPage: 1,
    title: "動画一覧",
    type: "video",
    emptyMessage: "動画が見つかりませんでした",
  },
};

export const EmptyWorkList: Story = {
  args: {
    items: [],
    totalCount: 0,
    currentPage: 1,
    title: "DLsite作品一覧",
    type: "work",
    emptyMessage: "作品が見つかりませんでした",
  },
};

export const MiddlePageVideo: Story = {
  args: {
    items: mockVideos,
    totalCount: 156,
    currentPage: 8,
    title: "動画一覧",
    type: "video",
    emptyMessage: "動画が見つかりませんでした",
  },
};

export const MiddlePageWork: Story = {
  args: {
    items: mockWorks,
    totalCount: 657,
    currentPage: 12,
    title: "DLsite作品一覧",
    type: "work",
    emptyMessage: "作品が見つかりませんでした",
  },
};

export const SinglePageVideo: Story = {
  args: {
    items: mockVideos.slice(0, 3),
    totalCount: 3,
    currentPage: 1,
    title: "動画一覧",
    type: "video",
    emptyMessage: "動画が見つかりませんでした",
  },
};

export const SinglePageWork: Story = {
  args: {
    items: mockWorks.slice(0, 3),
    totalCount: 3,
    currentPage: 1,
    title: "DLsite作品一覧",
    type: "work",
    emptyMessage: "作品が見つかりませんでした",
  },
};
