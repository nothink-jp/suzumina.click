"use client";

import { ErrorActions } from "@/components/ErrorActions";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { ErrorTrackingInfo } from "@/components/ErrorTrackingInfo";
// Card, CardHeader のインポートを削除
// import { Card, CardHeader } from "@heroui/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// エラーメッセージを定義するオブジェクト
const errorMessages: {
  [key: string]: { title: string; description: string; details?: string[] };
} = {
  default: {
    title: "認証エラー",
    description:
      "ログインに失敗しました。しばらくしてからもう一度お試しください。",
  },
  Configuration: {
    title: "設定エラー",
    description: "サーバーの設定に問題があるため、ログインできませんでした。",
  },
  AccessDenied: {
    title: "アクセスが拒否されました",
    description:
      "ログインに必要な権限がないか、アクセスが許可されませんでした。",
    details: [
      "「すずみなふぁみりー」Discordサーバーのメンバーですか？",
      "Discordでの認証を正しく許可しましたか？",
      "必要な権限を付与しましたか？",
    ],
  },
  OAuthAccountNotLinked: {
    title: "アカウント連携エラー",
    description:
      "このDiscordアカウントは、既に使用中の別のアカウントと連携されている可能性があります。",
  },
  Callback: {
    title: "認証コールバックエラー",
    description: "認証情報の処理中にエラーが発生しました。",
  },
};

/**
 * NextAuth 認証エラーページコンポーネント。
 * URL のクエリパラメータからエラータイプを読み取り、対応するエラーメッセージ、
 * トラッキング情報、およびアクションボタンを表示します。
 * Card コンポーネントを使用せずに div と Tailwind でレイアウト。
 * @returns 認証エラーページの React 要素。
 */
export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const errorType = searchParams.get("error") || "default";
  const { title, description, details } =
    errorMessages[errorType] ?? errorMessages.default;

  const [trackingId, setTrackingId] = useState<string | null>(null);

  useEffect(() => {
    setTrackingId(crypto.randomUUID());
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      {/* Card の代わりに div を使用 */}
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6 space-y-6">
        {/* CardHeader の代わりに div を使用 */}
        <div className="text-center mb-0">
          {" "}
          {/* p-0 は不要かもしれない */}
          <h2 className="text-2xl font-bold text-red-600">{title}</h2>
        </div>
        <ErrorDisplay description={description} details={details} />
        <ErrorTrackingInfo errorType={errorType} trackingId={trackingId} />
        <ErrorActions />
      </div>
    </div>
  );
}
