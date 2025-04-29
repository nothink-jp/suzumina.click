import type { Meta, StoryObj } from "@storybook/react";
import Hero from "./Hero";

/**
 * トップページや重要なセクションで使用するHeroコンポーネント
 *
 * DaisyUIのheroコンポーネントをベースにしています。
 * タイトル、サブタイトル、背景画像などのカスタマイズが可能です。
 */
const meta: Meta<typeof Hero> = {
  title: "UI/Hero",
  component: Hero,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    alignment: {
      control: { type: "radio" },
      options: ["center", "start"],
      description: "コンテンツの配置（中央揃えまたは左揃え）",
    },
    backgroundImage: {
      control: "text",
      description: "背景画像のURL",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Hero>;

/**
 * デフォルトのヒーロー表示
 *
 * シンプルにタイトルのみを表示するパターン
 */
export const Default: Story = {
  args: {
    title: "すずみなくりっく！",
  },
};

/**
 * サブタイトル付きのヒーロー
 *
 * タイトルとサブタイトルを表示するパターン
 */
export const WithSubtitle: Story = {
  args: {
    title: "すずみなくりっく！",
    subtitle:
      "ようこそ！ここは涼花みなせさんの活動を応援する非公式ファンサイトです。",
  },
};

/**
 * 背景画像付きのヒーロー
 *
 * 背景画像を設定したパターン
 */
export const WithBackgroundImage: Story = {
  args: {
    title: "すずみなくりっく！",
    subtitle: "涼花みなせさんの活動を応援する非公式ファンサイト",
    backgroundImage: "https://placehold.jp/1200x400.png",
  },
};

/**
 * ボタン付きのヒーロー
 *
 * タイトル、サブタイトル、アクションボタンを表示するパターン
 */
export const WithButton: Story = {
  args: {
    title: "すずみなくりっく！",
    subtitle: "涼花みなせさんの活動を応援する非公式ファンサイト",
    children: (
      <button type="button" className="btn btn-primary">
        もっと詳しく
      </button>
    ),
  },
};

/**
 * 左揃えのヒーロー
 *
 * コンテンツを左揃えにしたパターン
 */
export const LeftAligned: Story = {
  args: {
    title: "すずみなくりっく！",
    subtitle: "涼花みなせさんの活動を応援する非公式ファンサイト",
    alignment: "start",
    children: (
      <button type="button" className="btn btn-primary">
        もっと詳しく
      </button>
    ),
  },
};
