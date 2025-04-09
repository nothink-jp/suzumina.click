import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ログイン - すずみなふぁみりー",
  description:
    "Discordアカウントでログインしてすずみなふぁみりーに参加しましょう",
};

/**
 * サインインページのレイアウトコンポーネント。
 * 現在は子要素をそのままレンダリングします。
 * @param props - レイアウトコンポーネントのプロパティ。
 * @param props.children - レイアウト内にレンダリングされる子要素。
 * @returns サインインページのレイアウト要素。
 */
export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // このレイアウトは現在、特別な構造を持たず、子要素を直接返します。
  // 必要に応じて、ヘッダーやフッターなどの共通要素をここに追加できます。
  return children;
}
