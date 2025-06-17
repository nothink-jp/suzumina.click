import type { Meta, StoryObj } from "@storybook/react";
import SiteHeader from "./SiteHeader";

const meta: Meta<typeof SiteHeader> = {
  title: "Components/Navigation/SiteHeader",
  component: SiteHeader,
  parameters: {
    docs: {
      description: {
        component:
          "サイト全体のヘッダーナビゲーション。デスクトップとモバイルでレスポンシブ対応し、アクセシビリティ機能も含む。",
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
type Story = StoryObj<typeof SiteHeader>;

export const Default: Story = {
  name: "デフォルト",
  parameters: {
    docs: {
      description: {
        story:
          "通常のヘッダー表示。デスクトップではナビゲーションメニューが表示され、モバイルではハンバーガーメニューが表示される。",
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
        story:
          "モバイル表示でのヘッダー。ハンバーガーメニューが表示され、ナビゲーションは非表示になる。",
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
          "タブレット表示でのヘッダー。デスクトップと同様にナビゲーションメニューが表示される。",
      },
    },
  },
};

export const WithMenuOpen: Story = {
  name: "モバイルメニュー展開時",
  parameters: {
    viewport: {
      defaultViewport: "mobile",
    },
    docs: {
      description: {
        story:
          "モバイルでハンバーガーメニューを開いた状態。この状態は実際にはユーザーの操作によって制御される。",
      },
    },
  },
  play: async ({ canvasElement }) => {
    // モバイルメニューボタンをクリックしてメニューを開く
    const canvas = canvasElement as HTMLElement;
    const menuButton = canvas.querySelector(
      '[aria-label*="メニューを開く"]',
    ) as HTMLButtonElement;

    if (menuButton) {
      menuButton.click();
    }
  },
};
