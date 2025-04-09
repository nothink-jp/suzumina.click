import "@/../tests/setup"; // ルートからの実行を考慮したパスに変更
import { describe, expect, it } from "bun:test";
import { GET, POST, auth, signIn, signOut } from "./auth";

describe("NextAuth 設定", () => {
  it("必要な関数とオブジェクトがエクスポートされている", () => {
    expect(auth).toBeDefined();
    expect(GET).toBeInstanceOf(Function);
    expect(POST).toBeInstanceOf(Function);
    expect(signIn).toBeInstanceOf(Function);
    expect(signOut).toBeInstanceOf(Function);
  });

  // authConfigをエクスポートして詳細なテストを追加する必要があるかもしれません
});
