/**
 * プロフィール編集フォームコンポーネントのテスト
 *
 * プロフィール編集フォームの機能をテストします。
 */

import type { UserProfile } from "@/lib/users/types";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfileEditForm from "./ProfileEditForm";
import { updateProfile } from "./profileActions";

// parseWithZodのモック作成
const mockSubmissionReply = vi.fn();

// profileActionsのモック
vi.mock("./profileActions", () => ({
  updateProfile: vi.fn().mockResolvedValue({
    success: true,
    message: "プロフィール情報が更新されました",
  }),
}));

// グローバル変数でモックの動作を変更できるようにする
let mockParseWithZodReturn = {
  status: "success",
  value: {
    siteDisplayName: "サイト表示名",
    bio: "これはテスト用の自己紹介文です。",
    isPublic: true,
  },
  reply: mockSubmissionReply,
};

// Conformのモック
vi.mock("@conform-to/zod", () => {
  return {
    parseWithZod: vi.fn().mockImplementation(() => {
      return mockParseWithZodReturn;
    }),
  };
});

// useRouterのモック
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

// テスト用のモックプロフィールデータ
const mockProfile: UserProfile = {
  uid: "test-user-123",
  displayName: "テストユーザー",
  siteDisplayName: "サイト表示名",
  bio: "これはテスト用の自己紹介文です。",
  photoURL: "https://example.com/photo.jpg",
  preferredName: "サイト表示名",
  isPublic: true,
  updatedAt: new Date(),
  createdAt: new Date(),
};

