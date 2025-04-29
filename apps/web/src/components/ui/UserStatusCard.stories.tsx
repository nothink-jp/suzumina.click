import type { Meta, StoryObj } from "@storybook/react";
import UserStatusCard from "./UserStatusCard";

/**
 * ユーザーのログイン状態を表示するコンポーネント
 *
 * ログイン状態に応じて異なる表示をするカードコンポーネントです。
 * ログイン中はユーザー情報とプロフィールへのリンク、
 * 非ログイン時はログインを促すメッセージとログインリンクを表示します。
 */
const meta: Meta<typeof UserStatusCard> = {
  title: "UI/UserStatusCard",
  component: UserStatusCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  // コンポーネントがダークモードで見えるようにする
  decorators: [
    (Story) => (
      <div style={{ width: "300px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UserStatusCard>;

/**
 * 非ログイン状態の表示
 *
 * ユーザーがログインしていない場合の表示
 */
export const LoggedOut: Story = {
  args: {
    user: null,
  },
};

/**
 * ログイン状態の表示（アバターあり）
 *
 * ユーザーがログインしており、プロフィール画像がある場合の表示
 */
export const LoggedInWithAvatar: Story = {
  args: {
    user: {
      uid: "test-uid",
      displayName: "テストユーザー",
      email: "test@example.com",
      emailVerified: true,
      photoURL: "https://placehold.jp/150x150.png",
      disabled: false,
      metadata: {
        creationTime: "2025-04-01T00:00:00.000Z",
        lastSignInTime: "2025-04-28T00:00:00.000Z",
        toJSON: () => ({
          creationTime: "2025-04-01T00:00:00.000Z",
          lastSignInTime: "2025-04-28T00:00:00.000Z",
        }),
      },
      providerData: [],
      toJSON: () => ({
        uid: "test-uid",
        displayName: "テストユーザー",
        email: "test@example.com",
      }),
    },
  },
};

/**
 * ログイン状態の表示（アバターなし）
 *
 * ユーザーがログインしているが、プロフィール画像がない場合の表示
 */
export const LoggedInWithoutAvatar: Story = {
  args: {
    user: {
      uid: "test-uid",
      displayName: "テストユーザー",
      email: "test@example.com",
      emailVerified: true,
      photoURL: undefined, // nullからundefinedに変更（型エラー対応）
      disabled: false,
      metadata: {
        creationTime: "2025-04-01T00:00:00.000Z",
        lastSignInTime: "2025-04-28T00:00:00.000Z",
        toJSON: () => ({
          creationTime: "2025-04-01T00:00:00.000Z",
          lastSignInTime: "2025-04-28T00:00:00.000Z",
        }),
      },
      providerData: [],
      toJSON: () => ({
        uid: "test-uid",
        displayName: "テストユーザー",
        email: "test@example.com",
      }),
    },
  },
};

/**
 * 表示名なしのケース
 *
 * ユーザーの表示名（displayName）が設定されていない場合の表示
 */
export const WithoutDisplayName: Story = {
  args: {
    user: {
      uid: "test-uid",
      displayName: undefined, // nullからundefinedに変更（型エラー対応）
      email: "test@example.com",
      emailVerified: true,
      photoURL: "https://placehold.jp/150x150.png",
      disabled: false,
      metadata: {
        creationTime: "2025-04-01T00:00:00.000Z",
        lastSignInTime: "2025-04-28T00:00:00.000Z",
        toJSON: () => ({
          creationTime: "2025-04-01T00:00:00.000Z",
          lastSignInTime: "2025-04-28T00:00:00.000Z",
        }),
      },
      providerData: [],
      toJSON: () => ({
        uid: "test-uid",
        displayName: undefined, // nullからundefinedに変更（型エラー対応）
        email: "test@example.com",
      }),
    },
  },
};
