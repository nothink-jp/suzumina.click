import Link from "next/link";

export default function Header() {
  return (
    <header className="navbar bg-base-100 shadow-sm">
      {" "}
      {/* DaisyUI Navbar */}
      <div className="flex-1">
        <Link href="/" className="btn btn-ghost text-xl">
          涼花みなせ 非公式ファンサイト (仮)
        </Link>
      </div>
      <div className="flex-none">
        <ul className="menu menu-horizontal px-1">
          <li>
            <Link href="/about">About</Link>
          </li>{" "}
          {/* Example link */}
          <li>
            <details>
              <summary>メニュー</summary>
              <ul className="p-2 bg-base-100 rounded-t-none shadow">
                <li>
                  <Link href="/menu1">メニュー1</Link>
                </li>{" "}
                {/* Example link */}
                <li>
                  <Link href="/menu2">メニュー2</Link>
                </li>{" "}
                {/* Example link */}
              </ul>
            </details>
          </li>
        </ul>
      </div>
    </header>
  );
}
