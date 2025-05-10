import React from "react";
import type { ReactElement } from "react";

/**
 * AuthButtonのモック実装
 * Storybook用にシンプルな実装を提供します
 */
export default function AuthButton(): ReactElement {
  return (
    <div className="dropdown dropdown-end">
      <button type="button" className="btn btn-primary">
        ログイン
      </button>
    </div>
  );
}
