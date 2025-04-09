import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "認証エラー - すずみなふぁみりー",
  description: "認証プロセス中にエラーが発生しました。",
};

/**
 * 認証エラーページのレイアウトコンポーネント。
 * 子要素をそのままレンダリングします。
 * @param props - レイアウトコンポーネントのプロパティ。
 * @param props.children - レイアウト内にレンダリングされる子要素。
 * @returns 認証エラーページのレイアウト要素。
 */
export default function AuthErrorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // このレイアウトは特別な構造を持たず、子要素を直接返します。
  // これにより、エラーページコンポーネント自体がスタイリング（中央揃えなど）を制御できます。
  return children;
}
