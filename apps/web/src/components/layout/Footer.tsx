import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer footer-center p-4 bg-base-300 text-base-content">
      {" "}
      {/* DaisyUI Footer */}
      <aside>
        <p>
          Copyright © {currentYear} - All right reserved by nothink.jp
          <br />
          このサイトは涼花みなせ様の非公式ファンサイトであり、ご本人様及び関係者様とは一切関係ありません。
        </p>
        {/* 必要に応じて他のリンクや情報を追加 */}
        {/* 例: <Link href="/privacy-policy" className="link link-hover">プライバシーポリシー</Link> */}
      </aside>
    </footer>
  );
}
