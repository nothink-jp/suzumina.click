import Link from "next/link";
import { Suspense } from "react";

interface AuthErrorPageProps {
  searchParams: Promise<{ error?: string }>;
}

function getErrorMessage(error: string | undefined): { title: string; description: string; showRetry: boolean } {
  switch (error) {
    case "Configuration":
      return {
        title: "設定エラー",
        description: "認証設定に問題があります。管理者にお問い合わせください。",
        showRetry: false,
      };
    case "AccessDenied":
      return {
        title: "アクセス拒否",
        description: "このサイトは「すずみなふぁみりー」Discordサーバーのメンバー限定です。先にDiscordサーバーにご参加してからお試しください。",
        showRetry: true,
      };
    case "Verification":
      return {
        title: "認証エラー",
        description: "認証プロセスでエラーが発生しました。時間をおいてから再度お試しください。",
        showRetry: true,
      };
    case "Default":
    default:
      return {
        title: "ログインエラー",
        description: "ログイン中にエラーが発生しました。もう一度お試しください。",
        showRetry: true,
      };
  }
}

async function ErrorContent({ error }: { error?: string }) {
  const errorInfo = getErrorMessage(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg text-center">
        <div>
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {errorInfo.title}
          </h2>
          
          <p className="text-gray-600 mb-6">
            {errorInfo.description}
          </p>
        </div>

        <div className="space-y-4">
          {errorInfo.showRetry && (
            <Link
              href="/auth/signin"
              className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              再度ログインを試す
            </Link>
          )}
          
          <Link
            href="/"
            className="w-full inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            ホームに戻る
          </Link>
        </div>

        {error === "AccessDenied" && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm font-medium mb-2">
              すずみなふぁみりーDiscordサーバーについて
            </p>
            <p className="text-blue-700 text-sm">
              涼花みなせさんのファンコミュニティサーバーです。
              参加方法については、涼花みなせさんの配信やSNSでご確認ください。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams;
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <ErrorContent error={params.error} />
    </Suspense>
  );
}