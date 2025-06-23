import type { Meta, StoryObj } from "@storybook/react";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

// レイアウト全体を表示するためのラッパーコンポーネント
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      {/* biome-ignore lint/nursery/useUniqueElementIds: Static Storybook component ID */}
      <main id="main-content" className="flex-1 bg-gray-50 p-8">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

const meta: Meta<typeof Layout> = {
  title: "Layout/Complete Layout",
  component: Layout,
  parameters: {
    docs: {
      description: {
        component:
          "ヘッダー、メインコンテンツ、フッターを含む完全なページレイアウト。実際のページ構造を示す。",
      },
    },
    layout: "fullscreen",
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
type Story = StoryObj<typeof Layout>;

export const HomePage: Story = {
  name: "ホームページレイアウト",
  args: {
    children: (
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-900">suzumina.click</h1>
            <p className="text-gray-600 mt-2">
              涼花みなせファンサイトへようこそ
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            🎵 コンテンツを楽しむ
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="p-6 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="text-xl font-medium text-purple-900 mb-2">
                📺 動画一覧
              </h3>
              <p className="text-purple-700">
                涼花みなせさんのYouTube動画を視聴
              </p>
            </div>
            <div className="p-6 bg-muted border rounded-lg">
              <h3 className="text-xl font-medium text-foreground mb-2">
                🎧 音声作品一覧
              </h3>
              <p className="text-muted-foreground">
                DLsite音声作品を探索・購入
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "ホームページの完全なレイアウト。ヘッダー、メインコンテンツ、フッターがどのように配置されるかを示す。",
      },
    },
  },
};

export const VideoListPage: Story = {
  name: "動画一覧ページレイアウト",
  args: {
    children: (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">動画一覧</h1>
            <div className="text-sm text-gray-600">123 件の動画</div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-gray-100 rounded-lg p-4 space-y-3">
                <div className="bg-gray-200 w-full h-40 rounded" />
                <h3 className="font-medium text-gray-900">サンプル動画 {i}</h3>
                <p className="text-sm text-gray-600">動画の説明テキスト...</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-2 bg-primary text-primary-foreground rounded"
              >
                1
              </button>
              <button
                type="button"
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded"
              >
                2
              </button>
              <button
                type="button"
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded"
              >
                3
              </button>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "動画一覧ページの完全なレイアウト。グリッドレイアウトとページネーションを含む。",
      },
    },
  },
};

export const Mobile: Story = {
  name: "モバイルレイアウト",
  args: {
    children: (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h1 className="text-xl font-bold text-gray-900 mb-4">モバイル表示</h1>
          <p className="text-gray-600 mb-4">モバイルデバイスでの表示確認</p>
          <div className="space-y-3">
            <div className="bg-gray-100 p-3 rounded">コンテンツ 1</div>
            <div className="bg-gray-100 p-3 rounded">コンテンツ 2</div>
            <div className="bg-gray-100 p-3 rounded">コンテンツ 3</div>
          </div>
        </div>
      </div>
    ),
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile",
    },
    docs: {
      description: {
        story:
          "モバイルデバイスでの完全なレイアウト表示。ヘッダーのハンバーガーメニューとレスポンシブ対応を確認。",
      },
    },
  },
};
