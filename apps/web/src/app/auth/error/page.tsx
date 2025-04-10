import { Suspense } from "react";
import { AuthErrorContent } from "./AuthErrorContent"; // 新しいコンポーネントをインポート

/**
 * NextAuth 認証エラーページコンポーネント。
 * 実際のコンテンツ表示は AuthErrorContent に移譲し、Suspense でラップします。
 * @returns 認証エラーページの React 要素。
 */
export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      {/* AuthErrorContent を Suspense でラップ */}
      <Suspense fallback={<LoadingCard />}>
        <AuthErrorContent />
      </Suspense>
    </div>
  );
}

/**
 * Suspense フォールバック用のシンプルなローディングカード。
 */
function LoadingCard() {
  return (
    <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6 space-y-6 animate-pulse">
      {/* div を自己終了タグに変更 */}
      <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto" />
      <div className="space-y-3">
        {/* div を自己終了タグに変更 */}
        <div className="h-4 bg-gray-200 rounded" />
        {/* div を自己終了タグに変更 */}
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>
      {/* div を自己終了タグに変更 */}
      <div className="h-10 bg-gray-200 rounded" />
      {/* div を自己終了タグに変更 */}
      <div className="h-10 bg-gray-200 rounded" />
    </div>
  );
}
