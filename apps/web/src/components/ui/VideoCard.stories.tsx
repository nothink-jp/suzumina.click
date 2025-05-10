import type { Meta, StoryObj } from "@storybook/react";
import VideoCard from "./VideoCard";

/**
 * 動画カードコンポーネント
 *
 * 動画一覧で表示する各動画のカードを表示するコンポーネントです。
 * サムネイル画像、タイトル、公開日時を表示し、クリックすると詳細ページに遷移します。
 */
const meta = {
  title: "UI/VideoCard",
  component: VideoCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  // カードの幅を適切に表示するためのデコレータ
  decorators: [
    (Story) => (
      <div style={{ width: "320px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VideoCard>;

export default meta;
type Story = StoryObj<typeof VideoCard>;

/**
 * 通常の動画カード
 *
 * 一般的な動画を表示するカードの例です。
 * タイトル、サムネイル画像、公開日時が正しく表示されます。
 */
export const Default: Story = {
  args: {
    video: {
      id: "video-1",
      title: "鈴見奈々子のゲーム実況 #123",
      description: "今日はマインクラフトで新しい建築に挑戦します！",
      publishedAt: new Date("2025-04-25T15:30:00").toString(),
      publishedAtISO: "2025-04-25T15:30:00.000Z",
      lastFetchedAt: new Date("2025-05-01T10:00:00").toString(),
      lastFetchedAtISO: "2025-05-01T10:00:00.000Z",
      thumbnailUrl:
        "https://placehold.jp/3d4070/ffffff/640x360.png?text=鈴見奈々子のゲーム実況%20%23123",
      channelId: "channel-1",
      channelTitle: "鈴見奈々子チャンネル",
    },
  },
};

/**
 * 長いタイトルの動画カード
 *
 * タイトルが長い場合、2行までで切り詰められて表示されます。
 */
export const LongTitle: Story = {
  args: {
    video: {
      id: "video-2",
      title:
        "【超重要】鈴見奈々子の2025年春の新企画発表会！これからの活動について詳しく解説します！お楽しみに！",
      description:
        "新しい企画についての詳細な説明と今後の活動予定について解説しています。",
      publishedAt: new Date("2025-05-01T18:00:00").toString(),
      publishedAtISO: "2025-05-01T18:00:00.000Z",
      lastFetchedAt: new Date("2025-05-02T09:15:00").toString(),
      lastFetchedAtISO: "2025-05-02T09:15:00.000Z",
      thumbnailUrl:
        "https://placehold.jp/70403d/ffffff/640x360.png?text=新企画発表会",
      channelId: "channel-1",
      channelTitle: "鈴見奈々子チャンネル",
    },
  },
};

/**
 * ライブ配信中の動画カード
 *
 * 現在ライブ配信中の動画を表示するカードの例です。
 */
export const LiveBroadcast: Story = {
  args: {
    video: {
      id: "video-3",
      title: "【LIVE】鈴見奈々子のお絵描き配信",
      description: "リスナーのリクエストに応えてお絵描きします！",
      publishedAt: new Date().toString(),
      publishedAtISO: new Date().toISOString(),
      lastFetchedAt: new Date().toString(),
      lastFetchedAtISO: new Date().toISOString(),
      thumbnailUrl:
        "https://placehold.jp/cc3333/ffffff/640x360.png?text=LIVE%20配信中",
      channelId: "channel-1",
      channelTitle: "鈴見奈々子チャンネル",
      liveBroadcastContent: "live",
    },
  },
};

/**
 * 配信予定の動画カード
 *
 * 今後配信予定の動画を表示するカードの例です。
 */
export const UpcomingBroadcast: Story = {
  args: {
    video: {
      id: "video-4",
      title: "【予告】鈴見奈々子のゲーム実況 #124 予定",
      description: "次回のゲーム実況の予告です。",
      publishedAt: new Date("2025-05-10T20:00:00").toString(),
      publishedAtISO: "2025-05-10T20:00:00.000Z",
      lastFetchedAt: new Date("2025-05-05T14:30:00").toString(),
      lastFetchedAtISO: "2025-05-05T14:30:00.000Z",
      thumbnailUrl:
        "https://placehold.jp/3333cc/ffffff/640x360.png?text=配信予定",
      channelId: "channel-1",
      channelTitle: "鈴見奈々子チャンネル",
      liveBroadcastContent: "upcoming",
    },
  },
};

/**
 * サムネイルなしの動画カード
 *
 * サムネイル画像が利用できない場合のフォールバック表示の例です。
 * 実際には画像読み込みエラー時の挙動は別途対応が必要です。
 */
export const WithoutThumbnail: Story = {
  args: {
    video: {
      id: "video-5",
      title: "サムネイルなしの動画",
      description: "何らかの理由でサムネイルが利用できない場合の表示例です。",
      publishedAt: new Date("2025-04-20T12:00:00").toString(),
      publishedAtISO: "2025-04-20T12:00:00.000Z",
      lastFetchedAt: new Date("2025-04-20T12:30:00").toString(),
      lastFetchedAtISO: "2025-04-20T12:30:00.000Z",
      thumbnailUrl: "", // 空の URL
      channelId: "channel-1",
      channelTitle: "鈴見奈々子チャンネル",
    },
  },
};
