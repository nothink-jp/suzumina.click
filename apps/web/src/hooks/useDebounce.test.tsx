/**
 * useDebounceカスタムフックのテスト
 *
 * デバウンス処理の動作確認およびタイマー管理のテスト
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDebounce } from "./useDebounce";

describe("useDebounceフック", () => {
  // テスト後にTimerのモックをクリア
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // タイマー関連のモックを準備
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("初期値がすぐに返されることを確認", () => {
    // フックをレンダリング
    const { result } = renderHook(() => useDebounce("初期値", 500));

    // 初期値が即座に返されることを検証
    expect(result.current).toBe("初期値");
  });

  it("遅延後に新しい値が返されることを確認", async () => {
    // フックをレンダリング
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "初期値", delay: 500 } },
    );

    // 初期値の検証
    expect(result.current).toBe("初期値");

    // 値を更新
    rerender({ value: "更新値", delay: 500 });

    // 遅延時間経過前は元の値のままであることを確認
    expect(result.current).toBe("初期値");

    // 時間を進める
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // 遅延後に値が更新されることを確認
    expect(result.current).toBe("更新値");
  });

  it("新しい値に更新される前にクリーンアップされる場合", () => {
    // フックをレンダリング
    const { result, rerender, unmount } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "初期値", delay: 500 } },
    );

    // 初期値の検証
    expect(result.current).toBe("初期値");

    // 値を更新
    rerender({ value: "更新値", delay: 500 });

    // アンマウントしてクリーンアップを実行
    unmount();

    // 時間を進めても値は更新されないこと
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // クリーンアップされているため、初期値のまま
    expect(result.current).toBe("初期値");
  });

  it("連続的な値の更新に対して、最後の値だけが反映される", () => {
    // フックをレンダリング
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "初期値", delay: 500 } },
    );

    // 連続的に値を更新
    rerender({ value: "更新値1", delay: 500 });

    // 少し時間を進める（更新されない）
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // さらに値を更新
    rerender({ value: "更新値2", delay: 500 });

    // さらに時間を進める（まだ更新値1のタイマーは終わっていない）
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // 更新値1のタイマーが終了しているが、リレンダリングによりそのタイマーはクリアされているため値は更新されない
    expect(result.current).toBe("初期値");

    // 十分な時間を進めて、更新値2のタイマーを完了させる
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // 最後の更新である「更新値2」が反映される
    expect(result.current).toBe("更新値2");
  });

  it("遅延時間が変更された場合のテスト", () => {
    // フックをレンダリング
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "初期値", delay: 500 } },
    );

    // 遅延時間を変更して再レンダリング
    rerender({ value: "初期値", delay: 1000 });

    // 値を更新
    rerender({ value: "更新値", delay: 1000 });

    // 元の遅延時間では更新されない
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe("初期値");

    // 新しい遅延時間を経過すると更新される
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe("更新値");
  });
});
