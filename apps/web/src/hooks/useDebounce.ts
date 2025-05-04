import { useEffect, useState } from "react";

/**
 * デバウンス処理を行うカスタムフック
 *
 * 指定された遅延時間後に値を返します。
 * 連続した入力などを最適化するのに役立ちます。
 *
 * @param value デバウンスする値
 * @param delay 遅延時間（ミリ秒）
 * @returns デバウンスされた値
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 遅延後に値を設定するタイマー
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // クリーンアップ関数でタイマーをクリア
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
