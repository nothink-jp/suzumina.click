import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ログイン - すずみなふぁみりー",
  description:
    "Discordアカウントでログインしてすずみなふぁみりーに参加しましょう",
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}