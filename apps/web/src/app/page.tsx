import { GlobalLayout } from "@/components/GlobalLayout";
import { UserInfoDisplay } from "@/components/UserInfoDisplay"; // UserInfoDisplay をインポート

/**
 * アプリケーションのホームページコンポーネント。
 * ウェルカムメッセージを表示し、UserInfoDisplay コンポーネントをレンダリングします。
 * @returns ホームページの React 要素。
 */
export default function HomePage() {
  // サーバーサイドでの auth() 呼び出しを削除
  // const session = await auth();

  return (
    <GlobalLayout>
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">すずみなふぁみりー</h1>
        <p className="mt-4 text-lg text-gray-600">
          コミュニティサイトへようこそ
        </p>

        {/* サーバーサイドの条件付きレンダリングを削除 */}
        {/* {session?.user && ( ... )} */}

        {/* UserInfoDisplay クライアントコンポーネントをレンダリング */}
        <UserInfoDisplay />
      </div>
    </GlobalLayout>
  );
}
