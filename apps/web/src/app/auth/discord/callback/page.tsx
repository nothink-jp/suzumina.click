import { Suspense } from "react";
import CallbackClient from "./CallbackClient"; // 作成したクライアントコンポーネントをインポート

// Suspense フォールバック用のシンプルなローディングコンポーネント
function LoadingFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-2xl font-bold mb-4">Discord 認証</h1>
      <p>認証情報を処理しています...</p>
      <span className="loading loading-dots loading-lg mt-4" />{" "}
      {/* 自己終了タグ */}
    </div>
  );
}

// page.tsx はサーバーコンポーネントのまま
export default function DiscordCallbackPage() {
  return (
    // Suspense でクライアントコンポーネントをラップ
    <Suspense fallback={<LoadingFallback />}>
      {/* CallbackClient が useSearchParams を使う */}
      <CallbackClient />
    </Suspense>
  );
}
