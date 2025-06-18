import type { Meta, StoryObj } from "@storybook/react";
import type { FrontendVideoData } from "@suzumina.click/shared-types/src/video";
import VideoCard from "./VideoCard";

const meta: Meta<typeof VideoCard> = {
  title: "Components/VideoCard",
  component: VideoCard,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["grid", "sidebar"],
    },
    buttonCount: {
      control: { type: "number" },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleVideo: FrontendVideoData = {
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
};

export const Default: Story = {
  args: {
    video: sampleVideo,
    buttonCount: 5,
    variant: "grid",
  },
};

export const Sidebar: Story = {
  args: {
    video: sampleVideo,
    buttonCount: 3,
    variant: "sidebar",
  },
};

export const NoButtons: Story = {
  args: {
    video: sampleVideo,
    buttonCount: 0,
    variant: "grid",
  },
};

export const LongTitle: Story = {
  args: {
    video: {
      ...sampleVideo,
      title:
        "涼花みなせの超長いタイトルの配信アーカイブ - これは非常に長いタイトルの例です。実際の配信では様々な話題について語っています。",
    },
    buttonCount: 8,
    variant: "grid",
  },
};

export const ManyButtons: Story = {
  args: {
    video: sampleVideo,
    buttonCount: 25,
    variant: "grid",
  },
};
