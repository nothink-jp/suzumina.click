import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer footer-center p-4 bg-base-300 text-base-content">
      {" "}
      {/* DaisyUI Footer */}
      <aside>
        <p>
          Copyright © {currentYear} - Some right reserved by{" "}
          <Link href="https://www.nothink.jp">nothink.jp</Link>
          <br />
          このサイトは非公式な情報サイトであり、涼花みなせ様ご本人様及び関係者様とは一切関係ありません。
        </p>
        {/* 必要に応じて他のリンクや情報を追加 */}
        {/* 例: <Link href="/privacy-policy" className="link link-hover">プライバシーポリシー</Link> */}
      </aside>
    </footer>
  );
}
