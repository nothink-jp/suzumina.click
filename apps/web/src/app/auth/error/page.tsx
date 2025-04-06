"use client"; // useSearchParams を使うためクライアントコンポーネントにする

import Link from "next/link";
import { useSearchParams } from "next/navigation"; // useSearchParams をインポート
import { useEffect, useState } from "react"; // useState, useEffect をインポート

// メタデータは静的なのでそのまま残す (ただし、動的にしたい場合は別途対応が必要)
// export const metadata: Metadata = {
//   title: "認証エラー - すずみなふぁみりー",
//   description: "ログインに失敗しました",
// };

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
  // 他の一般的なエラータイプも必要に応じて追加
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const errorType = searchParams.get("error") || "default";
  const { title, description, details } =
    errorMessages[errorType] ?? errorMessages.default; // 未知のエラータイプはdefaultを使用

  const [trackingId, setTrackingId] = useState<string | null>(null);

  useEffect(() => {
    // コンポーネントマウント時に一意のIDを生成
    setTrackingId(crypto.randomUUID());
  }, []); // 空の依存配列で初回マウント時のみ実行

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600">{title}</h1>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-600">{description}</p>
            {details && (
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-2 text-left">
                {details.map((detail, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: Static list, index is acceptable here
                  <li key={`${detail}-${index}`}>{detail}</li>
                ))}
              </ul>
            )}
          </div>

          {/* エラーコードとトラッキングID表示セクション */}
          <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1">
            <p>
              エラーコード:{" "}
              <code className="font-mono bg-gray-100 p-1 rounded">
                {errorType}
              </code>
            </p>
            {trackingId && ( // trackingIdが生成されてから表示
              <p>
                トラッキングID:{" "}
                <code className="font-mono bg-gray-100 p-1 rounded">
                  {trackingId}
                </code>
              </p>
            )}
            {/* サポート連絡方法の追加 */}
            <p className="pt-2">
              問題が解決しない場合は、Discordサーバーのサポートチャンネルにて、上記のエラーコードとトラッキングIDを添えてお問い合わせください。
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <Link
              href="/auth/signin"
              className="inline-block w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              ログインを再試行
            </Link>

            <Link
              href="/"
              className="inline-block w-full py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              トップページへ戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
