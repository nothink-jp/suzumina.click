import type { Meta, StoryObj } from "@storybook/react";
import Header from "./Header";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Layout/Header", // Storybook UIでの表示パス
  component: Header,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: "fullscreen", // ヘッダーは全幅表示が自然なため fullscreen を指定
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    // Props があればここで定義 (Header は現在 Props を受け取らない)
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  // args: { onClick: fn() },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {
    // Story に渡す Props があればここで指定
  },
};

// 必要に応じて他のバリエーションの Story を追加可能
// export const LoggedIn: Story = { ... };
// export const LoggedOut: Story = { ... };
