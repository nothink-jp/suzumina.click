"use client";

// Session 型のインポートは不要になる
// import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
// ReactNode は props の型注釈で必要、JSX は戻り値の型注釈で必要
import type { JSX, ReactNode } from "react";

/**
 * アプリケーションレベルのプロバイダー（認証など）をまとめるコンポーネント。
 * SessionProvider を使用して認証状態を管理します。
 * @param {object} props - コンポーネントのプロパティ。
 * @param {ReactNode} props.children - ラップされる子要素。
 * @returns {JSX.Element} プロバイダーでラップされた子要素。
 */
export function Providers({
  children,
}: // session プロパティの受け取りを削除
{
  children: ReactNode;
  // session: Session | null; // 削除
}): JSX.Element {
  // SessionProvider を session プロパティなしで呼び出す
  return <SessionProvider>{children}</SessionProvider>;
}
