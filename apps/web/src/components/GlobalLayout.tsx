"use client";

import { Navigation } from "@/components/Navigation";
import { useSession } from "next-auth/react";

/**
 * アプリケーションの主要なページで使用されるグローバルレイアウトコンポーネント。
 * ナビゲーションバー（認証状態がロード中の場合は除く）とメインコンテンツ領域を提供します。
 * @param props - レイアウトコンポーネントのプロパティ。
 * @param props.children - レイアウト内にレンダリングされるメインコンテンツ。
 * @returns グローバルレイアウトの React 要素。
 */
export function GlobalLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession(); // クライアントサイドでセッション状態を取得

  return (
    <div className="min-h-screen bg-gray-50">
      {/* セッション状態がロード中の場合はナビゲーションを表示しない */}
      {status === "loading" ? null : <Navigation />}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
