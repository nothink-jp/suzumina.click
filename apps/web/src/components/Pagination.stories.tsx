import type { Meta, StoryObj } from "@storybook/react-vite";

import Pagination from "./Pagination";

const meta = {
  title: "Web/Pagination",
  component: Pagination,
  parameters: {
    layout: "centered",
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
    currentPage: {
      control: { type: "number", min: 1 },
    },
    totalPages: {
      control: { type: "number", min: 1 },
    },
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstPage: Story = {
  args: {
    currentPage: 1,
    totalPages: 10,
  },
};

export const MiddlePage: Story = {
  args: {
    currentPage: 5,
    totalPages: 10,
  },
};

export const LastPage: Story = {
  args: {
    currentPage: 10,
    totalPages: 10,
  },
};

export const SinglePage: Story = {
  args: {
    currentPage: 1,
    totalPages: 1,
  },
};

export const ManyPages: Story = {
  args: {
    currentPage: 25,
    totalPages: 100,
  },
};

export const FewPages: Story = {
  args: {
    currentPage: 2,
    totalPages: 3,
  },
};
