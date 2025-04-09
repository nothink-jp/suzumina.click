"use client";

// Button のインポートを削除
// import { Button } from "@heroui/react";
import Link from "next/link";

/**
 * Discord サーバーメンバーでないユーザー向けの案内ページ。
 * Card コンポーネントを使用せずに div と Tailwind でレイアウト。
 * Button も標準の a タグと Tailwind CSS に置き換え。
 */
export default function NotMemberPage() {
  const discordInviteLink = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || "#";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6 space-y-6 text-center">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-yellow-600">
            サーバーへの参加が必要です
          </h2>
        </div>
        <div className="space-y-4">
          <p className="text-gray-700">
            このアプリケーションを利用するには、「すずみなふぁみりー」Discord
            サーバーのメンバーである必要があります。
          </p>
          <p className="text-gray-700">
            サーバーに参加してから、再度ログインをお試しください。
          </p>
          {discordInviteLink !== "#" && (
            // Button を Link と a タグに置き換え (primary スタイル)
            <Link
              href={discordInviteLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded bg-blue-600 px-4 py-2 text-center font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring active:bg-blue-500" // Primary button style
            >
              Discordサーバーに参加する
            </Link>
          )}
          {/* Button を Link と a タグに置き換え (light スタイル) */}
          <Link
            href="/"
            className="block w-full rounded px-4 py-2 text-center font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring active:bg-gray-200 mt-2" // Light button style
          >
            トップページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
