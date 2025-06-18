import type { Meta, StoryObj } from "@storybook/react";
import type {
  FrontendVideoData,
  VideoListResult,
} from "@suzumina.click/shared-types/src/video";
import VideoList from "./VideoList";

const meta: Meta<typeof VideoList> = {
  title: "Components/VideoList",
  component: VideoList,
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

const sampleVideos: FrontendVideoData[] = [
  {
    id: "sample-1",
    videoId: "dQw4w9WgXcQ",
    title: "涼花みなせの配信アーカイブ #001",
    description: "初回配信のアーカイブです。たくさんのお話をしました！",
    thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "PT1H23M45S",
    durationText: "1:23:45",
    publishedAt: "2024-01-15T19:00:00Z",
    channelId: "UC123456789",
    channelTitle: "涼花みなせ",
    viewCount: 12456,
    likeCount: 1234,
    tags: ["配信", "雑談", "初回"],
    createdAt: "2024-01-15T19:00:00Z",
    updatedAt: "2024-01-15T19:00:00Z",
    lastFetchedAt: "2024-01-15T19:00:00Z",
  },
  {
    id: "sample-2",
    videoId: "aBc123DeFg4",
    title: "朝の雑談配信",
    description: "おはようございます！今日も元気に配信します",
    thumbnailUrl: "https://i.ytimg.com/vi/aBc123DeFg4/maxresdefault.jpg",
    duration: "PT45M30S",
    durationText: "45:30",
    publishedAt: "2024-01-16T09:00:00Z",
    channelId: "UC123456789",
    channelTitle: "涼花みなせ",
    viewCount: 8901,
    likeCount: 567,
    tags: ["朝配信", "雑談"],
    createdAt: "2024-01-16T09:00:00Z",
    updatedAt: "2024-01-16T09:00:00Z",
    lastFetchedAt: "2024-01-16T09:00:00Z",
  },
  {
    id: "sample-3",
    videoId: "XyZ789HiJk2",
    title: "歌枠配信",
    description: "リクエストされた楽曲を歌います♪",
    thumbnailUrl: "https://i.ytimg.com/vi/XyZ789HiJk2/maxresdefault.jpg",
    duration: "PT2H15M00S",
    durationText: "2:15:00",
    publishedAt: "2024-01-17T20:00:00Z",
    channelId: "UC123456789",
    channelTitle: "涼花みなせ",
    viewCount: 25678,
    likeCount: 3456,
    tags: ["歌枠", "歌"],
    createdAt: "2024-01-17T20:00:00Z",
    updatedAt: "2024-01-17T20:00:00Z",
    lastFetchedAt: "2024-01-17T20:00:00Z",
  },
];

const sampleData: VideoListResult = {
  videos: sampleVideos,
  pagination: {
    currentPage: 1,
    totalPages: 5,
    totalCount: 58,
    hasNextPage: true,
    hasPreviousPage: false,
    itemsPerPage: 12,
  },
};

export const Default: Story = {
  args: {
    data: sampleData,
    totalCount: 58,
    currentPage: 1,
  },
};

export const EmptyState: Story = {
  args: {
    data: {
      videos: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        itemsPerPage: 12,
      },
    },
    totalCount: 0,
    currentPage: 1,
  },
};

export const SingleVideo: Story = {
  args: {
    data: {
      videos: sampleVideos.slice(0, 1),
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        itemsPerPage: 12,
      },
    },
    totalCount: 1,
    currentPage: 1,
  },
};

export const MiddlePage: Story = {
  args: {
    data: sampleData,
    totalCount: 58,
    currentPage: 3,
  },
};

export const LastPage: Story = {
  args: {
    data: {
      videos: sampleVideos.slice(0, 2),
      pagination: {
        currentPage: 5,
        totalPages: 5,
        totalCount: 58,
        hasNextPage: false,
        hasPreviousPage: true,
        itemsPerPage: 12,
      },
    },
    totalCount: 58,
    currentPage: 5,
  },
};
