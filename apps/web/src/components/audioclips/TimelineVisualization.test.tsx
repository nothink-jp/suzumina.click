import * as validation from "@/lib/audioclips/validation";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TimelineVisualization from "./TimelineVisualization";

// 必要な関数をモック化
vi.mock("@/lib/audioclips/validation", () => ({
  formatTime: vi.fn((time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }),
  getVideoTimeRanges: vi.fn(),
}));

describe("TimelineVisualizationコンポーネント", () => {
  // テスト用の一般的なプロップス
  const defaultProps = {
    videoId: "test-video-id",
    videoDuration: 300, // 5分の動画
    onRangeSelect: vi.fn(),
    onClipClick: vi.fn(),
  };

  // テスト用のクリップデータ
  const mockTimeRanges = [
    {
      clipId: "clip-1",
      title: "テストクリップ1",
      start: 60, // 1:00
      end: 90, // 1:30
      color: "rgba(59, 130, 246, 0.5)", // 青
    },
    {
      clipId: "clip-2",
      title: "テストクリップ2",
      start: 150, // 2:30
      end: 210, // 3:30
      color: "rgba(16, 185, 129, 0.5)", // 緑
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトでモックの戻り値を設定
    vi.mocked(validation.getVideoTimeRanges).mockResolvedValue(mockTimeRanges);

    // ElementのgetBoundingClientRectをモック
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 1000,
      height: 50,
      top: 0,
      left: 0,
      bottom: 50,
      right: 1000,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));
  });

  it("基本レンダリング: タイムラインが正しく表示されること", async () => {
    render(<TimelineVisualization {...defaultProps} />);

    // タイトルが表示されていることを確認
    expect(screen.getByText("タイムライン")).toBeInTheDocument();

    // 時間表示が正しくあることを確認
    expect(screen.getByText("0:00")).toBeInTheDocument();
    expect(screen.getByText("2:30")).toBeInTheDocument(); // 半分の時間
    expect(screen.getByText("5:00")).toBeInTheDocument(); // 動画の長さ

    // データ取得のAPIが呼ばれていることを確認
    expect(validation.getVideoTimeRanges).toHaveBeenCalledWith("test-video-id");
  });

  it("クリップが読み込まれると正しく表示されること", async () => {
    render(<TimelineVisualization {...defaultProps} />);

    // クリップが非同期で読み込まれるため、Promiseが解決されるのを待つ
    await act(async () => {
      // モックの解決を待つ
      await Promise.resolve();
    });

    // クリップコンテナが表示されていることを確認
    const clipElements = screen.getAllByRole("button");
    expect(clipElements).toHaveLength(mockTimeRanges.length);

    // クリップの情報が正しいことを確認
    expect(clipElements[0]).toHaveAttribute(
      "aria-label",
      "テストクリップ1 (1:00 - 1:30)",
    );
    expect(clipElements[1]).toHaveAttribute(
      "aria-label",
      "テストクリップ2 (2:30 - 3:30)",
    );
  });

  it("クリップをクリックすると、onClipClick関数が呼び出されること", async () => {
    render(<TimelineVisualization {...defaultProps} />);

    // クリップの読み込みを待つ
    await act(async () => {
      await Promise.resolve();
    });

    // クリップをクリック
    const clipElements = screen.getAllByRole("button");
    fireEvent.click(clipElements[0]);

    // onClipClickが正しいパラメータで呼ばれたことを確認
    expect(defaultProps.onClipClick).toHaveBeenCalledWith("clip-1");
  });

  it("キーボードでクリップが操作できること", async () => {
    render(<TimelineVisualization {...defaultProps} />);

    // クリップの読み込みを待つ
    await act(async () => {
      await Promise.resolve();
    });

    // Enterキーでクリップを操作
    const clipElements = screen.getAllByRole("button");
    fireEvent.keyDown(clipElements[1], { key: "Enter" });

    // onClipClickが正しいパラメータで呼ばれたことを確認
    expect(defaultProps.onClipClick).toHaveBeenCalledWith("clip-2");

    // Spaceキーでも操作可能
    fireEvent.keyDown(clipElements[0], { key: " " });
    expect(defaultProps.onClipClick).toHaveBeenCalledWith("clip-1");
  });

  it("現在の再生位置マーカーが表示されること", () => {
    const currentTime = 150; // 2:30
    render(
      <TimelineVisualization {...defaultProps} currentTime={currentTime} />,
    );

    // 現在の再生位置を示す要素が存在することを確認
    const positionMarker = document.querySelector(".bg-red-500");
    expect(positionMarker).not.toBeNull();

    // 位置が正しく計算されていることを確認（スタイル属性）
    expect(positionMarker).toHaveStyle(
      `left: ${(currentTime / defaultProps.videoDuration) * 100}%`,
    );
  });

  it("マウス操作で時間範囲を選択できること", async () => {
    render(<TimelineVisualization {...defaultProps} />);

    // クリップの読み込みを待つ
    await act(async () => {
      await Promise.resolve();
    });

    // タイムライン要素を取得
    const timeline = screen.getByRole("region", { name: "タイムライン" });
    expect(timeline).toBeInTheDocument();

    // マウスダウンで選択開始
    fireEvent.mouseDown(timeline, { clientX: 200 }); // 20%位置 → 60秒

    // マウス移動で選択範囲を拡大
    fireEvent.mouseMove(timeline, { clientX: 400 }); // 40%位置 → 120秒

    // マウスアップで選択確定
    fireEvent.mouseUp(timeline);

    // onRangeSelectが正しいパラメータで呼ばれたことを確認
    expect(defaultProps.onRangeSelect).toHaveBeenCalledWith(60, 120);
  });

  it("ロード中の表示がされること", () => {
    // APIがPromiseを解決しないようにする
    vi.mocked(validation.getVideoTimeRanges).mockImplementation(
      () => new Promise(() => {}),
    );

    render(<TimelineVisualization {...defaultProps} />);

    // ローディングメッセージが表示されていることを確認
    expect(
      screen.getByText("タイムラインデータを読み込み中..."),
    ).toBeInTheDocument();
  });

  it("APIエラーが適切に処理されること", async () => {
    // コンソールエラーを監視
    const originalConsoleError = console.error;
    const mockConsoleError = vi.fn();
    console.error = mockConsoleError;

    try {
      // APIがエラーを投げるようにする
      vi.mocked(validation.getVideoTimeRanges).mockRejectedValueOnce(
        new Error("テストエラー"),
      );

      render(<TimelineVisualization {...defaultProps} />);

      // エラー処理を待つため、コンソールエラーが呼び出されるまで待機
      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalled();
      });

      // エラーメッセージに適切な内容が含まれていることを確認
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("時間範囲の取得に失敗しました"),
        expect.any(Error),
      );
    } finally {
      // クリーンアップ
      console.error = originalConsoleError;
    }
  });
});
