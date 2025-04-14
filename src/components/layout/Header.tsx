import Link from "next/link";
import AuthButton from "@/components/ui/AuthButton"; // AuthButton をインポート

export default function Header() {
  return (
    <header className="navbar bg-base-100 shadow-sm">
      <div className="flex-1">
        <Link href="/" className="btn btn-ghost text-xl">
          涼花みなせ 非公式ファンサイト (仮)
        </Link>
      </div>
      <div className="flex-none gap-2"> {/* gap を追加してボタンとの間隔を調整 */}
        <ul className="menu menu-horizontal px-1">
          <li>
            <Link href="/about">About</Link>
          </li> {/* Example link */}
          <li>
            <details>
              <summary>メニュー</summary>
              <ul className="p-2 bg-base-100 rounded-t-none shadow">
                <li>
                  <Link href="/menu1">メニュー1</Link>
                </li> {/* Example link */}
                <li>
                  <Link href="/menu2">メニュー2</Link>
                </li> {/* Example link */}
              </ul>
            </details>
          </li>
        </ul>
        {/* 認証ボタンを追加 */}
        <AuthButton />
      </div>
    </header>
  );
}
