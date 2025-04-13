import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer footer-center p-4 bg-base-300 text-base-content"> {/* DaisyUI Footer */}
      <aside>
        <p>
          Copyright © {currentYear} - All right reserved by [運営者名/サイト名]
          <br />
          このサイトは涼花みなせさんの非公式ファンサイトであり、ご本人様及び所属企業様とは一切関係ありません。
        </p>
        {/* 必要に応じて他のリンクや情報を追加 */}
        {/* 例: <Link href="/privacy-policy" className="link link-hover">プライバシーポリシー</Link> */}
      </aside>
    </footer>
  );
}