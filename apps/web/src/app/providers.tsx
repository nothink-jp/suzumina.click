"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
// ReactNode は props の型注釈で必要、JSX は戻り値の型注釈で必要
import type React from "react";
import type { JSX } from "react";

/**
 * アプリケーションレベルのプロバイダー（認証など）をまとめるコンポーネント。
 * UI 関連のプロバイダーは layout.tsx で UIProvider を使用して適用されます。
 * @param {object} props - コンポーネントのプロパティ。
 * @param {React.ReactNode} props.children - ラップされる子要素。
 * @param {Session | null} props.session - NextAuth のセッション情報。
 * @returns {JSX.Element} プロバイダーでラップされた子要素。
 */
export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}): JSX.Element {
  // ここでは SessionProvider のみを使用
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
