import type { Meta, StoryObj } from "@storybook/react";
import type { FrontendVideoData } from "@suzumina.click/shared-types/src/video";
import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
import AdminListItem from "./AdminListItem";

// モック動画データ
const mockVideoData: FrontendVideoData = {
  id: "dQw4w9WgXcQ",
  videoId: "dQw4w9WgXcQ",
  title: "【ASMR】優しい声でお話ししながら耳かき - 涼花みなせ",
  description:
    "皆さんお疲れ様です！今日も一日お疲れ様でした。ゆっくりと耳かきをしながらお話しします。リラックスしてお聞きください。",
  channelTitle: "涼花みなせ Ch.",
  publishedAt: "2024-01-15T19:00:00Z",
  thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
  channelId: "UCexample123456",
  lastFetchedAt: "2024-01-15T20:00:00Z",
  thumbnails: {
    default: {
      url: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
      width: 120,
      height: 90,
    },
    medium: {
      url: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
      width: 320,
      height: 180,
    },
    high: {
      url: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
      width: 480,
      height: 360,
    },
  },
  publishedAtISO: "2024-01-15T19:00:00Z",
  lastFetchedAtISO: "2024-01-15T20:00:00Z",
};

// モック作品データ
const mockWorkData: FrontendDLsiteWorkData = {
  id: "RJ123456",
  productId: "RJ123456",
  title: "【ASMR】耳かき専門店 〜涼花みなせの癒し空間〜",
  circle: "癒しの音工房",
  author: ["涼花みなせ"],
  description:
    "疲れた心と体を癒す、涼花みなせによる極上の耳かきASMRです。リアルな音響効果と優しい声で、まるで本当に耳かき専門店にいるような体験をお楽しみください。",
  category: "SOU",
  workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ123456.html",
  thumbnailUrl:
    "https://img.dlsite.jp/modpub/images2/work/doujin/RJ123456/RJ123456_img_main.jpg",
  price: {
    current: 880,
    original: 1100,
    currency: "JPY",
    discount: 20,
    point: 26,
  },
  rating: {
    stars: 4.8,
    count: 1234,
    reviewCount: 567,
    averageDecimal: 4.76,
  },
  salesCount: 15000,
  ageRating: "R-18",
  tags: ["ASMR", "耳かき", "癒し", "バイノーラル"],
  sampleImages: [],
  isExclusive: true,
  lastFetchedAt: "2024-01-15T12:00:00Z",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-15T12:00:00Z",
  displayPrice: "880円（元：1,100円）",
  discountText: "20%OFF",
  ratingText: "★4.8 (1,234件)",
  wishlistText: "♡8,888",
  downloadText: "DL15,000",
  relativeUrl: "/maniax/work/=/product_id/RJ123456.html",
  createdAtISO: "2024-01-01T00:00:00Z",
  lastFetchedAtISO: "2024-01-15T12:00:00Z",
  updatedAtISO: "2024-01-15T12:00:00Z",
};

const mockWorkAllAges: FrontendDLsiteWorkData = {
  ...mockWorkData,
  id: "RJ234567",
  productId: "RJ234567",
  title: "【ボイスドラマ】涼花みなせと過ごす休日",
  ageRating: "全年齢",
  isExclusive: false,
  price: {
    current: 550,
    currency: "JPY",
  },
  displayPrice: "550円",
  discountText: undefined,
};

const meta = {
  title: "Web/AdminListItem",
  component: AdminListItem,
  parameters: {
    layout: "padded",
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ["autodocs"],
  argTypes: {
    item: {
      control: { type: "object" },
    },
    type: {
      control: { type: "select" },
      options: ["video", "work"],
    },
  },
} satisfies Meta<typeof AdminListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

// ストーリーの定義
export const VideoItem: Story = {
  args: {
    item: mockVideoData,
    type: "video",
  },
};

export const WorkItemR18: Story = {
  args: {
    item: mockWorkData,
    type: "work",
  },
};

export const WorkItemAllAges: Story = {
  args: {
    item: mockWorkAllAges,
    type: "work",
  },
};

export const VideoItemLongTitle: Story = {
  args: {
    item: {
      ...mockVideoData,
      title:
        "【超長いタイトル】これは非常に長いタイトルのテストケースで、管理画面でのテキストの表示がどのように処理されるかを確認するためのものです - 涼花みなせ Ch.",
      description:
        "これは非常に長い説明文のテストケースです。管理画面でのテキストの表示がどのように処理されるかを確認するためのものです。通常の説明文よりも長く、複数行にわたって表示される場合のレイアウトを確認できます。",
    },
    type: "video",
  },
};

export const WorkItemMinimalData: Story = {
  args: {
    item: {
      ...mockWorkData,
      description: "",
      rating: undefined,
      ratingText: undefined,
      wishlistText: undefined,
      downloadText: undefined,
      discountText: undefined,
      isExclusive: false,
      author: [],
    },
    type: "work",
  },
};
