import { type RenderOptions, render } from "@testing-library/react";
import type { ReactElement } from "react";

// プロバイダーなどのラッパーコンポーネントをここに追加
const Providers = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: Providers, ...options });

// テストで使用する共通のユーティリティ関数をエクスポート
export * from "@testing-library/react";
export { customRender as render };
