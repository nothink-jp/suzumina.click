import type { Meta, StoryObj } from "@storybook/react";
import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { AudioButtonCard } from "./AudioButtonCard";

const meta: Meta<typeof AudioButtonCard> = {
  title: "Components/AudioButtonCard",
  component: AudioButtonCard,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: { type: "select" },
      options: ["sm", "md", "lg"],
    },
    variant: {
      control: { type: "select" },
      options: ["default", "compact"],
    },
    showSourceVideo: {
      control: { type: "boolean" },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleAudioButton: FrontendAudioButtonData = {
  id: "sample-audio-1",
  title: "おはよう！",
  description: "元気な朝の挨拶です",
  audioUrl: "https://example.com/audio/sample.mp3",
  duration: 3.5,
  durationText: "0:03",
  fileSize: 56000,
  sourceVideoId: "sample-video-1",
  sourceVideoTitle: "朝の配信アーカイブ",
  startTime: 125,
  endTime: 128,
  tags: ["挨拶", "朝"],
  category: "voice",
  uploadedBy: "ファンユーザー1",
  isPublic: true,
  playCount: 1245,
  likeCount: 89,
  createdAt: "2024-01-15T19:00:00Z",
  updatedAt: "2024-01-15T19:00:00Z",
};

export const Default: Story = {
  args: {
    audioButton: sampleAudioButton,
    size: "md",
    variant: "default",
    showSourceVideo: true,
  },
};

export const Compact: Story = {
  args: {
    audioButton: sampleAudioButton,
    size: "md",
    variant: "compact",
    showSourceVideo: false,
  },
};

export const Small: Story = {
  args: {
    audioButton: sampleAudioButton,
    size: "sm",
    variant: "default",
    showSourceVideo: true,
  },
};

export const Large: Story = {
  args: {
    audioButton: sampleAudioButton,
    size: "lg",
    variant: "default",
    showSourceVideo: true,
  },
};

export const CompactSmall: Story = {
  args: {
    audioButton: sampleAudioButton,
    size: "sm",
    variant: "compact",
    showSourceVideo: false,
  },
};

export const NoSourceVideo: Story = {
  args: {
    audioButton: {
      ...sampleAudioButton,
      sourceVideoId: undefined,
      sourceVideoTitle: undefined,
    },
    size: "md",
    variant: "default",
    showSourceVideo: false,
  },
};

export const LongTitle: Story = {
  args: {
    audioButton: {
      ...sampleAudioButton,
      title:
        "これは非常に長いタイトルの音声ボタンの例です。実際にはもっと短くなることが多いですが、長い場合の表示を確認するためのサンプルです。",
    },
    size: "md",
    variant: "default",
    showSourceVideo: true,
  },
};

export const HighCounts: Story = {
  args: {
    audioButton: {
      ...sampleAudioButton,
      playCount: 125430,
      likeCount: 8924,
    },
    size: "md",
    variant: "default",
    showSourceVideo: true,
  },
};

export const ManyTags: Story = {
  args: {
    audioButton: {
      ...sampleAudioButton,
      tags: ["挨拶", "朝", "元気", "配信", "アーカイブ", "人気", "おすすめ"],
    },
    size: "md",
    variant: "default",
    showSourceVideo: true,
  },
};

export const BGMCategory: Story = {
  args: {
    audioButton: {
      ...sampleAudioButton,
      title: "リラックスBGM",
      description: "配信中に流れていた癒しの音楽",
      category: "bgm",
      tags: ["BGM", "リラックス", "音楽"],
      duration: 180.5,
      durationText: "3:00",
    },
    size: "md",
    variant: "default",
    showSourceVideo: true,
  },
};

export const SECategory: Story = {
  args: {
    audioButton: {
      ...sampleAudioButton,
      title: "効果音",
      description: "配信でよく使う効果音",
      category: "se",
      tags: ["効果音", "SE"],
      duration: 1.2,
      durationText: "0:01",
    },
    size: "md",
    variant: "default",
    showSourceVideo: true,
  },
};
