// Button のインポートを削除
// import { Button } from "@heroui/react";
import Link from "next/link";

interface ErrorActionsProps {
  signInHref?: string;
  homeHref?: string;
}

/**
 * 認証エラーページのアクションボタン（再試行、トップへ戻る）を表示します。
 * 標準の a タグと Tailwind CSS を使用します。
 */
export function ErrorActions({
  signInHref = "/auth/signin",
  homeHref = "/",
}: ErrorActionsProps) {
  return (
    <div className="mt-8 space-y-4">
      {/* Button を Link と a タグに置き換え */}
      <Link
        href={signInHref}
        className="block w-full rounded bg-blue-600 px-4 py-2 text-center font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring active:bg-blue-500"
      >
        ログインを再試行
      </Link>
      {/* variant="bordered" の Button を Link と a タグに置き換え */}
      <Link
        href={homeHref}
        className="block w-full rounded border border-gray-300 bg-white px-4 py-2 text-center font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring active:bg-gray-100"
      >
        トップページへ戻る
      </Link>
    </div>
  );
}
