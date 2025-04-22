import type { Meta, StoryObj } from "@storybook/react";
import type { IdTokenResult, User } from "firebase/auth"; // Firebase Userの型をインポート
import type React from "react";

// モック関数の型定義
interface MockFn<T = void, R = unknown> {
  (...args: T[]): R;
  calls: T[][];
  returnValue: R | ((...args: T[]) => R);
  mockReturnValue(value: R): MockFn<T, R>;
  mockResolvedValue<V>(value: V): MockFn<T, Promise<V>>;
  mockImplementation(impl: (...args: T[]) => R): MockFn<T, R>;
}

// モック関数を作成するヘルパー関数（テスト用）
const createMockFn = <T = void, R = unknown>(returnValue?: R): MockFn<T, R> => {
  const mockFn: MockFn<T, R> = (...args: T[]) => {
    mockFn.calls.push(args);
    return typeof mockFn.returnValue === "function"
      ? (mockFn.returnValue as (...args: T[]) => R)(...args)
      : mockFn.returnValue;
  };
  mockFn.calls = [];
  mockFn.returnValue = returnValue as R;

  // メソッドを定義
  mockFn.mockReturnValue = (value: R) => {
    mockFn.returnValue = value;
    return mockFn;
  };

  // biome-ignore lint/complexity/useArrowFunction: <explanation>
  mockFn.mockResolvedValue = function <V>(value: V) {
    mockFn.returnValue = Promise.resolve(value) as unknown as R;
    return mockFn as unknown as MockFn<T, Promise<V>>;
  };

  mockFn.mockImplementation = (impl: (...args: T[]) => R) => {
    mockFn.returnValue = impl;
    return mockFn;
  };

  return mockFn;
};

// モック用のユーザーオブジェクトを作成
const createMockUser = (overrides?: Partial<User>): Partial<User> => {
  return {
    uid: "test-user-id",
    displayName: "テストユーザー",
    email: "test@example.com",
    photoURL: "https://via.placeholder.com/150",
    emailVerified: false,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: "",
    tenantId: null,
    phoneNumber: null,
    providerId: "firebase",
    // Firebase User型が要求するメソッド
    delete: createMockFn<void, Promise<void>>().mockResolvedValue(undefined),
    getIdToken: createMockFn<
      boolean | undefined,
      Promise<string>
    >().mockResolvedValue("mock-token"),
    getIdTokenResult: createMockFn<
      boolean | undefined,
      Promise<IdTokenResult>
    >().mockResolvedValue({
      authTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 3600000).toISOString(), // 1時間後
      issuedAtTime: new Date().toISOString(),
      signInProvider: "discord.com",
      signInSecondFactor: null,
      token: "mock-id-token",
      claims: {},
    }),
    reload: createMockFn<void, Promise<void>>().mockResolvedValue(undefined),
    toJSON: createMockFn<void, Record<string, unknown>>().mockReturnValue({}),
    ...overrides,
  };
};

// 元のAuthButtonコンポーネントをモックした、Storybook用のコンポーネント
// このコンポーネントは純粋にUIのテストを目的としており、実際のロジックは含まない
const MockAuthButton = ({
  user = null,
  loading = false,
}: {
  user?: User | null;
  loading?: boolean;
}): React.ReactElement => {
  // ハンドラー関数のモック
  const handleLogin = (): void => {
    console.log("ログインボタンがクリックされました");
    // ログイン処理はモックなので実際には何も行わない
  };

  // asyncな関数は返り値の型がPromise<void>となるため、明示的に値を返す必要がある
  const handleLogout = async (): Promise<void> => {
    console.log("ログアウトボタンがクリックされました");
    // ログアウト処理はモックなので実際には何も行わない
    return Promise.resolve(); // 明示的にPromiseを返す
  };

  // 読み込み中の表示
  if (loading) {
    return <span className="loading loading-spinner loading-sm" />;
  }

  // ユーザーがログインしている場合
  if (user) {
    return (
      <div className="dropdown dropdown-end">
        <button
          type="button"
          tabIndex={0}
          className="btn btn-ghost btn-circle avatar"
        >
          <div className="w-10 rounded-full">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="User Avatar" />
            ) : (
              <div className="avatar placeholder">
                <div className="bg-neutral text-neutral-content rounded-full w-10">
                  <span className="text-xl">
                    {user.displayName?.charAt(0) || "?"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </button>
        <ul className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
          <li className="menu-title">
            <span>{user.displayName || user.uid}</span>
          </li>
          <li>
            <button type="button" onClick={handleLogout}>
              ログアウト
            </button>
          </li>
        </ul>
      </div>
    );
  }

  // ユーザーがログインしていない場合
  return (
    <button
      type="button"
      onClick={handleLogin}
      className="btn btn-primary btn-sm"
    >
      Discord でログイン
    </button>
  );
};

// Storybookでのコンポーネント設定
const meta = {
  title: "UI/AuthButton", // Storybook UIでの表示パス
  component: MockAuthButton, // モックコンポーネントを使用
  parameters: {
    // コンポーネントをキャンバスの中央に配置するオプションパラメータ
    layout: "centered",
    // モジュールをモックするためのStorybookの設定
    mockData: {
      // 実際のネットワークリクエストやFirebaseの操作を無効化
      disableNetworkRequests: true,
    },
  },
  // アーギュメントの定義
  argTypes: {
    user: {
      control: "object",
      description: "ユーザー情報", // 日本語の説明
    },
    loading: {
      control: "boolean",
      description: "読み込み中フラグ", // 日本語の説明
    },
  },
  // 自動ドキュメント生成を有効化
  tags: ["autodocs"],
  // デコレーターを使用してモックコンテキストを提供
  decorators: [
    (Story) => (
      // ここでStorybook用のモックコンテキストを提供
      <Story />
    ),
  ],
} satisfies Meta<typeof MockAuthButton>;

export default meta;
type Story = StoryObj<typeof MockAuthButton>;

// 未ログイン状態のストーリー
export const NotLoggedIn: Story = {
  name: "未ログイン状態", // 日本語でストーリー名を設定
  args: {
    user: null,
    loading: false,
  },
};

// ログイン状態のストーリー
export const LoggedIn: Story = {
  name: "ログイン状態", // 日本語でストーリー名を設定
  args: {
    user: createMockUser() as User,
    loading: false,
  },
};

// ロード中状態のストーリー
export const Loading: Story = {
  name: "ロード中状態", // 日本語でストーリー名を設定
  args: {
    user: null,
    loading: true,
  },
};
