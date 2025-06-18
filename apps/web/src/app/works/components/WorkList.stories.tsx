import type { Meta, StoryObj } from "@storybook/react";
import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
import WorkList from "./WorkList";

const meta: Meta<typeof WorkList> = {
  title: "Components/WorkList",
  component: WorkList,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleWorks: FrontendDLsiteWorkData[] = [
  {
    id: "sample-work-1",
    productId: "RJ123456",
    title: "涼花みなせボイス集 vol.1",
    circle: "Sample Circle",
    author: ["涼花みなせ"],
    category: "音声作品",
    workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ123456.html",
    price: {
      current: 1100,
      original: 1100,
      discount: 0,
    },
    rating: {
      stars: 4.8,
      count: 245,
    },
    salesCount: 1250,
    thumbnailUrl:
      "https://img.dlsite.jp/modpub/images2/work/doujin/RJ123000/RJ123456_img_main.jpg",
    tags: ["バイノーラル", "癒し", "耳かき", "囁き"],
    registDate: "2024-01-15",
    createdAt: "2024-01-15T19:00:00Z",
    updatedAt: "2024-01-15T19:00:00Z",
    lastFetchedAt: "2024-01-15T19:00:00Z",
  },
  {
    id: "sample-work-2",
    productId: "RJ234567",
    title: "リラックスボイス～安眠のお供に～",
    circle: "Relaxation Studio",
    author: ["涼花みなせ"],
    category: "音声作品",
    workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ234567.html",
    price: {
      current: 880,
      original: 1100,
      discount: 20,
    },
    rating: {
      stars: 4.5,
      count: 89,
    },
    salesCount: 456,
    thumbnailUrl:
      "https://img.dlsite.jp/modpub/images2/work/doujin/RJ234000/RJ234567_img_main.jpg",
    tags: ["安眠", "リラックス", "ASMR"],
    registDate: "2024-01-10",
    createdAt: "2024-01-10T19:00:00Z",
    updatedAt: "2024-01-10T19:00:00Z",
    lastFetchedAt: "2024-01-10T19:00:00Z",
  },
  {
    id: "sample-work-3",
    productId: "RJ345678",
    title: "朝の挨拶ボイスパック",
    circle: "Morning Voice",
    author: ["涼花みなせ"],
    category: "音声作品",
    workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ345678.html",
    price: {
      current: 550,
      original: 550,
      discount: 0,
    },
    rating: {
      stars: 4.9,
      count: 156,
    },
    salesCount: 890,
    thumbnailUrl:
      "https://img.dlsite.jp/modpub/images2/work/doujin/RJ345000/RJ345678_img_main.jpg",
    tags: ["挨拶", "朝", "短編"],
    registDate: "2024-01-05",
    rankingHistory: [
      {
        rank: 3,
        category: "voice",
        date: "2024-01-15",
      },
    ],
    createdAt: "2024-01-05T19:00:00Z",
    updatedAt: "2024-01-05T19:00:00Z",
    lastFetchedAt: "2024-01-05T19:00:00Z",
  },
  {
    id: "sample-work-4",
    productId: "RJ456789",
    title: "長いタイトルの作品例 - これは非常に長いタイトルのサンプルです",
    circle: "Long Title Studio",
    author: ["涼花みなせ"],
    category: "音声作品",
    workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ456789.html",
    price: {
      current: 1980,
      original: 1980,
      discount: 0,
    },
    rating: {
      stars: 4.2,
      count: 67,
    },
    salesCount: 234,
    thumbnailUrl:
      "https://img.dlsite.jp/modpub/images2/work/doujin/RJ456000/RJ456789_img_main.jpg",
    tags: ["長編", "物語", "ドラマ", "感動"],
    registDate: "2024-01-01",
    createdAt: "2024-01-01T19:00:00Z",
    updatedAt: "2024-01-01T19:00:00Z",
    lastFetchedAt: "2024-01-01T19:00:00Z",
  },
];

export const Default: Story = {
  args: {
    data: sampleWorks,
    totalCount: 42,
    currentPage: 1,
  },
};

export const EmptyState: Story = {
  args: {
    data: [],
    totalCount: 0,
    currentPage: 1,
  },
};

export const SingleWork: Story = {
  args: {
    data: sampleWorks.slice(0, 1),
    totalCount: 1,
    currentPage: 1,
  },
};

export const FewWorks: Story = {
  args: {
    data: sampleWorks.slice(0, 2),
    totalCount: 2,
    currentPage: 1,
  },
};

export const MiddlePage: Story = {
  args: {
    data: sampleWorks,
    totalCount: 42,
    currentPage: 3,
  },
};

export const LastPage: Story = {
  args: {
    data: sampleWorks.slice(0, 2),
    totalCount: 42,
    currentPage: 4,
  },
};
