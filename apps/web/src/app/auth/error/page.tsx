"use client";

import { ErrorActions } from "@/components/ErrorActions";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { ErrorTrackingInfo } from "@/components/ErrorTrackingInfo";
import { Card, CardHeader } from "@suzumina.click/ui";
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

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const errorType = searchParams.get("error") || "default";
  // Ensure correct destructuring with fallback
  const { title, description, details } =
    errorMessages[errorType] ?? errorMessages.default;

  const [trackingId, setTrackingId] = useState<string | null>(null);

  useEffect(() => {
    setTrackingId(crypto.randomUUID());
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-md p-6 space-y-6">
        <CardHeader className="text-center p-0 mb-0">
          <h2 className="text-2xl font-bold text-red-600">{title}</h2>
        </CardHeader>
        {/* Removed title prop from ErrorDisplay */}
        <ErrorDisplay description={description} details={details} />
        <ErrorTrackingInfo errorType={errorType} trackingId={trackingId} />
        <ErrorActions />
      </Card>
    </div>
  );
}
