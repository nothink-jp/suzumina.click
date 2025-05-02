import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";
import * as audioclips from "../../app/actions/audioclips";
import { useAuth } from "../../lib/firebase/AuthProvider";
import type { YouTubePlayer } from "../videos/YouTubeEmbed";
import AudioClipCreator from "./AudioClipCreator";

// useAuthフックをモック化
vi.mock("../../lib/firebase/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

// createAudioClipアクションをモック化
vi.mock("../../app/actions/audioclips", () => ({
  createAudioClip: vi.fn(),
}));

/**
 * モックのYouTubeプレーヤー参照を作成する関数
 * @param currentTimeValue 初期の現在時刻値（デフォルト: 30）
 * @returns モック化されたYouTubeプレーヤー参照
 */
const createMockYouTubePlayerRef = (currentTimeValue = 30) => {
  const mockPlayer = {
    getCurrentTime: vi.fn().mockReturnValue(currentTimeValue),
    seekTo: vi.fn(),
    playVideo: vi.fn(),
    pauseVideo: vi.fn(),
  } as unknown as YouTubePlayer;

  return {
    current: mockPlayer,
  } as React.RefObject<YouTubePlayer>;
};

describe("AudioClipCreatorコンポーネント", () => {
  // テスト用の共通プロップス
  let mockProps: {
    videoId: string;
    videoTitle: string;
    onClipCreated: Mock;
    youtubePlayerRef: React.RefObject<YouTubePlayer>;
  };

  // テスト前の共通セットアップ
  beforeEach(() => {
    // 毎回新しいモックインスタンスを作成して副作用を防ぐ
    mockProps = {
      videoId: "test-video-123",
      videoTitle: "テスト動画",
      onClipCreated: vi.fn(),
      youtubePlayerRef: createMockYouTubePlayerRef(),
    };

    vi.clearAllMocks();

    // デフォルトではログイン状態のモックを設定
    (useAuth as Mock).mockReturnValue({
      user: {
        uid: "test-user-123",
        displayName: "テストユーザー",
        photoURL: "https://example.com/photo.jpg",
      },
    });
  });

  it("コンポーネントが正しくレンダリングされること", () => {
    // Arrange - テスト対象コンポーネントをレンダリング
    render(<AudioClipCreator {...mockProps} />);

    // Act - ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // Assert - 基本的なフォーム要素が表示されているか確認
    expect(screen.getByLabelText(/タイトル/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/フレーズ/i)).toBeInTheDocument();
    expect(screen.getByText(/開始時間/i)).toBeInTheDocument();
    expect(screen.getByText(/終了時間/i)).toBeInTheDocument();
  });

  it("ログインしていない場合は警告メッセージが表示されること", () => {
    // Arrange - 未ログイン状態のモックを設定
    (useAuth as Mock).mockReturnValue({ user: null });
    render(<AudioClipCreator {...mockProps} />);

    // Act - ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // Assert - 警告メッセージと無効化されたボタンを確認
    expect(
      screen.getByText("音声クリップを作成するにはログインが必要です"),
    ).toBeInTheDocument();
    const submitButton = screen.getByText("クリップを作成");
    expect(submitButton).toBeDisabled();
  });

  it("「現在位置を設定」ボタンが機能すること（開始時間）", () => {
    // Arrange
    // 開始時間の現在位置として30秒を返すモックを設定
    const mockYoutubeRef = createMockYouTubePlayerRef(30);
    const props = { ...mockProps, youtubePlayerRef: mockYoutubeRef };
    render(<AudioClipCreator {...props} />);

    // ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // Act - 開始時間のボタンをクリック
    const startTimeButton = screen.getAllByText("現在位置を設定")[0];
    act(() => {
      fireEvent.click(startTimeButton);
    });

    // Assert
    // モックプレイヤーのgetCurrentTime関数が呼ばれたことを確認
    expect(mockYoutubeRef.current.getCurrentTime).toHaveBeenCalled();
    // 表示が更新されていることを確認
    expect(screen.getByText("0:30")).toBeInTheDocument();
  });

  it("「現在位置を設定」ボタンが機能すること（終了時間）", () => {
    // Arrange
    // 独自の参照を設定して現在時刻を明示的に指定
    const mockYoutubeRef = createMockYouTubePlayerRef();
    const props = { ...mockProps, youtubePlayerRef: mockYoutubeRef };
    render(<AudioClipCreator {...props} />);

    // ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // まず開始時間を設定
    const startTimeButton = screen.getAllByText("現在位置を設定")[0];
    act(() => {
      // 開始時間として30秒を設定（デフォルト値）
      fireEvent.click(startTimeButton);
    });

    // Act - 次に終了時間を設定
    const endTimeButton = screen.getAllByText("現在位置を設定")[1];
    act(() => {
      // 終了時間のモックを明示的に上書き
      mockYoutubeRef.current.getCurrentTime = vi.fn().mockReturnValue(60);
      fireEvent.click(endTimeButton);
    });

    // Assert
    // モックプレイヤーのgetCurrentTime関数が呼ばれたことを確認
    expect(mockYoutubeRef.current.getCurrentTime).toHaveBeenCalled();
    // 終了時間が設定されたことを確認
    expect(screen.getByText("1:00")).toBeInTheDocument();
  });

  it("開始時間と終了時間が同じ場合、自動的に1秒の間隔が設定されること", () => {
    // Arrange
    // 独自の参照を設定して現在時刻を明示的に指定
    const mockYoutubeRef = createMockYouTubePlayerRef(60);
    const props = { ...mockProps, youtubePlayerRef: mockYoutubeRef };
    render(<AudioClipCreator {...props} />);

    // ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // Act
    // まず開始時間を設定（60秒）
    const startTimeButton = screen.getAllByText("現在位置を設定")[0];
    act(() => {
      fireEvent.click(startTimeButton);
    });

    // 次に終了時間を設定（開始時間と同じ60秒）- キーポイント: 同一参照時間
    const endTimeButton = screen.getAllByText("現在位置を設定")[1];
    act(() => {
      // あえて同じ60秒を返すように設定
      fireEvent.click(endTimeButton);
    });

    // Assert
    // 1秒間隔が自動的に追加されて61秒になっているか確認
    // フォーマットされた表示は1:01になるはず
    expect(screen.getByText("1:01")).toBeInTheDocument();
  });

  it("終了時間が開始時間より前の場合、エラーが表示されること", () => {
    // Arrange
    render(<AudioClipCreator {...mockProps} />);

    // ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // まず開始時間を60秒に設定
    const startTimeButton = screen.getAllByText("現在位置を設定")[0];
    act(() => {
      // 明示的にモックを設定
      mockProps.youtubePlayerRef.current.getCurrentTime = vi
        .fn()
        .mockReturnValue(60);
      fireEvent.click(startTimeButton);
    });

    // Act
    // 次に終了時間を50秒（開始時間より前）に設定
    const endTimeButton = screen.getAllByText("現在位置を設定")[1];
    act(() => {
      // 明示的に別の値を設定
      mockProps.youtubePlayerRef.current.getCurrentTime = vi
        .fn()
        .mockReturnValue(50);
      fireEvent.click(endTimeButton);
    });

    // Assert
    // エラーメッセージが表示されることを確認
    expect(
      screen.getByText("終了時間は開始時間より後に設定してください"),
    ).toBeInTheDocument();
  });

  it("開始時間が設定されていない状態で終了時間を設定すると、開始時間が自動的に設定されること", () => {
    // Arrange
    // 現在時刻として60秒を返すモックを設定
    const mockYoutubeRef = createMockYouTubePlayerRef(60);
    const props = { ...mockProps, youtubePlayerRef: mockYoutubeRef };
    render(<AudioClipCreator {...props} />);

    // ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // Act
    // 開始時間を設定せずに終了時間を設定
    const endTimeButton = screen.getAllByText("現在位置を設定")[1];
    act(() => {
      fireEvent.click(endTimeButton);
    });

    // Assert
    // 開始時間が自動的に設定されること（60-5=55秒）
    expect(screen.getByText("0:55")).toBeInTheDocument();
    // 終了時間が設定されていること（60秒）
    expect(screen.getByText("1:00")).toBeInTheDocument();
  });

  it("時間のフォーマット関数が正しく動作すること", () => {
    // Arrange
    render(<AudioClipCreator {...mockProps} />);

    // ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // 異なる時間値でテスト
    const startTimeButton = screen.getAllByText("現在位置を設定")[0];
    const endTimeButton = screen.getAllByText("現在位置を設定")[1];

    // Act & Assert
    // 1. 分単位のフォーマット（例: 90秒 → 1:30）
    act(() => {
      mockProps.youtubePlayerRef.current.getCurrentTime = vi
        .fn()
        .mockReturnValue(90);
      fireEvent.click(startTimeButton);
    });
    expect(screen.getByText("1:30")).toBeInTheDocument();

    // 2. 10分以上のフォーマット（例: 650秒 → 10:50）
    act(() => {
      mockProps.youtubePlayerRef.current.getCurrentTime = vi
        .fn()
        .mockReturnValue(650);
      fireEvent.click(endTimeButton);
    });
    expect(screen.getByText("10:50")).toBeInTheDocument();
  });

  it("「選択範囲を再生」ボタンをクリックするとプレビューが再生されること", () => {
    // Arrange
    // テスト用のモックを明示的に作成して初期化する
    const expectedStartTime = 30;
    const mockYoutubeRef = createMockYouTubePlayerRef(expectedStartTime);
    const props = { ...mockProps, youtubePlayerRef: mockYoutubeRef };

    render(<AudioClipCreator {...props} />);

    // ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // まず開始時間と終了時間を設定
    const startTimeButton = screen.getAllByText("現在位置を設定")[0];
    const endTimeButton = screen.getAllByText("現在位置を設定")[1];

    act(() => {
      // 開始時間を設定
      fireEvent.click(startTimeButton);

      // 終了時間は明示的に別の値に設定
      mockYoutubeRef.current.getCurrentTime = vi.fn().mockReturnValue(60);
      fireEvent.click(endTimeButton);
    });

    // Act
    // プレビューボタンをクリック
    const previewButton = screen.getByText("選択範囲を再生");
    fireEvent.click(previewButton);

    // Assert
    // seekToとplayVideoが正しいパラメータで呼ばれたことを確認
    expect(mockYoutubeRef.current.seekTo).toHaveBeenCalledWith(
      expectedStartTime,
      true,
    );
    expect(mockYoutubeRef.current.playVideo).toHaveBeenCalled();
  });

  it("空のタグは追加されないこと", () => {
    // Arrange
    render(<AudioClipCreator {...mockProps} />);

    // ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // タグ入力フィールドを取得
    const tagInput = screen.getByPlaceholderText("タグを入力（Enterで追加）");

    // Act
    // 空文字で「追加」
    fireEvent.change(tagInput, { target: { value: "" } });
    fireEvent.click(screen.getByText("追加"));

    // 空白のみのタグも追加
    fireEvent.change(tagInput, { target: { value: "   " } });
    fireEvent.click(screen.getByText("追加"));

    // Assert
    // タグが1つも表示されていないことを確認
    const badges = document.querySelectorAll(".badge");
    expect(badges.length).toBe(0);
  });

  it("重複するタグは追加されないこと", () => {
    // Arrange
    render(<AudioClipCreator {...mockProps} />);

    // ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // タグ入力フィールドを取得
    const tagInput = screen.getByPlaceholderText("タグを入力（Enterで追加）");

    // Act
    // 同じタグを2回追加
    fireEvent.change(tagInput, { target: { value: "重複タグ" } });
    fireEvent.click(screen.getByText("追加"));

    // 入力欄が空になっていることを確認
    expect(tagInput).toHaveValue("");

    // 同じタグをもう一度追加
    fireEvent.change(tagInput, { target: { value: "重複タグ" } });
    fireEvent.click(screen.getByText("追加"));

    // Assert
    // タグは1つだけ表示されているはず
    const badges = document.querySelectorAll(".badge");
    expect(badges.length).toBe(1);
  });

  it("タグの追加と削除が機能すること", () => {
    // Arrange
    render(<AudioClipCreator {...mockProps} />);

    // ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // タグ入力フィールドを取得
    const tagInput = screen.getByPlaceholderText("タグを入力（Enterで追加）");

    // Act - タグを追加
    fireEvent.change(tagInput, { target: { value: "テストタグ" } });

    // 「追加」ボタンをクリック
    const addButton = screen.getByText("追加");
    fireEvent.click(addButton);

    // Assert - タグが表示されたことを確認
    expect(screen.getByText("テストタグ")).toBeInTheDocument();

    // Act - タグの削除
    const removeButton = screen.getByLabelText("テストタグタグを削除");
    fireEvent.click(removeButton);

    // Assert - タグが削除されたことを確認
    expect(screen.queryByText("テストタグ")).not.toBeInTheDocument();
  });

  it("Enterキーでもタグが追加できること", () => {
    // Arrange
    render(<AudioClipCreator {...mockProps} />);

    // ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // タグ入力フィールドを取得
    const tagInput = screen.getByPlaceholderText("タグを入力（Enterで追加）");

    // Act - タグを入力してEnterキーを押す
    fireEvent.change(tagInput, { target: { value: "キーボードタグ" } });
    fireEvent.keyDown(tagInput, { key: "Enter", code: "Enter" });

    // Assert - タグが追加されたことを確認
    expect(screen.getByText("キーボードタグ")).toBeInTheDocument();
  });

  it("フォームを送信すると音声クリップが作成されること", async () => {
    // Arrange
    // createAudioClipが成功を返すようにモック
    (audioclips.createAudioClip as Mock).mockResolvedValue({
      success: true,
      data: { id: "new-clip-123" },
    });

    // 独自のモックを使用
    const mockYoutubeRef = createMockYouTubePlayerRef(30);
    const props = { ...mockProps, youtubePlayerRef: mockYoutubeRef };
    render(<AudioClipCreator {...props} />);

    // ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // Act
    // 1. タイトルを入力
    const titleInput = screen.getByLabelText(/タイトル/i);
    fireEvent.change(titleInput, { target: { value: "テストクリップ" } });

    // 2. フレーズを入力
    const phraseInput = screen.getByLabelText(/フレーズ/i);
    fireEvent.change(phraseInput, { target: { value: "テストフレーズです" } });

    // 3. 開始時間と終了時間を設定
    const startTimeButton = screen.getAllByText("現在位置を設定")[0];
    const endTimeButton = screen.getAllByText("現在位置を設定")[1];

    act(() => {
      // 開始時間を30秒に設定（デフォルト）
      fireEvent.click(startTimeButton);

      // 終了時間を60秒に設定
      mockYoutubeRef.current.getCurrentTime = vi.fn().mockReturnValue(60);
      fireEvent.click(endTimeButton);
    });

    // 4. タグを追加
    const tagInput = screen.getByPlaceholderText("タグを入力（Enterで追加）");
    fireEvent.change(tagInput, { target: { value: "テストタグ" } });
    fireEvent.click(screen.getByText("追加"));

    // 5. フォームを送信
    const submitButton = screen.getByText("クリップを作成");
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Assert
    // createAudioClipが呼ばれたことを確認
    expect(audioclips.createAudioClip).toHaveBeenCalledWith(
      expect.objectContaining({
        videoId: "test-video-123",
        title: "テストクリップ",
        phrase: "テストフレーズです",
        userId: "test-user-123",
        tags: ["テストタグ"],
      }),
    );

    // 成功メッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText("クリップを作成しました")).toBeInTheDocument();
    });

    // onClipCreated コールバックが呼ばれたことを確認
    expect(mockProps.onClipCreated).toHaveBeenCalled();
  });

  it("フォーム送信失敗時にエラーが表示されること", async () => {
    // Arrange
    // createAudioClipが失敗を返すようにモック
    (audioclips.createAudioClip as Mock).mockRejectedValue(
      new Error("サーバーエラー"),
    );

    render(<AudioClipCreator {...mockProps} />);

    // ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // Act
    // 1. 最低限必要な入力を設定
    const titleInput = screen.getByLabelText(/タイトル/i);
    fireEvent.change(titleInput, { target: { value: "テストクリップ" } });

    // 2. 開始時間と終了時間を設定
    const startTimeButton = screen.getAllByText("現在位置を設定")[0];
    const endTimeButton = screen.getAllByText("現在位置を設定")[1];

    act(() => {
      // 明示的に各値を設定
      mockProps.youtubePlayerRef.current.getCurrentTime = vi
        .fn()
        .mockReturnValue(30);
      fireEvent.click(startTimeButton);

      mockProps.youtubePlayerRef.current.getCurrentTime = vi
        .fn()
        .mockReturnValue(60);
      fireEvent.click(endTimeButton);
    });

    // 3. フォームを送信
    const submitButton = screen.getByText("クリップを作成");
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Assert
    // エラーメッセージが表示されることを確認
    await waitFor(() => {
      expect(
        screen.getByText("音声クリップの作成に失敗しました"),
      ).toBeInTheDocument();
    });
  });

  // YouTube APIのエラー処理をテスト
  it("YouTube PlayerのAPIがエラーを起こした場合も正常に処理されること", () => {
    // Arrange
    // YouTubeプレーヤーの参照をモック化し、APIがエラーを投げるように設定
    const errorPlayerRef = {
      current: {
        getCurrentTime: vi.fn().mockImplementation(() => {
          throw new Error("YouTube APIエラー");
        }),
        seekTo: vi.fn(),
        playVideo: vi.fn(),
        pauseVideo: vi.fn(),
      },
    } as unknown as React.RefObject<YouTubePlayer>;

    const propsWithErrorPlayer = {
      ...mockProps,
      youtubePlayerRef: errorPlayerRef,
    };

    render(<AudioClipCreator {...propsWithErrorPlayer} />);

    // ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // Act
    // 開始時間の設定ボタン
    const startTimeButton = screen.getAllByText("現在位置を設定")[0];

    // エラーがスローされても処理が継続することを確認
    expect(() => {
      act(() => {
        fireEvent.click(startTimeButton);
      });
    }).not.toThrow();

    // Assert
    // API呼び出しが試みられたことを確認
    expect(errorPlayerRef.current.getCurrentTime).toHaveBeenCalled();
  });

  // 終了時間バリデーションの詳細テスト
  it("フォーム送信時に終了時間が開始時間より前の場合にバリデーションエラーが表示されること", async () => {
    // Arrange
    // createAudioClipは呼び出されないはずだが、念のためモックを設定
    (audioclips.createAudioClip as Mock).mockResolvedValue({
      success: true,
      data: { id: "new-clip-123" },
    });

    render(<AudioClipCreator {...mockProps} />);

    // ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // タイトルだけ入力する（バリデーションを通過させるため）
    const titleInput = screen.getByLabelText(/タイトル/i);
    fireEvent.change(titleInput, { target: { value: "テストクリップ" } });

    // Act
    // 手動でDOMに開始時間と終了時間を設定（終了時間 < 開始時間）
    const startTimeInput = document.getElementById(
      "audio-clip-creator-startTime",
    ) as HTMLInputElement;

    const endTimeInput = document.getElementById(
      "audio-clip-creator-endTime",
    ) as HTMLInputElement;

    // 直接valueを設定し、inputイベントを発火
    if (startTimeInput) {
      // 開始時間を50秒に設定
      startTimeInput.value = "50";
      fireEvent.input(startTimeInput);
    }

    if (endTimeInput) {
      // 終了時間を40秒に設定（エラーになるはず）
      endTimeInput.value = "40";
      fireEvent.input(endTimeInput);
    }

    // フォームを送信
    const submitButton = screen.getByText("クリップを作成");
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Assert
    // バリデーションエラーが表示されることを確認
    await waitFor(() => {
      // alertクラスを使用したエラーメッセージを探す
      const errorMessage = screen.queryByText(
        "終了時間は開始時間より後にしてください",
      );
      expect(errorMessage).toBeInTheDocument();
    });
  });

  // タグ入力のエラー処理のテスト
  it("タグ入力中にエラーが発生しても処理が継続すること", () => {
    // Arrange
    render(<AudioClipCreator {...mockProps} />);

    // ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // タグ入力フィールドを取得
    const tagInput = screen.getByPlaceholderText("タグを入力（Enterで追加）");

    // Act & Assert
    // 極端に長いタグを入力（処理が継続することを確認）
    const veryLongTag = "あ".repeat(1000);

    // エラーが発生しても処理が継続することを確認
    expect(() => {
      fireEvent.change(tagInput, { target: { value: veryLongTag } });
      fireEvent.keyDown(tagInput, { key: "Enter", code: "Enter" });
    }).not.toThrow();
  });

  // フォーム送信前のバリデーション処理テスト
  it("validateBeforeSubmit関数でエラー時にフォーム送信が阻止されること", () => {
    // Arrange
    render(<AudioClipCreator {...mockProps} />);

    // ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // タイトルだけ入力する（必須項目）
    const titleInput = screen.getByLabelText(/タイトル/i);
    fireEvent.change(titleInput, { target: { value: "テストクリップ" } });

    // 開始時間と終了時間を意図的に不正な値に設定
    const startTimeInput = document.getElementById(
      "audio-clip-creator-startTime",
    ) as HTMLInputElement;
    startTimeInput.value = "60";
    fireEvent.input(startTimeInput);

    const endTimeInput = document.getElementById(
      "audio-clip-creator-endTime",
    ) as HTMLInputElement;
    endTimeInput.value = "30"; // 開始時間より前（不正）
    fireEvent.input(endTimeInput);

    // Act
    // フォームを送信
    const submitButton = screen.getByText("クリップを作成");

    // preventDefaultが呼ばれることを確認するためのモック
    const mockSubmitEvent = {
      preventDefault: vi.fn(),
      target: document.getElementById("audio-clip-creator"),
    };

    // フォーム送信をシミュレート
    act(() => {
      const form = submitButton.closest("form");
      if (form) {
        fireEvent.submit(form, mockSubmitEvent);
      } else {
        throw new Error("Form element not found");
      }
    });

    // Assert - エラーメッセージが表示されることを確認
    expect(
      screen.getByText("終了時間は開始時間より後にしてください"),
    ).toBeInTheDocument();
  });

  // 手動での時間入力テスト
  it("手動での時間入力が正しく処理されること", async () => {
    // Arrange
    render(<AudioClipCreator {...mockProps} />);

    // ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // Act
    // 開始時間と終了時間の入力欄を取得
    const startTimeInput = document.getElementById(
      "audio-clip-creator-startTime",
    ) as HTMLInputElement;

    const endTimeInput = document.getElementById(
      "audio-clip-creator-endTime",
    ) as HTMLInputElement;

    // 開始時間を手動で設定（45秒）
    act(() => {
      startTimeInput.value = "45";
      fireEvent.input(startTimeInput);
    });

    // Assert
    // 表示が更新されていることを確認（0:45）
    await waitFor(() => {
      expect(screen.getByText("0:45")).toBeInTheDocument();
    });

    // Act
    // 終了時間を手動で設定（120秒 = 2分）
    act(() => {
      endTimeInput.value = "120";
      fireEvent.input(endTimeInput);
    });

    // Assert
    // 表示が更新されていることを確認（2:00）
    await waitFor(() => {
      expect(screen.getByText("2:00")).toBeInTheDocument();
    });
  });

  // タグのリストスタイル処理のテスト
  it("複数のタグが正しくリスト表示されること", () => {
    // Arrange
    render(<AudioClipCreator {...mockProps} />);

    // ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // タグ入力フィールドを取得
    const tagInput = screen.getByPlaceholderText("タグを入力（Enterで追加）");

    // Act
    // 複数のタグを追加
    const tagList = ["音声", "テスト", "サンプル"];

    for (const tag of tagList) {
      fireEvent.change(tagInput, { target: { value: tag } });
      fireEvent.keyDown(tagInput, { key: "Enter", code: "Enter" });
    }

    // Assert
    // すべてのタグが表示されていることを確認
    for (const tag of tagList) {
      expect(screen.getByText(tag)).toBeInTheDocument();
      // 各タグに削除ボタンが付いていることを確認
      expect(screen.getByLabelText(`${tag}タグを削除`)).toBeInTheDocument();
    }

    // Act
    // タグを1つ削除
    const removeButton = screen.getByLabelText(`${tagList[1]}タグを削除`);
    fireEvent.click(removeButton);

    // Assert
    // 削除したタグは表示されなくなり、他のタグは表示されたままであることを確認
    expect(screen.queryByText(tagList[1])).not.toBeInTheDocument();
    expect(screen.getByText(tagList[0])).toBeInTheDocument();
    expect(screen.getByText(tagList[2])).toBeInTheDocument();
  });

  // 時間入力の境界値テスト
  it("極端な時間値の入力が正しく処理されること", async () => {
    // Arrange
    render(<AudioClipCreator {...mockProps} />);

    // ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // Act
    // 開始時間と終了時間の入力欄を取得
    const startTimeInput = document.getElementById(
      "audio-clip-creator-startTime",
    ) as HTMLInputElement;

    const endTimeInput = document.getElementById(
      "audio-clip-creator-endTime",
    ) as HTMLInputElement;

    // 開始時間に非常に大きな値を設定（3600秒 = 1時間）
    act(() => {
      startTimeInput.value = "3600";
      fireEvent.input(startTimeInput);
    });

    // Assert
    // 1時間の表示が正しくフォーマットされることを確認（60:00）
    await waitFor(() => {
      expect(screen.getByText("60:00")).toBeInTheDocument();
    });

    // Act
    // 終了時間も非常に大きな値を設定（7200秒 = 2時間）
    act(() => {
      endTimeInput.value = "7200";
      fireEvent.input(endTimeInput);
    });

    // Assert
    // 2時間の表示が正しくフォーマットされることを確認（120:00）
    await waitFor(() => {
      expect(screen.getByText("120:00")).toBeInTheDocument();
    });

    // Act
    // 負の値は受け付けられないことをテスト
    act(() => {
      startTimeInput.value = "-10";
      fireEvent.input(startTimeInput);
    });

    // Assert
    // 負の値は0として処理されることを確認
    await waitFor(() => {
      // 開始時間が0になることを確認
      const displayText = screen.getAllByText(/\d+:\d+/)[0].textContent;
      expect(displayText).toBe("0:00");
    });
  });

  // 完全な正常系のフロー
  it("クリエイターコンポーネントが全体的に正しく機能すること", async () => {
    // Arrange
    // 明示的にモックを新規作成し、初期化する
    const mockYoutubeRef = createMockYouTubePlayerRef(30);
    const props = { ...mockProps, youtubePlayerRef: mockYoutubeRef };

    // createAudioClipが成功を返すようにモック
    (audioclips.createAudioClip as Mock).mockResolvedValue({
      success: true,
      data: { id: "complete-flow-clip-123" },
    });

    render(<AudioClipCreator {...props} />);

    // ヘッダーをクリックしてフォームを開く
    fireEvent.click(screen.getByText("音声クリップを作成"));

    // Act
    // 1. タイトルとフレーズを入力
    const titleInput = screen.getByLabelText(/タイトル/i);
    fireEvent.change(titleInput, { target: { value: "完全フローテスト" } });

    const phraseInput = screen.getByLabelText(/フレーズ/i);
    fireEvent.change(phraseInput, {
      target: { value: "これは完全な正常系テストです" },
    });

    // 2. 時間を設定
    // 開始時間と終了時間のボタンをクリック
    const startTimeButton = screen.getAllByText("現在位置を設定")[0];
    const endTimeButton = screen.getAllByText("現在位置を設定")[1];

    act(() => {
      // デフォルトの30秒が返されることを確認
      fireEvent.click(startTimeButton);

      // 終了時間は明示的に45秒に設定
      mockYoutubeRef.current.getCurrentTime = vi.fn().mockReturnValue(45);
      fireEvent.click(endTimeButton);
    });

    // Assert
    // 表示が更新されていることを確認
    expect(screen.getByText("0:30")).toBeInTheDocument();
    expect(screen.getByText("0:45")).toBeInTheDocument();

    // Act
    // 3. プレビューボタンをクリック
    const previewButton = screen.getByText("選択範囲を再生");
    fireEvent.click(previewButton);

    // Assert
    // プレーヤー関数が呼ばれたことを確認
    expect(mockYoutubeRef.current.seekTo).toHaveBeenCalledWith(30, true);
    expect(mockYoutubeRef.current.playVideo).toHaveBeenCalled();

    // Act
    // 4. タグを追加
    const tagInput = screen.getByPlaceholderText("タグを入力（Enterで追加）");
    fireEvent.change(tagInput, { target: { value: "正常系" } });
    fireEvent.keyDown(tagInput, { key: "Enter", code: "Enter" });

    fireEvent.change(tagInput, { target: { value: "テスト" } });
    fireEvent.keyDown(tagInput, { key: "Enter", code: "Enter" });

    // Assert
    // タグが表示されていることを確認
    expect(screen.getByText("正常系")).toBeInTheDocument();
    expect(screen.getByText("テスト")).toBeInTheDocument();

    // Act
    // 5. フォームを送信
    const submitButton = screen.getByText("クリップを作成");
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Assert
    // createAudioClipが正しいパラメータで呼ばれたことを確認
    expect(audioclips.createAudioClip).toHaveBeenCalledWith(
      expect.objectContaining({
        videoId: "test-video-123",
        title: "完全フローテスト",
        phrase: "これは完全な正常系テストです",
        startTime: 30,
        endTime: 45,
        tags: ["正常系", "テスト"],
      }),
    );

    // 成功メッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText("クリップを作成しました")).toBeInTheDocument();
    });

    // onClipCreated コールバックが呼ばれたことを確認
    expect(props.onClipCreated).toHaveBeenCalled();
  });
});
