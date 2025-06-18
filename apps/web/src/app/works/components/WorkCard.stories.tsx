import type { Meta, StoryObj } from "@storybook/react";
import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
import WorkCard from "./WorkCard";

const meta: Meta<typeof WorkCard> = {
  title: "Components/WorkCard",
  component: WorkCard,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["default", "compact"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleWork: FrontendDLsiteWorkData = {
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
};

export const Default: Story = {
  args: {
    work: sampleWork,
    variant: "default",
  },
};

export const Compact: Story = {
  args: {
    work: sampleWork,
    variant: "compact",
  },
};

export const OnSale: Story = {
  args: {
    work: {
      ...sampleWork,
      price: {
        current: 880,
        original: 1100,
        discount: 20,
      },
    },
    variant: "default",
  },
};

export const HighRating: Story = {
  args: {
    work: {
      ...sampleWork,
      rating: {
        stars: 5.0,
        count: 500,
      },
      salesCount: 5000,
    },
    variant: "default",
  },
};

export const LowRating: Story = {
  args: {
    work: {
      ...sampleWork,
      rating: {
        stars: 2.5,
        count: 12,
      },
      salesCount: 25,
    },
    variant: "default",
  },
};

export const WithRanking: Story = {
  args: {
    work: {
      ...sampleWork,
      rankingHistory: [
        {
          rank: 3,
          category: "voice",
          date: "2024-01-15",
        },
      ],
    },
    variant: "default",
  },
};

export const LongTitle: Story = {
  args: {
    work: {
      ...sampleWork,
      title:
        "涼花みなせの非常に長いタイトルの音声作品 - これは実際に存在する長いタイトルの例で、複数行にわたって表示される可能性があります",
    },
    variant: "default",
  },
};

export const ManyTags: Story = {
  args: {
    work: {
      ...sampleWork,
      tags: [
        "バイノーラル",
        "癒し",
        "耳かき",
        "囁き",
        "睡眠導入",
        "ASMR",
        "リラックス",
        "安眠",
        "環境音",
      ],
    },
    variant: "default",
  },
};
