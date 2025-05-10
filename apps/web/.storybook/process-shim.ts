/**
 * Node.jsのprocessオブジェクトをモック化するシム
 * Storybookでのエラー「Cannot read properties of undefined (reading 'isTTY')」を解消します
 */

// グローバルな型定義を追加
declare global {
  interface Window {
    process: {
      env: Record<string, string>;
      browser: boolean;
      stdout: {
        isTTY: boolean;
      };
      stderr: {
        isTTY: boolean;
      };
      version: string;
      versions: {
        node: string;
      };
      type?: string;
      [key: string]: unknown;
    };
  }
}

// モックprocessオブジェクトをwindowにアタッチ
if (typeof window !== "undefined") {
  window.process = window.process || {
    env: {},
    browser: true,
    stdout: {
      isTTY: true, // isTTYプロパティを追加
    },
    stderr: {
      isTTY: true, // stderrのisTTYも追加
    },
    version: "22.15.0",
    versions: {
      node: "22.15.0",
    },
  };
}

export {};
