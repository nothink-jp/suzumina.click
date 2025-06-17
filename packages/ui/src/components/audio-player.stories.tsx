import type { Meta, StoryObj } from "@storybook/react";
import { AudioPlayer } from "./audio-player.js";

const meta: Meta<typeof AudioPlayer> = {
  title: "UI/AudioPlayer",
  component: AudioPlayer,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: { type: "select" },
      options: ["sm", "md", "lg"],
    },
    variant: {
      control: { type: "select" },
      options: ["default", "compact", "minimal"],
    },
    autoPlay: {
      control: { type: "boolean" },
    },
    loop: {
      control: { type: "boolean" },
    },
    showTitle: {
      control: { type: "boolean" },
    },
    showProgress: {
      control: { type: "boolean" },
    },
    showVolume: {
      control: { type: "boolean" },
    },
    showSkipButtons: {
      control: { type: "boolean" },
    },
    showReplayButton: {
      control: { type: "boolean" },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// サンプル音声URL（実際の開発では実際の音声ファイルを使用）
const sampleAudioUrl =
  "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav";

export const Default: Story = {
  args: {
    src: sampleAudioUrl,
    title: "サンプル音声ボタン",
    showTitle: true,
    showProgress: true,
    showVolume: true,
    showSkipButtons: false,
    showReplayButton: true,
    size: "md",
    variant: "default",
  },
};

export const Compact: Story = {
  args: {
    src: sampleAudioUrl,
    title: "コンパクト版",
    showTitle: true,
    showProgress: true,
    showVolume: true,
    showSkipButtons: false,
    showReplayButton: true,
    size: "sm",
    variant: "compact",
  },
};

export const Minimal: Story = {
  args: {
    src: sampleAudioUrl,
    title: "ミニマル版",
    showTitle: false,
    showProgress: true,
    showVolume: false,
    showSkipButtons: false,
    showReplayButton: false,
    size: "sm",
    variant: "minimal",
  },
};

export const WithSkipButtons: Story = {
  args: {
    src: sampleAudioUrl,
    title: "スキップボタン付き",
    showTitle: true,
    showProgress: true,
    showVolume: true,
    showSkipButtons: true,
    showReplayButton: true,
    size: "md",
    variant: "default",
  },
};

export const Large: Story = {
  args: {
    src: sampleAudioUrl,
    title: "大きなプレイヤー",
    showTitle: true,
    showProgress: true,
    showVolume: true,
    showSkipButtons: true,
    showReplayButton: true,
    size: "lg",
    variant: "default",
  },
};

export const WithCallbacks: Story = {
  args: {
    src: sampleAudioUrl,
    title: "コールバック付き",
    showTitle: true,
    showProgress: true,
    showVolume: true,
    showSkipButtons: false,
    showReplayButton: true,
    size: "md",
    variant: "default",
    onPlay: () => console.log("再生開始"),
    onPause: () => console.log("一時停止"),
    onEnded: () => console.log("再生終了"),
    onError: (error: Event) => console.error("エラー:", error),
    onTimeUpdate: (currentTime: number, duration: number) =>
      console.log(
        `再生時間: ${currentTime.toFixed(1)}秒 / ${duration.toFixed(1)}秒`,
      ),
  },
};

export const AutoPlay: Story = {
  args: {
    src: sampleAudioUrl,
    title: "自動再生",
    autoPlay: true,
    showTitle: true,
    showProgress: true,
    showVolume: true,
    showSkipButtons: false,
    showReplayButton: true,
    size: "md",
    variant: "default",
  },
};

export const Loop: Story = {
  args: {
    src: sampleAudioUrl,
    title: "ループ再生",
    loop: true,
    showTitle: true,
    showProgress: true,
    showVolume: true,
    showSkipButtons: false,
    showReplayButton: true,
    size: "md",
    variant: "default",
  },
};
