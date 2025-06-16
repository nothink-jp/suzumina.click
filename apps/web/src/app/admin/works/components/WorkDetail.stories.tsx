import type { Meta, StoryObj } from "@storybook/react";
import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
import WorkDetail from "./WorkDetail";

// 完全な作品データのモック
const mockWorkDataComplete: FrontendDLsiteWorkData = {
  id: "RJ123456",
  productId: "RJ123456",
  title: "【ASMR】耳かき専門店 〜涼花みなせの癒し空間〜",
  circle: "癒しの音工房",
  author: ["涼花みなせ", "サブ声優"],
  description: `疲れた心と体を癒す、涼花みなせによる極上の耳かきASMRです。

リアルな音響効果と優しい声で、まるで本当に耳かき専門店にいるような体験をお楽しみください。

【収録内容】
・受付とカウンセリング（約5分）
・耳かき（両耳、約30分）
・綿棒でのお掃除（約10分）
・マッサージ（約15分）
・お見送り（約5分）

バイノーラル録音による立体音響で、左右の耳に異なる音が聞こえ、まさに至福のひとときをお過ごしいただけます。

※イヤホン・ヘッドホンでのご利用を推奨します。`,
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
  tags: [
    "ASMR",
    "耳かき",
    "癒し",
    "バイノーラル",
    "涼花みなせ",
    "安眠",
    "リラックス",
    "立体音響",
  ],
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

// 最小限のデータ
const mockWorkDataMinimal: FrontendDLsiteWorkData = {
  id: "RJ234567",
  productId: "RJ234567",
  title: "【ボイスドラマ】涼花みなせと過ごす休日",
  circle: "日常系ボイス",
  author: ["涼花みなせ"],
  description: "",
  category: "SOU",
  workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ234567.html",
  thumbnailUrl:
    "https://img.dlsite.jp/modpub/images2/work/doujin/RJ234567/RJ234567_img_main.jpg",
  price: {
    current: 550,
    currency: "JPY",
  },
  rating: undefined,
  salesCount: undefined,
  ageRating: "全年齢",
  tags: [],
  sampleImages: [],
  isExclusive: false,
  lastFetchedAt: "2024-01-20T10:00:00Z",
  createdAt: "2024-01-20T09:00:00Z",
  updatedAt: "2024-01-20T10:00:00Z",
  displayPrice: "550円",
  discountText: undefined,
  ratingText: undefined,
  wishlistText: undefined,
  downloadText: undefined,
  relativeUrl: "/maniax/work/=/product_id/RJ234567.html",
  createdAtISO: "2024-01-20T09:00:00Z",
  lastFetchedAtISO: "2024-01-20T10:00:00Z",
  updatedAtISO: "2024-01-20T10:00:00Z",
};

// ゲーム作品（R-15）
const mockWorkDataGame: FrontendDLsiteWorkData = {
  id: "RJ345678",
  productId: "RJ345678",
  title: "RPG風音声ゲーム ～涼花みなせと魔法の世界～",
  circle: "ファンタジーサウンド",
  author: ["涼花みなせ", "田中太郎"],
  description:
    "涼花みなせがヒロインを演じるRPG風音声ゲーム。魔法の世界を冒険しながら、様々なキャラクターとの出会いを楽しめます。",
  category: "RPG",
  workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ345678.html",
  thumbnailUrl:
    "https://img.dlsite.jp/modpub/images2/work/doujin/RJ345678/RJ345678_img_main.jpg",
  price: {
    current: 1980,
    currency: "JPY",
  },
  rating: {
    stars: 4.2,
    count: 456,
    reviewCount: 123,
    averageDecimal: 4.23,
  },
  salesCount: 3200,
  ageRating: "R-15",
  tags: ["RPG", "ファンタジー", "音声ゲーム", "冒険"],
  sampleImages: [],
  isExclusive: false,
  lastFetchedAt: "2024-01-10T15:30:00Z",
  createdAt: "2024-01-05T12:00:00Z",
  updatedAt: "2024-01-10T15:30:00Z",
  displayPrice: "1,980円",
  discountText: undefined,
  ratingText: "★4.2 (456件)",
  wishlistText: "♡2,345",
  downloadText: "DL3,200",
  relativeUrl: "/maniax/work/=/product_id/RJ345678.html",
  createdAtISO: "2024-01-05T12:00:00Z",
  lastFetchedAtISO: "2024-01-10T15:30:00Z",
  updatedAtISO: "2024-01-10T15:30:00Z",
};

const meta = {
  title: "Web/WorkDetail",
  component: WorkDetail,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/admin/works/RJ123456",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    work: {
      control: { type: "object" },
    },
  },
} satisfies Meta<typeof WorkDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

// ストーリーの定義
export const CompleteWork: Story = {
  args: {
    work: mockWorkDataComplete,
  },
};

export const MinimalWork: Story = {
  args: {
    work: mockWorkDataMinimal,
  },
};

export const GameWork: Story = {
  args: {
    work: mockWorkDataGame,
  },
};

export const LongTitle: Story = {
  args: {
    work: {
      ...mockWorkDataComplete,
      title:
        "【超長いタイトル】これは非常に長いタイトルのテストケースで、詳細ページでのタイトル表示がどのように処理されるかを確認するためのものです ～涼花みなせの癒し空間 完全版～",
    },
  },
};

export const ManyTags: Story = {
  args: {
    work: {
      ...mockWorkDataComplete,
      tags: [
        "ASMR",
        "耳かき",
        "癒し",
        "バイノーラル",
        "涼花みなせ",
        "安眠",
        "リラックス",
        "立体音響",
        "ヒーリング",
        "マッサージ",
        "囁き",
        "ロールプレイ",
        "専門店",
        "高音質",
        "長時間",
        "リピート推奨",
        "イヤホン推奨",
        "バイノーラル録音",
      ],
    },
  },
};
