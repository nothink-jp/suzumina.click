import AuthButton from "@/components/ui/AuthButton";
import HeadlessUiDisclosureExample from "./_components/HeadlessUiDisclosureExample";
import { getCurrentUser } from "./api/auth/getCurrentUser";

/**
 * このページを動的レンダリングするための設定
 * cookiesなどの動的サーバー機能を使用するため必要
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  // サーバーサイドでログイン状態を確認
  const user = await getCurrentUser();
  const isLoggedIn = !!user;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      {/* フォントは layout.tsx の body から継承される想定 */}
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">すずみなくりっく！</h1>
        <p className="text-lg">
          ようこそ！ここは涼花みなせさんの活動を応援する非公式ファンサイトです。
        </p>

        {/* ログイン状態に応じて表示を変更 */}
        {isLoggedIn ? (
          <div className="mt-4 p-4 bg-success/10 rounded-lg">
            <p className="text-success font-bold">ログイン中です</p>
            <p className="text-sm mt-1">
              ユーザー名: {user?.displayName || "ゲスト"}
            </p>
          </div>
        ) : (
          <div className="mt-4 flex justify-center">
            <AuthButton />
          </div>
        )}

        <p className="mt-8">(コンテンツ準備中...)</p>
        {/* DaisyUI ボタンの例 (動作確認用) */}
        <div className="mt-12">
          {/* Biome の lint ルールに従い type="button" を追加 */}
          <button type="button" className="btn btn-primary mr-2">
            Primary Button
          </button>
          <button type="button" className="btn btn-secondary">
            Secondary Button
          </button>
        </div>

        {/* Headless UI サンプルコンポーネントを追加 */}
        <HeadlessUiDisclosureExample />
      </div>
    </main>
  );
}
