import type { Meta, StoryObj } from "@storybook/react";
import SiteFooter from "./SiteFooter";

const meta: Meta<typeof SiteFooter> = {
	title: "Components/Navigation/SiteFooter",
	component: SiteFooter,
	parameters: {
		docs: {
			description: {
				component:
					"サイト全体のフッター。サポートページへのリンク、サイト情報、コピーライト情報を含む。レスポンシブ対応。",
			},
		},
		viewport: {
			viewports: {
				mobile: {
					name: "Mobile",
					styles: {
						width: "375px",
						height: "667px",
					},
				},
				tablet: {
					name: "Tablet",
					styles: {
						width: "768px",
						height: "1024px",
					},
				},
				desktop: {
					name: "Desktop",
					styles: {
						width: "1200px",
						height: "800px",
					},
				},
			},
		},
	},
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SiteFooter>;

export const Default: Story = {
	name: "デフォルト",
	parameters: {
		docs: {
			description: {
				story: "通常のフッター表示。サポートリンク、サイト情報、コピーライトが表示される。",
			},
		},
	},
};

export const Mobile: Story = {
	name: "モバイル表示",
	parameters: {
		viewport: {
			defaultViewport: "mobile",
		},
		docs: {
			description: {
				story: "モバイル表示でのフッター。サポートリンクが2列に配置され、モバイルに最適化される。",
			},
		},
	},
};

export const Tablet: Story = {
	name: "タブレット表示",
	parameters: {
		viewport: {
			defaultViewport: "tablet",
		},
		docs: {
			description: {
				story:
					"タブレット表示でのフッター。サポートリンクが4列に配置され、十分なスペースを活用する。",
			},
		},
	},
};

export const Desktop: Story = {
	name: "デスクトップ表示",
	parameters: {
		viewport: {
			defaultViewport: "desktop",
		},
		docs: {
			description: {
				story: "デスクトップ表示でのフッター。最大幅でサポートリンクが4列に配置される。",
			},
		},
	},
};

export const DarkBackground: Story = {
	name: "背景との対比確認",
	parameters: {
		backgrounds: {
			default: "light",
			values: [
				{ name: "light", value: "#f8fafc" },
				{ name: "dark", value: "#1e293b" },
			],
		},
		docs: {
			description: {
				story:
					"異なる背景色でのフッター表示の確認。背景色がどの背景でも適切に表示されることを確認。",
			},
		},
	},
};