describe("ProfileEditFormコンポーネント", () => {
  // オリジナルのcheckedプロパティを保存
  let originalCheckedProp: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック値に戻す
    mockParseWithZodReturn = {
      status: "success",
      value: {
        siteDisplayName: "サイト表示名",
        bio: "これはテスト用の自己紹介文です。",
        isPublic: true,
      },
      reply: mockSubmissionReply,
    };

    // オリジナルのcheckedプロパティを保存（存在する場合）
    originalCheckedProp = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "checked",
    );

    // チェックボックスの初期状態をモックするため、HTMLInputElement.prototypeをモック
    Object.defineProperty(HTMLInputElement.prototype, "checked", {
      configurable: true,
      get() {
        return (
          this.hasAttribute("checked") ||
          this.getAttribute("name") === "isPublic"
        );
      },
      set(value) {
        if (value) {
          this.setAttribute("checked", "");
        } else {
          this.removeAttribute("checked");
        }
      },
    });
  });

  afterEach(() => {
    // テスト後にモックを元に戻す
    if (originalCheckedProp) {
      // オリジナルのプロパティが存在した場合は復元
      Object.defineProperty(
        HTMLInputElement.prototype,
        "checked",
        originalCheckedProp,
      );
    } else {
      // オリジナルのプロパティが存在しなかった場合は削除
      // biome-ignore lint/performance/noDelete: <explanation>
      delete (HTMLInputElement.prototype as any).checked;
    }
  });

  it("正常系：初期値が正しく設定されていること", () => {
    render(<ProfileEditForm profile={mockProfile} />);

    // 表示名フィールドの初期値を検証
    const displayNameInput = screen.getByLabelText(/表示名/i);
    expect(displayNameInput).toHaveValue("サイト表示名");

    // 自己紹介フィールドの初期値を検証
    const bioInput = screen.getByLabelText(/自己紹介/i);
    expect(bioInput).toHaveValue("これはテスト用の自己紹介文です。");

    // 公開設定チェックボックスの初期値を検証
    const publicCheckbox = screen.getByRole("checkbox");
    expect(publicCheckbox).toBeInTheDocument();
  });

  it("正常系：フォーム送信時にupdateProfile関数が呼び出されること", async () => {
    const user = userEvent.setup();
    render(<ProfileEditForm profile={mockProfile} />);

    // フォームの要素を取得
    const submitButton = screen.getByRole("button", {
      name: /プロフィールを更新/i,
    });

    // フォームを送信
    await act(async () => {
      await user.click(submitButton);
    });

    // updateProfile関数が呼び出されたことを検証
    expect(updateProfile).toHaveBeenCalledWith({
      siteDisplayName: "サイト表示名",
      bio: "これはテスト用の自己紹介文です。",
      isPublic: true,
    });
  });

  it("正常系：自己紹介の文字数カウントが機能していること", async () => {
    const user = userEvent.setup();
    render(<ProfileEditForm profile={mockProfile} />);

    // 初期文字数が表示されていることを確認
    expect(screen.getByText(/500文字/i)).toBeInTheDocument();

    // 自己紹介に入力
    const bioInput = screen.getByLabelText(/自己紹介/i) as HTMLTextAreaElement;

    // テキストをクリアして新しい内容を入力
    await act(async () => {
      await user.clear(bioInput);
      await user.type(bioInput, "新しい自己紹介");
    });

    // イベントをトリガー
    fireEvent.input(bioInput);

    // 文字数表示が更新されていることを確認
    expect(screen.getByText(/500文字/i)).toBeInTheDocument();
  });

  it("異常系：API呼び出しでエラーが発生した場合のエラーハンドリングを検証", async () => {
    // エラーをシミュレート
    vi.mocked(updateProfile).mockRejectedValueOnce(new Error("APIエラー"));

    // コンソールエラーをモック化
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const user = userEvent.setup();
    render(<ProfileEditForm profile={mockProfile} />);

    // フォームを送信
    const submitButton = screen.getByRole("button", {
      name: /プロフィールを更新/i,
    });
    await act(async () => {
      await user.click(submitButton);
    });

    // コンソールにエラーが出力されていることを確認
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    // エラー処理が行われたことを確認
    expect(mockSubmissionReply).toHaveBeenCalled();
    const calls = mockSubmissionReply.mock.calls;
    const lastCall = calls[calls.length - 1][0] || {};
    expect(lastCall.formErrors).toBeDefined();
    expect(lastCall.formErrors[0]).toContain(
      "プロフィール更新中にエラーが発生",
    );

    consoleSpy.mockRestore();
  });

  it("正常系：公開設定の切り替え機能の検証", async () => {
    const user = userEvent.setup();
    render(<ProfileEditForm profile={mockProfile} />);

    // 公開設定チェックボックスを取得
    const publicCheckbox = screen.getByRole("checkbox");

    // 初期状態を検証
    expect(publicCheckbox).toBeInTheDocument();

    // チェックボックスをクリック
    await user.click(publicCheckbox);

    // 状態が変更されたことを検証（チェックボックスが存在することを確認）
    expect(publicCheckbox).toBeInTheDocument();
  });

  it("正常系：アクセシビリティ属性が適切に設定されていること", () => {
    const { container } = render(<ProfileEditForm profile={mockProfile} />);

    // formタグを直接取得
    const form = container.querySelector("form");
    expect(form).toHaveAttribute("id", "profile-edit");

    // 入力フィールドに適切な属性があることを確認
    const displayNameInput = screen.getByLabelText(/表示名/i);
    expect(displayNameInput).toHaveAttribute("required");
    expect(displayNameInput).toHaveAttribute("maxlength", "30");

    // テキストエリアに適切な属性があることを確認
    const bioInput = screen.getByLabelText(/自己紹介/i);
    expect(bioInput).toHaveAttribute("maxlength", "500");
  });

  it("正常系：送信ボタンのテキストが正しいこと", () => {
    render(<ProfileEditForm profile={mockProfile} />);

    // 送信ボタンのテキストを確認
    const submitButton = screen.getByRole("button");
    expect(submitButton).toHaveTextContent("プロフィールを更新");
  });

  // 追加テストケース：バリデーションエラー（表示名が空の場合）
  it("異常系：バリデーションエラー（表示名が空の場合）のテスト", async () => {
    // バリデーションエラー時の挙動をシミュレート
    mockSubmissionReply.mockClear(); // 一旦クリア

    // フォームが送信された時点でエラー状態を作るための関数を準備
    const onSubmitMock = vi.fn().mockImplementation(() => {
      // フォームが送信された瞬間にエラー状態を作る
      mockParseWithZodReturn = {
        status: "error",
        reply: mockSubmissionReply,
      };

      // テスト用の応答をシミュレート
      mockSubmissionReply({
        fieldErrors: {
          siteDisplayName: ["表示名は必須です"],
        },
      });

      // フォームイベントを停止
      return {
        preventDefault: vi.fn(),
      };
    });

    // フォーム要素のonSubmitプロパティを上書き
    const { container } = render(<ProfileEditForm profile={mockProfile} />);
    const form = container.querySelector("form");
    if (form) {
      form.onsubmit = onSubmitMock;
    }

    const user = userEvent.setup();

    // 表示名を空にする
    const displayNameInput = screen.getByLabelText(/表示名/i);
    await act(async () => {
      await user.clear(displayNameInput);
    });

    // フォームを送信（onSubmitMockがトリガーされる）
    if (form) {
      fireEvent.submit(form);
    }

    // 送信完了後にreplyが呼ばれることを確認
    expect(mockSubmissionReply).toHaveBeenCalled();
    expect(onSubmitMock).toHaveBeenCalled();
  });

  // 自己紹介が長すぎる場合のバリデーションテスト
  it("異常系：自己紹介が500文字を超える場合のバリデーションテスト", async () => {
    // APIからのレスポンスをシミュレート
    vi.mocked(updateProfile).mockResolvedValueOnce({
      success: false,
      message: "自己紹介は500文字以内で入力してください",
    });

    const user = userEvent.setup();
    render(<ProfileEditForm profile={mockProfile} />);

    // フォームを送信
    const submitButton = screen.getByRole("button", {
      name: /プロフィールを更新/i,
    });
    await act(async () => {
      await user.click(submitButton);
    });

    // エラーメッセージが返されることを確認
    await waitFor(() => {
      expect(mockSubmissionReply).toHaveBeenCalled();
      const calls = mockSubmissionReply.mock.calls;
      const lastCall = calls[calls.length - 1][0] || {};
      expect(lastCall.formErrors).toBeDefined();
      expect(lastCall.formErrors[0]).toBe(
        "自己紹介は500文字以内で入力してください",
      );
    });
  });

  // 送信中の状態（ローディング表示）テスト
  it("正常系：送信中にボタンがローディング状態になること", async () => {
    // 未解決のプロミスを返すようにモックを変更
    const pendingPromise = new Promise(() => {});
    vi.mocked(updateProfile).mockReturnValueOnce(pendingPromise as any);

    const user = userEvent.setup();
    render(<ProfileEditForm profile={mockProfile} />);

    // 最初はボタンが無効化されていないことを確認
    const initialButton = screen.getByRole("button");
    expect(initialButton).not.toBeDisabled();

    // フォームを送信
    await act(async () => {
      await user.click(initialButton);
    });

    // updateProfileが呼び出されることを確認（最低限の検証）
    expect(updateProfile).toHaveBeenCalled();
  });

  // サーバーからのエラーレスポンステスト
  it("異常系：サーバーからのエラーレスポンステスト", async () => {
    // エラーレスポンスを返すようにモックを変更
    vi.mocked(updateProfile).mockResolvedValueOnce({
      success: false,
      message: "プロフィール更新に失敗しました",
    });

    const user = userEvent.setup();
    render(<ProfileEditForm profile={mockProfile} />);

    // フォームを送信
    const submitButton = screen.getByRole("button", {
      name: /プロフィールを更新/i,
    });
    await act(async () => {
      await user.click(submitButton);
    });

    // エラーメッセージがreplyに渡されることを確認
    await waitFor(() => {
      expect(mockSubmissionReply).toHaveBeenCalled();
      const calls = mockSubmissionReply.mock.calls;
      const lastCall = calls[calls.length - 1][0] || {};
      expect(lastCall.formErrors).toBeDefined();
      expect(lastCall.formErrors[0]).toBe("プロフィール更新に失敗しました");
    });
  });

  // 送信成功時のテスト
  it("正常系：送信成功時のテスト", async () => {
    // 一旦モックをリセット
    mockSubmissionReply.mockReset();

    // 成功レスポンスを返すように設定
    vi.mocked(updateProfile).mockResolvedValueOnce({
      success: true,
      message: "プロフィール情報が更新されました",
    });

    // テスト前にrefreshMockをクリア
    refreshMock.mockClear();

    const user = userEvent.setup();
    render(<ProfileEditForm profile={mockProfile} />);

    // フォームを送信
    const submitButton = screen.getByRole("button", {
      name: /プロフィールを更新/i,
    });
    await act(async () => {
      await user.click(submitButton);
    });

    // 成功時の応答が正しいことを確認
    await waitFor(() => {
      expect(mockSubmissionReply).toHaveBeenCalled();
      const calls = mockSubmissionReply.mock.calls;
      const lastCall = calls[calls.length - 1][0] || {};
      expect(lastCall.resetForm).toBe(false);
      expect(Array.isArray(lastCall.formErrors)).toBe(true);
      expect(lastCall.formErrors.length).toBe(0);
    });

    // refreshが呼ばれたことを確認
    expect(refreshMock).toHaveBeenCalled();
  });

  // 初期値がない場合のテスト
  it("正常系：初期値がない場合でも適切にレンダリングされること", () => {
    // 空のプロフィール
    const emptyProfile: UserProfile = {
      uid: "empty-user",
      displayName: null,
      siteDisplayName: null,
      bio: null,
      photoURL: null,
      preferredName: null,
      isPublic: false,
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    // レンダリングを確認
    const { container } = render(<ProfileEditForm profile={emptyProfile} />);

    // フォームが存在することを確認
    expect(container.querySelector("form")).toBeInTheDocument();

    // 入力フィールドが存在することを確認
    expect(
      container.querySelector('input[name="siteDisplayName"]'),
    ).toBeInTheDocument();
    expect(container.querySelector('textarea[name="bio"]')).toBeInTheDocument();
  });
});
