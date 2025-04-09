import { GlobalLayout } from "@/components/GlobalLayout";

/**
 * アプリケーションのホームページコンポーネント。
 * ウェルカムメッセージを表示します。
 * @returns ホームページの React 要素。
 */
export default function HomePage() {
  return (
    <GlobalLayout>
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">すずみなふぁみりー</h1>
        <p className="mt-4 text-lg text-gray-600">
          コミュニティサイトへようこそ
        </p>
      </div>
    </GlobalLayout>
  );
}
