import { useCallback } from "react";

// Next.jsのnavigation関連のモック
export function useRouter() {
  return {
    push: useCallback((_url: string) => {
      // モック実装：遷移をシミュレート
      console.log(`[モックルーター] ナビゲーション: ${_url}`);
    }, []),
    replace: useCallback((_url: string) => {
      console.log(`[モックルーター] ページ置き換え: ${_url}`);
    }, []),
    back: useCallback(() => {
      console.log("[モックルーター] 戻る");
    }, []),
    forward: useCallback(() => {
      console.log("[モックルーター] 進む");
    }, []),
    prefetch: useCallback((_url: string) => {
      console.log(`[モックルーター] プリフェッチ: ${_url}`);
    }, []),
    refresh: useCallback(() => {
      console.log("[モックルーター] 更新");
    }, []),
  };
}

// パス名を取得するカスタムフック
export function usePathname() {
  return "/mock-path";
}

// 検索パラメータを取得するカスタムフック
export function useSearchParams() {
  return new URLSearchParams();
}
