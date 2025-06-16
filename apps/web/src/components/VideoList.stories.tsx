import type { Meta, StoryObj } from "@storybook/react-vite";
import type { VideoListResult } from "@suzumina.click/shared-types/src/video";

import VideoList from "./VideoList";

const mockVideoData: VideoListResult = {
  videos: [
    {
      id: "dQw4w9WgXcQ",
      videoId: "dQw4w9WgXcQ",
      title: "Never Gonna Give You Up",
      description:
        "The official video for Rick Astley's 1987 hit song Never Gonna Give You Up from his album Whenever You Need Somebody.",
      channelTitle: "Rick Astley",
      publishedAt: "2009-10-25T00:00:00Z",
      thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
      channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
      lastFetchedAt: "2024-01-01T00:00:00Z",
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
      publishedAtISO: "2009-10-25T00:00:00Z",
      lastFetchedAtISO: "2024-01-01T00:00:00Z",
    },
    {
      id: "abc123def456",
      videoId: "abc123def456",
      title: "【ASMR】優しい声でお話ししながら耳かき",
      description:
        "皆さんお疲れ様です！今日も一日お疲れ様でした。ゆっくりと耳かきをしながらお話しします。",
      channelTitle: "涼花みなせ",
      publishedAt: "2024-01-15T12:00:00Z",
      thumbnailUrl: "https://img.youtube.com/vi/abc123def456/mqdefault.jpg",
      channelId: "UCexample123456",
      lastFetchedAt: "2024-01-15T12:30:00Z",
      thumbnails: {
        default: {
          url: "https://img.youtube.com/vi/abc123def456/mqdefault.jpg",
          width: 120,
          height: 90,
        },
        medium: {
          url: "https://img.youtube.com/vi/abc123def456/mqdefault.jpg",
          width: 320,
          height: 180,
        },
        high: {
          url: "https://img.youtube.com/vi/abc123def456/mqdefault.jpg",
          width: 480,
          height: 360,
        },
      },
      publishedAtISO: "2024-01-15T12:00:00Z",
      lastFetchedAtISO: "2024-01-15T12:30:00Z",
    },
    {
      id: "xyz789ghi012",
      videoId: "xyz789ghi012",
      title: "【雑談】今日のできごと報告会",
      description:
        "今日あった楽しいことや面白いことをお話しします！みなさんもコメントで今日のできごとを教えてくださいね。",
      channelTitle: "涼花みなせ",
      publishedAt: "2024-01-20T19:00:00Z",
      thumbnailUrl: "https://img.youtube.com/vi/xyz789ghi012/mqdefault.jpg",
      channelId: "UCexample123456",
      lastFetchedAt: "2024-01-20T20:00:00Z",
      thumbnails: {
        default: {
          url: "https://img.youtube.com/vi/xyz789ghi012/mqdefault.jpg",
          width: 120,
          height: 90,
        },
        medium: {
          url: "https://img.youtube.com/vi/xyz789ghi012/mqdefault.jpg",
          width: 320,
          height: 180,
        },
        high: {
          url: "https://img.youtube.com/vi/xyz789ghi012/mqdefault.jpg",
          width: 480,
          height: 360,
        },
      },
      publishedAtISO: "2024-01-20T19:00:00Z",
      lastFetchedAtISO: "2024-01-20T20:00:00Z",
    },
  ],
  hasMore: true,
};

const emptyVideoData: VideoListResult = {
  videos: [],
  hasMore: false,
};

const meta = {
  title: "Web/VideoList",
  component: VideoList,
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
    data: {
      control: { type: "object" },
    },
    totalCount: {
      control: { type: "number" },
    },
    currentPage: {
      control: { type: "number" },
    },
  },
} satisfies Meta<typeof VideoList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: mockVideoData,
    totalCount: 150,
    currentPage: 1,
  },
};

export const EmptyState: Story = {
  args: {
    data: emptyVideoData,
    totalCount: 0,
    currentPage: 1,
  },
};

export const SinglePage: Story = {
  args: {
    data: mockVideoData,
    totalCount: 3,
    currentPage: 1,
  },
};

export const MiddlePage: Story = {
  args: {
    data: mockVideoData,
    totalCount: 100,
    currentPage: 5,
  },
};

export const LastPage: Story = {
  args: {
    data: {
      ...mockVideoData,
      hasMore: false,
    },
    totalCount: 23,
    currentPage: 3,
  },
};

export const LargeDataset: Story = {
  args: {
    data: mockVideoData,
    totalCount: 9999,
    currentPage: 42,
  },
};
