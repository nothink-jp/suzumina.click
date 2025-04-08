import {
  type RenderOptions,
  fireEvent,
  render as rtlRender,
  screen,
  waitFor,
  // 他に必要な @testing-library/react のユーティリティがあればここに追加
} from "@testing-library/react";
import type { ReactElement } from "react";

// プロバイダーなどのラッパーコンポーネントをここに追加
const Providers = ({ children }: { children: React.ReactNode }) => {
  return children;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => rtlRender(ui, { wrapper: Providers, ...options });

// テストで使用する共通のユーティリティ関数をエクスポート
// 必要なユーティリティを再エクスポート
export { screen, waitFor, fireEvent };
// カスタム render をエクスポート
export { customRender as render };
