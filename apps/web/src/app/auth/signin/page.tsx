import { Suspense } from "react";
import { SignInForm } from "./SignInForm"; // 新しいコンポーネントをインポート

/**
 * サインインページコンポーネント。
 * Discord ログインボタンを表示します。実際のロジックは SignInForm に移譲。
 * @returns サインインページの React 要素。
 */
export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            すずみなふぁみりー
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Discordアカウントでログインしてください
          </p>
        </div>

        <div className="mt-8">
          {/* SignInForm を Suspense でラップ */}
          <Suspense fallback={<LoadingSpinner />}>
            <SignInForm />
          </Suspense>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            ログインには「すずみなふぁみりー」Discordサーバーのメンバーである必要があります
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Suspense フォールバック用のシンプルなローディングスピナー。
 */
function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-3">
      {/* div を自己終了タグに変更 */}
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900" />
    </div>
  );
}
