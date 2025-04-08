"use client";

// 現在使用している UI ライブラリのプロバイダーをインポート
import { HeroUIProvider } from "@heroui/react";
// 必要な型 (ReactNode, JSX) のみをインポート
import type { ReactNode, JSX } from "react";

// 将来的に UI ライブラリを切り替える場合は、
// このファイル内のインポートと以下の ProviderComponent を変更する
const ProviderComponent = HeroUIProvider;

/**
 * アプリケーション全体で使用する UI ライブラリのプロバイダーをラップする汎用コンポーネント。
 * UI ライブラリの具体的な実装を隠蔽し、切り替えを容易にします。
 * @param {object} props - コンポーネントのプロパティ。
 * @param {ReactNode} props.children - ラップされる子要素。
 * @returns {JSX.Element} UI プロバイダーでラップされた子要素。
 */
export function UIProvider({ children }: { children: ReactNode }): JSX.Element {
  // 必要に応じて ProviderComponent に props を渡す
  return <ProviderComponent>{children}</ProviderComponent>;
}
