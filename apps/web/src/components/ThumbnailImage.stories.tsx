import type { Meta, StoryObj } from "@storybook/react-vite";

import ThumbnailImage from "./ThumbnailImage";

const meta = {
	title: "Web/ThumbnailImage",
	component: ThumbnailImage,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		src: {
			control: { type: "text" },
		},
		alt: {
			control: { type: "text" },
		},
		className: {
			control: { type: "text" },
		},
	},
} satisfies Meta<typeof ThumbnailImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		src: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
		alt: "Sample video thumbnail",
	},
};

export const WithClassName: Story = {
	args: {
		src: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
		alt: "Sample video thumbnail",
		className: "w-32 h-24 object-cover rounded border-2 border-blue-500",
	},
};

export const BrokenImage: Story = {
	args: {
		src: "https://invalid-url.example.com/broken-image.jpg",
		alt: "This image will fail to load and show fallback",
		className: "w-32 h-24 object-cover rounded",
	},
};

export const LargeSize: Story = {
	args: {
		src: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
		alt: "Large thumbnail",
		className: "w-64 h-48 object-cover rounded-lg shadow-md",
	},
};

export const SmallSize: Story = {
	args: {
		src: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
		alt: "Small thumbnail",
		className: "w-16 h-12 object-cover rounded",
	},
};
